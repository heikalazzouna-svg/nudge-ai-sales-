from datetime import date, datetime

from sqlmodel import SQLModel, Field, UniqueConstraint


class DailyUsage(SQLModel, table=True):
    """Daily usage tracking model for monitoring email sending limits."""
    __tablename__ = "daily_usage"
    __table_args__ = (
        UniqueConstraint("user_id", "date", name="uq_user_date"),
    )

    id: str = Field(primary_key=True)
    user_id: str = Field(foreign_key="users.id")

    # Date for this usage record
    date: date

    # Usage counters
    sent_count: int = 0
    delivered_count: int = 0
    bounced_count: int = 0
    replied_count: int = 0

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
