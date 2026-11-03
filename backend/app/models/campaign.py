from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field, Index, UniqueConstraint

from .enums import CampaignStatus, CampaignLeadStatus


class Campaign(SQLModel, table=True):
    """Campaign model representing email outreach campaigns."""
    __tablename__ = "campaigns"

    id: str = Field(primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)

    # Campaign details
    name: str
    description: Optional[str] = None
    status: CampaignStatus = CampaignStatus.DRAFT

    # Campaign configuration
    target_audience: Optional[str] = None
    value_proposition: Optional[str] = None
    tone: str = "professional"

    # Email configuration
    from_email: Optional[str] = None

    # Campaign configuration
    max_follow_ups: int = Field(default=1)
    follow_up_delay_days: int = Field(default=2)

    # Pause tracking
    paused_at: Optional[datetime] = None
    paused_by: Optional[str] = None

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class CampaignLead(SQLModel, table=True):
    """Junction table linking campaigns to leads with workflow state."""
    __tablename__ = "campaign_leads"
    __table_args__ = (
        UniqueConstraint("campaign_id", "lead_id", name="uq_campaign_lead"),
        Index("idx_campaign_lead_status", "status"),
    )

    id: str = Field(primary_key=True)
    campaign_id: str = Field(foreign_key="campaigns.id")
    lead_id: str = Field(foreign_key="leads.id")

    # Workflow state
    status: CampaignLeadStatus = CampaignLeadStatus.PENDING
    current_step: int = 0

    # Inngest workflow tracking
    inngest_run_id: Optional[str] = None
    next_step_at: Optional[datetime] = None

    # Completion tracking
    replied_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    # Error tracking
    last_error: Optional[str] = None
    error_count: int = 0

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
