from sqlmodel import SQLModel, create_engine, Session
from app.core.config import settings

# Create engine with connection pooling settings
# pool_pre_ping: Test connections before using them
# pool_recycle: Recycle connections after 300 seconds (5 minutes)
# This prevents "SSL connection has been closed unexpectedly" errors
engine = create_engine(
    settings.DATABASE_URL,
    echo=True,  # Set to False in production
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
    pool_pre_ping=True,  # Test connection before using
    pool_recycle=300,    # Recycle connections every 5 minutes
)


def create_db_and_tables():
    """Create all database tables."""
    SQLModel.metadata.create_all(engine)


def get_session():
    """Get database session for dependency injection."""
    with Session(engine) as session:
        yield session
