from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlmodel import Session, select
from sqlalchemy.exc import IntegrityError, OperationalError
from pydantic import ValidationError
from app.models.lead import Lead
from app.schemas.lead import LeadCreate
from app.core.database import get_session
from app.core.auth import get_current_user
from app.models.user import User
from app.workflows.campaign import inngest_client
from app.api.v1.users import router as users_router
from app.api.v1.campaigns import router as campaigns_router
from app.api.v1.leads import router as leads_router
from app.api.v1.webhook import router as webhook_router
from app.api.v1.stats import router as stats_router
import uuid
from datetime import datetime

api_router = APIRouter()

# Include routers
api_router.include_router(users_router, tags=["users"])
api_router.include_router(campaigns_router)
api_router.include_router(leads_router)
api_router.include_router(webhook_router, prefix="/webhooks", tags=["webhooks"])
api_router.include_router(stats_router)



