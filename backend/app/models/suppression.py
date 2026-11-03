from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field, UniqueConstraint

from .enums import SuppressionReason


class Suppression(SQLModel, table=True):
    """Suppression list model for managing unsubscribes and bounces."""
    __tablename__ = "suppressions"
    __table_args__ = (
        UniqueConstraint("user_id", "email", name="uq_user_suppression_email"),
    )

    id: str = Field(primary_key=True)
    user_id: str = Field(foreign_key="users.id")

    # Suppression details
    email: str
    reason: SuppressionReason
    notes: Optional[str] = None

    # Source tracking
    source_type: Optional[str] = None
    source_id: Optional[str] = None

    # Timestamp
    created_at: datetime = Field(default_factory=datetime.utcnow)
