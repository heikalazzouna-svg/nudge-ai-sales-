from datetime import datetime
from typing import Optional, Dict, Any, List

from pydantic import BaseModel, EmailStr, Field, field_validator


class LeadBase(BaseModel):
    """Base lead schema with common fields."""
    email: EmailStr
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    full_name: Optional[str] = Field(None, max_length=200)
    company: Optional[str] = Field(None, max_length=200)
    job_title: Optional[str] = Field(None, max_length=200)
    linkedin_url: Optional[str] = None
    website: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional custom data")


class LeadCreate(LeadBase):
    """Schema for creating a new lead."""
    user_id: Optional[str] = None  # Optional, will use default if not provided


class LeadUpdate(BaseModel):
    """Schema for updating lead information."""
    email: Optional[EmailStr] = None
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    full_name: Optional[str] = Field(None, max_length=200)
    company: Optional[str] = Field(None, max_length=200)
    job_title: Optional[str] = Field(None, max_length=200)
    linkedin_url: Optional[str] = None
    website: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None
    has_replied: Optional[bool] = None
    replied_at: Optional[datetime] = None


class LeadRead(LeadBase):
    """Schema for reading lead data."""
    id: str
    user_id: str
    has_replied: bool
    replied_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Bulk Operations

class BulkLeadCreate(BaseModel):
    """Schema for bulk lead creation."""
    leads: List[LeadCreate] = Field(..., min_length=1, max_length=1000, description="List of leads to create (max 1000)")
    skip_duplicates: bool = Field(default=True, description="Skip duplicate emails instead of failing")


class BulkLeadCreateResponse(BaseModel):
    """Schema for bulk creation response."""
    total: int = Field(..., description="Total leads processed")
    created: int = Field(..., description="Successfully created leads")
    skipped: int = Field(..., description="Skipped leads")
    errors: List[Dict[str, Any]] = Field(default_factory=list, description="Error details")


class BulkLeadDelete(BaseModel):
    """Schema for bulk lead deletion."""
    lead_ids: List[str] = Field(..., min_length=1, max_length=1000, description="List of lead IDs to delete (max 1000)")


class BulkLeadDeleteResponse(BaseModel):
    """Schema for bulk deletion response."""
    total: int = Field(..., description="Total leads processed")
    deleted: int = Field(..., description="Successfully deleted leads")
    skipped: int = Field(..., description="Skipped leads")
    errors: List[Dict[str, Any]] = Field(default_factory=list, description="Error details")


# CSV Import/Export

class LeadImportResponse(BaseModel):
    """Schema for CSV import response."""
    total_rows: int = Field(..., description="Total rows in CSV")
    imported: int = Field(..., description="Successfully imported leads")
    skipped: int = Field(..., description="Skipped leads")
    errors: List[Dict[str, Any]] = Field(default_factory=list, description="Error details")


# Pagination

class LeadListResponse(BaseModel):
    """Schema for paginated lead list."""
    leads: List[LeadRead] = Field(..., description="List of leads")
    total: int = Field(..., description="Total number of leads matching filters")
    skip: int = Field(..., description="Number of skipped records")
    limit: int = Field(..., description="Maximum records returned")


# Legacy schema for compatibility
class LeadBulkCreate(BaseModel):
    """Schema for bulk lead creation (legacy)."""
    leads: list[LeadCreate] = Field(..., min_items=1, max_items=1000, description="List of leads to create")
