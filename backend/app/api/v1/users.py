from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import Optional
import logging

from app.models.user import User, UserSettings
from app.schemas.user import (
    UserCreate, 
    UserRead, 
    UserUpdate, 
    UserSettingsUpdate, 
    UserSettingsRead
)
from app.core.database import get_session
from app.core.auth import get_current_user
from datetime import datetime
import uuid

router = APIRouter()
logger = logging.getLogger(__name__)


# ============================================================================
# USER ENDPOINTS
# ============================================================================

@router.post(
    "/users",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user",
    description="Create a new user account after Clerk signup",
    responses={
        201: {"description": "User created successfully"},
        400: {"description": "User already exists"},
        422: {"description": "Invalid data"},
        500: {"description": "Internal server error"}
    }
)
async def create_user(
    user: UserCreate,
    session: Session = Depends(get_session)
) -> UserRead:
    """
    Create a new user account.
    
    Call this endpoint from your frontend after successful Clerk signup.
    The user.id should be the Clerk user ID (e.g., 'user_2abc123').
    
    Example:
        ```javascript
        const response = await fetch('/api/v1/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: user.id,  // Clerk user ID
                email: user.primaryEmailAddress.emailAddress,
                name: user.fullName
            })
        });
        ```
    
    Args:
        user: User creation data (id is Clerk user ID)
        session: Database session
        
    Returns:
        UserRead: Created user data
        
    Raises:
        HTTPException 400: User already exists
        HTTPException 500: Database error
    """
    try:
        # Check if user already exists
        existing_user = session.get(User, user.id)
        
        if existing_user:
            logger.warning(f"User already exists: id={user.id}, email={user.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": "User already exists",
                    "user_id": user.id,
                    "email": user.email
                }
            )
        
        # Check for duplicate email
        existing_email = session.exec(
            select(User).where(User.email == user.email)
        ).first()
        
        if existing_email:
            logger.warning(f"Email already in use: {user.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": "Email already in use",
                    "email": user.email
                }
            )
        
        # Create user with Clerk ID as primary key
        db_user = User(
            id=user.id,  # Clerk user ID (e.g., 'user_2abc123')
            email=user.email,
            name=user.name,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        session.add(db_user)
        session.flush()
        
        # Create default user settings
        default_settings = UserSettings(
            id=str(uuid.uuid4()),
            user_id=db_user.id,
            from_name=user.name or "Sales Team",
            from_email=user.email,
            reply_to_email=user.email,
            default_wait_days=2,
            daily_send_limit=50,
            require_review_on_low_confidence=True,
            confidence_threshold=0.7,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        session.add(default_settings)
        session.commit()
        session.refresh(db_user)
        
        logger.info(f"✅ Created user: {db_user.email} (id={db_user.id})")
        
        return db_user
        
    except HTTPException:
        session.rollback()
        raise
    except Exception as e:
        session.rollback()
        logger.error(f"Error creating user: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )


@router.get(
    "/users/{user_id}",
    response_model=UserRead,
    summary="Get user by ID",
    description="Retrieve user information",
    responses={
        200: {"description": "User found"},
        403: {"description": "Forbidden - can only access own data"},
        404: {"description": "User not found"}
    }
)
async def get_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> UserRead:
    """
    Get user by ID.
    
    Users can only access their own data.
    
    Args:
        user_id: User ID (Clerk user ID)
        current_user: Authenticated user
        session: Database session
        
    Returns:
        UserRead: User data
        
    Raises:
        HTTPException 403: Attempting to access another user's data
        HTTPException 404: User not found
    """
    # Authorization: users can only access their own data
    if current_user.id != user_id:
        logger.warning(
            f"Unauthorized access attempt: user {current_user.id} "
            f"tried to access user {user_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own user data"
        )
    
    user = session.get(User, user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id} not found"
        )
    
    return user


@router.put(
    "/users/{user_id}",
    response_model=UserRead,
    summary="Update user",
    description="Update user information",
    responses={
        200: {"description": "User updated"},
        403: {"description": "Forbidden"},
        404: {"description": "User not found"},
        422: {"description": "Invalid data"}
    }
)
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> UserRead:
    """
    Update user information.
    
    Users can only update their own data.
    Only provided fields will be updated (partial update).
    
    Args:
        user_id: User ID to update
        user_update: Fields to update
        current_user: Authenticated user
        session: Database session
        
    Returns:
        UserRead: Updated user data
        
    Raises:
        HTTPException 403: Attempting to update another user
        HTTPException 404: User not found
    """
    # Authorization check
    if current_user.id != user_id:
        logger.warning(
            f"Unauthorized update attempt: user {current_user.id} "
            f"tried to update user {user_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own user data"
        )
    
    user = session.get(User, user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id} not found"
        )
    
    try:
        # Update only provided fields (partial update)
        update_data = user_update.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(user, field, value)
        
        user.updated_at = datetime.utcnow()
        
        session.add(user)
        session.commit()
        session.refresh(user)
        
        logger.info(f"✅ Updated user: {user.email} (id={user.id})")
        
        return user
        
    except Exception as e:
        session.rollback()
        logger.error(f"Error updating user {user_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user: {str(e)}"
        )


@router.delete(
    "/users/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete user",
    description="Delete user account",
    responses={
        204: {"description": "User deleted"},
        403: {"description": "Forbidden"},
        404: {"description": "User not found"}
    }
)
async def delete_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Delete user account.
    
    This performs a hard delete. CASCADE will remove related records.
    Consider implementing soft delete for production (add is_active field).
    
    Args:
        user_id: User ID to delete
        current_user: Authenticated user
        session: Database session
        
    Raises:
        HTTPException 403: Attempting to delete another user
        HTTPException 404: User not found
    """
    # Authorization check
    if current_user.id != user_id:
        logger.warning(
            f"Unauthorized delete attempt: user {current_user.id} "
            f"tried to delete user {user_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own account"
        )
    
    user = session.get(User, user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id} not found"
        )
    
    try:
        session.delete(user)
        session.commit()
        
        logger.info(f"🗑️ Deleted user: {user.email} (id={user.id})")
        
    except Exception as e:
        session.rollback()
        logger.error(f"Error deleting user {user_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete user: {str(e)}"
        )


# ============================================================================
# USER SETTINGS ENDPOINTS
# ============================================================================

@router.get(
    "/users/{user_id}/settings",
    response_model=UserSettingsRead,
    summary="Get user settings",
    description="Retrieve user settings",
    responses={
        200: {"description": "Settings found"},
        403: {"description": "Forbidden"},
        404: {"description": "Settings not found"}
    }
)
async def get_user_settings(
    user_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> UserSettingsRead:
    """
    Get user settings.
    
    Args:
        user_id: User ID
        current_user: Authenticated user
        session: Database session
        
    Returns:
        UserSettingsRead: User settings
        
    Raises:
        HTTPException 403: Attempting to access another user's settings
        HTTPException 404: Settings not found
    """
    # Authorization check
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own settings"
        )
    
    settings = session.exec(
        select(UserSettings).where(UserSettings.user_id == user_id)
    ).first()
    
    if not settings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Settings not found for user {user_id}"
        )
    
    return settings


@router.put(
    "/users/{user_id}/settings",
    response_model=UserSettingsRead,
    summary="Update user settings",
    description="Update user settings",
    responses={
        200: {"description": "Settings updated"},
        403: {"description": "Forbidden"},
        404: {"description": "Settings not found"},
        422: {"description": "Invalid data"}
    }
)
async def update_user_settings(
    user_id: str,
    settings_update: UserSettingsUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> UserSettingsRead:
    """
    Update user settings.
    
    Only provided fields will be updated (partial update).
    
    Args:
        user_id: User ID
        settings_update: Fields to update
        current_user: Authenticated user
        session: Database session
        
    Returns:
        UserSettingsRead: Updated settings
        
    Raises:
        HTTPException 403: Attempting to update another user's settings
        HTTPException 404: Settings not found
    """
    # Authorization check
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own settings"
        )
    
    settings = session.exec(
        select(UserSettings).where(UserSettings.user_id == user_id)
    ).first()
    
    if not settings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Settings not found for user {user_id}"
        )
    
    try:
        # Update only provided fields (partial update)
        update_data = settings_update.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(settings, field, value)
        
        settings.updated_at = datetime.utcnow()
        
        session.add(settings)
        session.commit()
        session.refresh(settings)
        
        logger.info(f"✅ Updated settings for user {user_id}")
        
        return settings
        
    except Exception as e:
        session.rollback()
        logger.error(f"Error updating settings for user {user_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update settings: {str(e)}"
        )
