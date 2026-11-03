from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    pass


class User(SQLModel, table=True):
    """User model representing application users."""
    __tablename__ = "users"

    # Use Clerk ID as primary key (no separate UUID)
    id: str = Field(primary_key=True, description="Clerk user ID")
    email: str = Field(unique=True, index=True)
    name: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    settings: Optional["UserSettings"] = Relationship(back_populates="user")


class UserSettings(SQLModel, table=True):
    """User settings model for email and campaign configuration."""
    __tablename__ = "user_settings"

    id: str = Field(primary_key=True)
    user_id: str = Field(foreign_key="users.id", unique=True, index=True)

    from_name: str = "Sales Team"
    from_email: Optional[str] = None
    reply_to_email: Optional[str] = None

    default_wait_days: int = 2
    daily_send_limit: int = 50

    require_review_on_low_confidence: bool = True
    confidence_threshold: float = 0.7

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: User = Relationship(back_populates="settings")
