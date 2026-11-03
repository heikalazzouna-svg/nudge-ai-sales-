from datetime import datetime
from typing import Optional, List, Dict, Any

from pydantic import BaseModel, Field

from app.models.enums import CampaignStatus, CampaignLeadStatus


class CampaignBase(BaseModel):
    """Base campaign schema with common fields."""
    name: str = Field(..., min_length=1, max_length=200, description="Campaign name")
    description: Optional[str] = Field(None, max_length=1000, description="Campaign description")
    target_audience: Optional[str] = Field(None, max_length=500, description="Target audience description")
    value_proposition: Optional[str] = Field(None, max_length=500, description="Value proposition")
    tone: str = Field(default="professional", max_length=50, description="Email tone (e.g., professional, casual, friendly)")
    from_email: Optional[str] = Field(None, max_length=255, description="Custom sender email (e.g., name@yourdomain.com)")
    max_follow_ups: int = Field(default=1, description="Maximum number of follow-up emails")
    follow_up_delay_days: int = Field(default=2, description="Days to wait between follow-ups")


class CampaignCreate(CampaignBase):
    """Schema for creating a new campaign."""
    pass


class CampaignUpdate(BaseModel):
    """Schema for updating campaign information."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    status: Optional[CampaignStatus] = None
    target_audience: Optional[str] = Field(None, max_length=500)
    value_proposition: Optional[str] = Field(None, max_length=500)
    tone: Optional[str] = Field(None, max_length=50)
    from_email: Optional[str] = Field(None, max_length=255)
    max_follow_ups: Optional[int] = Field(None)
    follow_up_delay_days: Optional[int] = Field(None)


class CampaignRead(CampaignBase):
    """Schema for reading campaign data."""
    id: str
    user_id: str
    status: CampaignStatus
    paused_at: Optional[datetime] = None
    paused_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CampaignStats(BaseModel):
    """Schema for campaign statistics."""
    total_leads: int = Field(..., description="Total leads in campaign")
    pending: int = Field(..., description="Leads pending")
    active: int = Field(..., description="Leads active")
    completed: int = Field(..., description="Leads completed")
    replied: int = Field(..., description="Leads that replied")
    bounced: int = Field(..., description="Leads that bounced")
    unsubscribed: int = Field(..., description="Leads that unsubscribed")
    
    # Email stats
    emails_sent: int = Field(default=0, description="Total emails sent")
    emails_opened: int = Field(default=0, description="Total emails opened")
    emails_clicked: int = Field(default=0, description="Total emails clicked")
    emails_bounced: int = Field(default=0, description="Total emails bounced")


class CampaignWithStats(CampaignRead):
    """Schema for campaign with statistics."""
    stats: CampaignStats


# Campaign Lead Schemas

class CampaignLeadCreate(BaseModel):
    """Schema for adding a lead to a campaign."""
    lead_id: str = Field(..., description="Lead ID to add to campaign")


class CampaignLeadRead(BaseModel):
    """Schema for reading campaign lead data."""
    id: str
    campaign_id: str
    lead_id: str
    status: CampaignLeadStatus
    current_step: int
    inngest_run_id: Optional[str] = None
    next_step_at: Optional[datetime] = None
    replied_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    last_error: Optional[str] = None
    error_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CampaignLeadUpdate(BaseModel):
    """Schema for updating campaign lead status."""
    status: Optional[CampaignLeadStatus] = None
    current_step: Optional[int] = None
    inngest_run_id: Optional[str] = None
    next_step_at: Optional[datetime] = None
    last_error: Optional[str] = None


# Bulk Operations

class BulkLeadAssignment(BaseModel):
    """Schema for bulk lead assignment."""
    lead_ids: List[str] = Field(..., min_length=1, max_length=100, description="List of lead IDs to add")


class BulkLeadAssignmentResponse(BaseModel):
    """Schema for bulk assignment response."""
    total: int = Field(..., description="Total leads processed")
    added: int = Field(..., description="Successfully added leads")
    skipped: int = Field(..., description="Skipped leads")
    errors: List[Dict[str, str]] = Field(default_factory=list, description="Error details")


# Action Responses

class CampaignActionResponse(BaseModel):
    """Schema for campaign action responses."""
    success: bool = Field(..., description="Whether action succeeded")
    message: str = Field(..., description="Response message")
    campaign: CampaignRead = Field(..., description="Updated campaign")


# Pagination

class CampaignListResponse(BaseModel):
    """Schema for paginated campaign list."""
    campaigns: List[CampaignRead] = Field(..., description="List of campaigns")
    total: int = Field(..., description="Total number of campaigns")
    skip: int = Field(..., description="Number of skipped records")
    limit: int = Field(..., description="Maximum records returned")


class CampaignLeadListResponse(BaseModel):
    """Schema for paginated campaign lead list."""
    campaign_leads: List[CampaignLeadRead] = Field(..., description="List of campaign leads")
    total: int = Field(..., description="Total number of campaign leads")
    skip: int = Field(..., description="Number of skipped records")
    limit: int = Field(..., description="Maximum records returned")
