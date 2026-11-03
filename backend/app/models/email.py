from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field, Index, UniqueConstraint

from .enums import EmailStatus


class EmailLog(SQLModel, table=True):
    """Email log model tracking all sent emails."""
    __tablename__ = "email_logs"
    __table_args__ = (
        UniqueConstraint("campaign_lead_id", "step_number", name="uq_campaign_lead_step"),
        Index("idx_email_status", "status"),
    )

    id: str = Field(primary_key=True)
    campaign_lead_id: str = Field(foreign_key="campaign_leads.id")
    step_id: str
    step_number: int

    # Email content
    to_email: str
    from_email: str
    subject: str
    body: str

    # External tracking
    resend_id: Optional[str] = Field(default=None, unique=True)

    # Status tracking (starts as QUEUED, progresses through lifecycle)
    status: EmailStatus = EmailStatus.QUEUED

    # Event timestamps
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    opened_at: Optional[datetime] = None
    clicked_at: Optional[datetime] = None
    replied_at: Optional[datetime] = None
    bounced_at: Optional[datetime] = None

    # Error tracking
    error_message: Optional[str] = None

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
