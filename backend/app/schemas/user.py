from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


# User Schemas
class UserBase(BaseModel):
    """Base user schema with common fields."""
    email: EmailStr
    name: Optional[str] = None


class UserCreate(UserBase):
    """
    Schema for creating a new user.
    
    The id field is the Clerk user ID (e.g., 'user_2abc123').
    This is obtained from Clerk after user signup.
    """
    id: str = Field(..., description="Clerk user ID (e.g., 'user_2abc123')")


class UserUpdate(BaseModel):
    """Schema for updating user information."""
    email: Optional[EmailStr] = None
    name: Optional[str] = None


class UserRead(UserBase):
    """Schema for reading user data."""
    id: str = Field(..., description="Clerk user ID")
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# UserSettings Schemas
class UserSettingsBase(BaseModel):
    """Base user settings schema."""
    from_name: str = Field(default="Sales Team", description="Default sender name")
    from_email: Optional[EmailStr] = Field(None, description="Default sender email")
    reply_to_email: Optional[EmailStr] = Field(None, description="Reply-to email address")
    default_wait_days: int = Field(default=2, ge=1, le=30, description="Default days to wait between emails")
    daily_send_limit: int = Field(default=50, ge=1, le=1000, description="Maximum emails per day")
    require_review_on_low_confidence: bool = Field(default=True, description="Require manual review for low confidence emails")
    confidence_threshold: float = Field(default=0.7, ge=0.0, le=1.0, description="Confidence threshold for auto-send")


class UserSettingsCreate(UserSettingsBase):
    """Schema for creating user settings."""
    pass


class UserSettingsUpdate(BaseModel):
    """Schema for updating user settings."""
    from_name: Optional[str] = None
    from_email: Optional[EmailStr] = None
    reply_to_email: Optional[EmailStr] = None
    default_wait_days: Optional[int] = Field(None, ge=1, le=30)
    daily_send_limit: Optional[int] = Field(None, ge=1, le=1000)
    require_review_on_low_confidence: Optional[bool] = None
    confidence_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)


class UserSettingsRead(UserSettingsBase):
    """Schema for reading user settings."""
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
