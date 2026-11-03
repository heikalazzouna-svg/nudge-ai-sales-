from datetime import datetime
from typing import Optional, Dict, Any

from sqlmodel import SQLModel, Field, Column, Index, UniqueConstraint
from sqlalchemy import JSON


class Lead(SQLModel, table=True):
    """Lead model representing potential customers."""
    __tablename__ = "leads"
    __table_args__ = (
        UniqueConstraint("user_id", "email", name="uq_user_email"),
        Index("idx_lead_user", "user_id"),
        Index("idx_lead_email", "email"),
    )

    id: str = Field(primary_key=True)
    user_id: str = Field(foreign_key="users.id")

    # Contact information
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    full_name: Optional[str] = None

    # Company information
    company: Optional[str] = None
    job_title: Optional[str] = None
    linkedin_url: Optional[str] = None
    website: Optional[str] = None

    # Custom fields for flexible data storage
    custom_fields: Optional[Dict[str, Any]] = Field(
        default=None,
        sa_column=Column(JSON)
    )

    # Reply tracking
    has_replied: bool = False
    replied_at: Optional[datetime] = None

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
