from fastapi import Header, HTTPException, status, Depends
from sqlmodel import Session, select
from typing import Optional
import logging

from app.models.user import User
from app.core.database import get_session

logger = logging.getLogger(__name__)


async def get_current_user(
    x_clerk_id: Optional[str] = Header(None, alias="X-Clerk-Id"),
    session: Session = Depends(get_session)
) -> User:
    """
    Get the current authenticated user from Clerk ID header.
    
    The Clerk ID is used directly as the user ID in the database.
    
    Args:
        x_clerk_id: Clerk user ID from request header (e.g., 'user_2abc123')
        session: Database session
        
    Returns:
        User: The authenticated user
        
    Raises:
        HTTPException 401: If no clerk_id provided
        HTTPException 404: If user not found
    """
    if not x_clerk_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide X-Clerk-Id header.",
            headers={"WWW-Authenticate": "X-Clerk-Id"},
        )
    
    # Find user by ID (which is the Clerk ID)
    user = session.get(User, x_clerk_id)
    
    if not user:
        logger.warning(f"User not found for clerk_id: {x_clerk_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"User not found. Please create your account first. "
                f"POST /api/v1/users with your Clerk user data."
            )
        )
    
    logger.info(f"✅ Authenticated user: {user.email} (id={x_clerk_id})")
    return user


async def get_optional_user(
    x_clerk_id: Optional[str] = Header(None, alias="X-Clerk-Id"),
    session: Session = Depends(get_session)
) -> Optional[User]:
    """
    Get the current user if authenticated, otherwise return None.
    Useful for optional authentication.
    
    Args:
        x_clerk_id: Clerk user ID from request header
        session: Database session
        
    Returns:
        Optional[User]: The authenticated user or None
    """
    if not x_clerk_id:
        return None
    
    user = session.get(User, x_clerk_id)
    
    if user:
        logger.info(f"✅ Optional auth: {user.email} (id={x_clerk_id})")
    
    return user
