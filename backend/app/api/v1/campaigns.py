"""
Campaign API routes.

This module provides RESTful endpoints for campaign management including
CRUD operations, state management, and lead assignment.
"""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status
from sqlmodel import Session, select, func, and_

from app.core.database import get_session
from app.core.auth import get_current_user
from app.models.user import User
from app.models.campaign import CampaignLead
from app.models.lead import Lead
from app.models.enums import CampaignStatus
from app.services.campaign_service import CampaignService
from app.schemas.campaign import (
    CampaignCreate,
    CampaignRead,
    CampaignUpdate,
    CampaignWithStats,
    CampaignStats,
    CampaignLeadCreate,
    CampaignLeadRead,
    CampaignLeadUpdate,
    BulkLeadAssignment,
    BulkLeadAssignmentResponse,
    CampaignActionResponse,
    CampaignListResponse,
    CampaignLeadListResponse,
)
from app.workflows.campaign import inngest_client
import inngest

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


# ============================================================================
# Campaign CRUD Operations
# ============================================================================

@router.post(
    "",
    response_model=CampaignRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new campaign",
    description="Create a new campaign in DRAFT status"
)
async def create_campaign(
    campaign_data: CampaignCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> CampaignRead:
    """
    Create a new campaign.

    - **name**: Campaign name (required, 1-200 characters)
    - **description**: Campaign description (optional, max 1000 characters)
    - **target_audience**: Target audience description (optional, max 500 characters)
    - **value_proposition**: Value proposition (optional, max 500 characters)
    - **tone**: Email tone (default: "professional", max 50 characters)

    Returns the created campaign in DRAFT status.
    """
    campaign = CampaignService.create_campaign(
        session=session,
        campaign_data=campaign_data,
        user_id=current_user.id
    )
    return CampaignRead.model_validate(campaign)


@router.get(
    "",
    response_model=CampaignListResponse,
    summary="List campaigns",
    description="Get a paginated list of campaigns with optional filtering"
)
async def list_campaigns(
    status_filter: Optional[CampaignStatus] = Query(None, description="Filter by campaign status"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of records to return"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> CampaignListResponse:
    """
    List campaigns for the authenticated user.

    - **status**: Optional filter by campaign status
    - **skip**: Number of records to skip (default: 0)
    - **limit**: Maximum records to return (default: 50, max: 100)

    Returns paginated list of campaigns with total count.
    """
    campaigns, total = CampaignService.list_campaigns(
        session=session,
        user_id=current_user.id,
        status_filter=status_filter,
        skip=skip,
        limit=limit
    )

    return CampaignListResponse(
        campaigns=[CampaignRead.model_validate(c) for c in campaigns],
        total=total,
        skip=skip,
        limit=limit
    )


@router.get(
    "/{campaign_id}",
    response_model=CampaignWithStats,
    summary="Get campaign details",
    description="Get detailed campaign information including statistics"
)
async def get_campaign(
    campaign_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> CampaignWithStats:
    """
    Get campaign details with statistics.

    Returns campaign information along with lead statistics.
    """
    campaign = CampaignService.get_campaign(
        session=session,
        campaign_id=campaign_id,
        user_id=current_user.id
    )

    stats = CampaignService.get_campaign_stats(
        session=session,
        campaign_id=campaign_id,
        user_id=current_user.id
    )

    return CampaignWithStats(
        **CampaignRead.model_validate(campaign).model_dump(),
        stats=stats
    )


@router.patch(
    "/{campaign_id}",
    response_model=CampaignRead,
    summary="Update campaign",
    description="Update campaign fields"
)
async def update_campaign(
    campaign_id: str,
    update_data: CampaignUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> CampaignRead:
    """
    Update campaign information.

    Only provided fields will be updated. All fields are optional.
    """
    campaign = CampaignService.update_campaign(
        session=session,
        campaign_id=campaign_id,
        user_id=current_user.id,
        update_data=update_data
    )

    return CampaignRead.model_validate(campaign)


@router.delete(
    "/{campaign_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete campaign",
    description="Delete a campaign and all associated campaign leads"
)
async def delete_campaign(
    campaign_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> None:
    """
    Delete a campaign.

    This will also delete all associated campaign leads (but not the leads themselves).
    """
    CampaignService.delete_campaign(
        session=session,
        campaign_id=campaign_id,
        user_id=current_user.id
    )


# ============================================================================
# Campaign Statistics
# ============================================================================

@router.get(
    "/{campaign_id}/stats",
    response_model=CampaignStats,
    summary="Get campaign statistics",
    description="Get detailed statistics for a campaign"
)
async def get_campaign_stats(
    campaign_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> CampaignStats:
    """
    Get campaign statistics.

    Returns counts for different lead statuses in the campaign.
    """
    return CampaignService.get_campaign_stats(
        session=session,
        campaign_id=campaign_id,
        user_id=current_user.id
    )


# ============================================================================
# Campaign Actions (State Management)
# ============================================================================

@router.post(
    "/{campaign_id}/start",
    response_model=CampaignActionResponse,
    summary="Start campaign",
    description="Start a campaign (DRAFT → ACTIVE) and trigger workflows"
)
async def start_campaign(
    campaign_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> CampaignActionResponse:
    """
    Start a campaign.

    - Transitions campaign from DRAFT to ACTIVE
    - Requires at least one lead in the campaign
    - Triggers Inngest workflows for all pending leads

    Returns updated campaign information with workflow trigger status.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # Start the campaign (validates state, sets to ACTIVE)
    campaign = CampaignService.start_campaign(
        session=session,
        campaign_id=campaign_id,
        user_id=current_user.id
    )
    
    logger.info(f"🚀 Campaign {campaign_id} started by user {current_user.id}")

    # Get all pending campaign leads
    campaign_leads = session.exec(
        select(CampaignLead, Lead)
        .join(Lead, CampaignLead.lead_id == Lead.id)
        .where(
            and_(
                CampaignLead.campaign_id == campaign_id,
                CampaignLead.status == "PENDING"
            )
        )
    ).all()

    total_leads = len(campaign_leads)
    logger.info(f"📊 Found {total_leads} pending leads for campaign {campaign_id}")

    # Trigger workflow for each lead
    triggered_count = 0
    failed_count = 0
    errors = []
    
    for campaign_lead, lead in campaign_leads:
        try:
            # Build event payload with full lead and campaign context
            event_payload = {
                "campaign_id": campaign_id,
                "campaign_lead_id": campaign_lead.id,
                "lead": {
                    "id": lead.id,
                    "email": lead.email,
                    "first_name": lead.first_name or "there",
                    "last_name": lead.last_name or "",
                    "full_name": lead.full_name or "",
                    "company": lead.company or "your company",
                    "job_title": lead.job_title or "",
                    "linkedin_url": lead.linkedin_url or "",
                    "website": lead.website or "",
                    "custom_fields": lead.custom_fields or {}
                },
                "campaign_config": {
                    "name": campaign.name,
                    "target_audience": campaign.target_audience or "",
                    "value_proposition": campaign.value_proposition or "",
                    "tone": campaign.tone or "professional",
                    "from_email": campaign.from_email or ""
                }
            }
            
            # Send event to Inngest
            await inngest_client.send(
                inngest.Event(
                    name="campaign/start_sequence",
                    data=event_payload
                )
            )
            
            triggered_count += 1
            logger.debug(f"✅ Triggered workflow for lead {lead.id} ({lead.email})")
            
        except Exception as e:
            failed_count += 1
            error_msg = f"Lead {lead.id}: {str(e)}"
            errors.append(error_msg)
            logger.error(f"❌ Failed to trigger workflow for lead {lead.id}: {e}")

    # Build response message
    if failed_count == 0:
        message = f"Campaign started successfully. Triggered workflows for {triggered_count} leads."
    else:
        message = (
            f"Campaign started with {failed_count} errors. "
            f"Triggered {triggered_count}/{total_leads} workflows."
        )

    logger.info(
        f"📬 Campaign {campaign_id} workflow triggering complete: "
        f"{triggered_count} success, {failed_count} failed"
    )

    return CampaignActionResponse(
        success=True,
        message=message,
        campaign=CampaignRead.model_validate(campaign)
    )




@router.post(
    "/{campaign_id}/pause",
    response_model=CampaignActionResponse,
    summary="Pause campaign",
    description="Pause an active campaign (ACTIVE → PAUSED)"
)
async def pause_campaign(
    campaign_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> CampaignActionResponse:
    """
    Pause a campaign.

    - Transitions campaign from ACTIVE to PAUSED
    - Records who paused it and when
    - Note: Already running workflows will continue

    Returns updated campaign information.
    """
    campaign = CampaignService.pause_campaign(
        session=session,
        campaign_id=campaign_id,
        user_id=current_user.id
    )

    return CampaignActionResponse(
        success=True,
        message="Campaign paused successfully",
        campaign=CampaignRead.model_validate(campaign)
    )


@router.post(
    "/{campaign_id}/resume",
    response_model=CampaignActionResponse,
    summary="Resume campaign",
    description="Resume a paused campaign (PAUSED → ACTIVE) and re-trigger workflows"
)
async def resume_campaign(
    campaign_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> CampaignActionResponse:
    """
    Resume a paused campaign.

    - Transitions campaign from PAUSED to ACTIVE
    - Clears pause metadata
    - Re-triggers Inngest workflows for PAUSED and PENDING leads

    Returns updated campaign information with workflow trigger status.
    """
    import logging
    from app.models.enums import CampaignLeadStatus
    
    logger = logging.getLogger(__name__)
    
    # Resume the campaign (validates state, sets to ACTIVE)
    campaign = CampaignService.resume_campaign(
        session=session,
        campaign_id=campaign_id,
        user_id=current_user.id
    )
    
    logger.info(f"▶️ Campaign {campaign_id} resumed by user {current_user.id}")

    # Get all PAUSED and PENDING campaign leads that need workflow re-trigger
    campaign_leads = session.exec(
        select(CampaignLead, Lead)
        .join(Lead, CampaignLead.lead_id == Lead.id)
        .where(
            and_(
                CampaignLead.campaign_id == campaign_id,
                CampaignLead.status.in_([
                    CampaignLeadStatus.PAUSED,
                    CampaignLeadStatus.PENDING
                ])
            )
        )
    ).all()

    total_leads = len(campaign_leads)
    logger.info(f"📊 Found {total_leads} leads to re-trigger for campaign {campaign_id}")

    # Trigger workflow for each lead
    triggered_count = 0
    failed_count = 0
    errors = []
    
    for campaign_lead, lead in campaign_leads:
        try:
            # Reset status to PENDING before re-triggering
            campaign_lead.status = CampaignLeadStatus.PENDING
            campaign_lead.updated_at = datetime.utcnow()
            session.add(campaign_lead)
            
            # Build event payload with full lead and campaign context
            event_payload = {
                "campaign_id": campaign_id,
                "campaign_lead_id": campaign_lead.id,
                "lead": {
                    "id": lead.id,
                    "email": lead.email,
                    "first_name": lead.first_name or "there",
                    "last_name": lead.last_name or "",
                    "full_name": lead.full_name or "",
                    "company": lead.company or "your company",
                    "job_title": lead.job_title or "",
                    "linkedin_url": lead.linkedin_url or "",
                    "website": lead.website or "",
                    "custom_fields": lead.custom_fields or {}
                },
                "campaign_config": {
                    "name": campaign.name,
                    "target_audience": campaign.target_audience or "",
                    "value_proposition": campaign.value_proposition or "",
                    "tone": campaign.tone or "professional",
                    "from_email": campaign.from_email or ""
                }
            }
            
            # Send event to Inngest
            await inngest_client.send(
                inngest.Event(
                    name="campaign/start_sequence",
                    data=event_payload
                )
            )
            
            triggered_count += 1
            logger.debug(f"✅ Re-triggered workflow for lead {lead.id} ({lead.email})")
            
        except Exception as e:
            failed_count += 1
            error_msg = f"Lead {lead.id}: {str(e)}"
            errors.append(error_msg)
            logger.error(f"❌ Failed to re-trigger workflow for lead {lead.id}: {e}")

    # Commit status changes
    session.commit()

    # Build response message
    if total_leads == 0:
        message = "Campaign resumed. No leads needed workflow re-trigger."
    elif failed_count == 0:
        message = f"Campaign resumed successfully. Re-triggered workflows for {triggered_count} leads."
    else:
        message = (
            f"Campaign resumed with {failed_count} errors. "
            f"Re-triggered {triggered_count}/{total_leads} workflows."
        )

    logger.info(
        f"📬 Campaign {campaign_id} resume complete: "
        f"{triggered_count} success, {failed_count} failed"
    )

    return CampaignActionResponse(
        success=True,
        message=message,
        campaign=CampaignRead.model_validate(campaign)
    )


@router.post(
    "/{campaign_id}/complete",
    response_model=CampaignActionResponse,
    summary="Complete campaign",
    description="Mark a campaign as completed (ACTIVE/PAUSED → COMPLETED)"
)
async def complete_campaign(
    campaign_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> CampaignActionResponse:
    """
    Mark a campaign as completed.

    - Transitions campaign to COMPLETED status
    - No further leads can be added
    - Workflows already in progress will continue

    Returns updated campaign information.
    """
    campaign = CampaignService.complete_campaign(
        session=session,
        campaign_id=campaign_id,
        user_id=current_user.id
    )

    return CampaignActionResponse(
        success=True,
        message="Campaign marked as completed",
        campaign=CampaignRead.model_validate(campaign)
    )


# ============================================================================
# Campaign Lead Management
# ============================================================================

@router.post(
    "/{campaign_id}/leads",
    response_model=CampaignLeadRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add lead to campaign",
    description="Add a single lead to a campaign"
)
async def add_lead_to_campaign(
    campaign_id: str,
    lead_data: CampaignLeadCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> CampaignLeadRead:
    """
    Add a lead to a campaign.

    - Lead must exist and belong to the user
    - Cannot add duplicate leads to the same campaign
    - Cannot add leads to COMPLETED or ARCHIVED campaigns

    Returns the created campaign lead.
    """
    campaign_lead = CampaignService.add_lead_to_campaign(
        session=session,
        campaign_id=campaign_id,
        lead_id=lead_data.lead_id,
        user_id=current_user.id
    )

    return CampaignLeadRead.model_validate(campaign_lead)


@router.post(
    "/{campaign_id}/leads/bulk",
    response_model=BulkLeadAssignmentResponse,
    summary="Bulk add leads to campaign",
    description="Add multiple leads to a campaign in one operation"
)
async def bulk_add_leads(
    campaign_id: str,
    bulk_data: BulkLeadAssignment,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> BulkLeadAssignmentResponse:
    """
    Add multiple leads to a campaign.

    - Maximum 100 leads per request
    - Invalid or duplicate leads will be skipped
    - Returns detailed results including errors

    Returns summary of operation with success/failure counts.
    """
    results = CampaignService.add_leads_bulk(
        session=session,
        campaign_id=campaign_id,
        lead_ids=bulk_data.lead_ids,
        user_id=current_user.id
    )

    return BulkLeadAssignmentResponse(**results)


@router.get(
    "/{campaign_id}/leads",
    response_model=CampaignLeadListResponse,
    summary="List campaign leads",
    description="Get paginated list of leads in a campaign"
)
async def list_campaign_leads(
    campaign_id: str,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of records to return"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> CampaignLeadListResponse:
    """
    List leads in a campaign.

    Returns paginated list of campaign leads with their status.
    """
    # Verify campaign ownership
    CampaignService.get_campaign(session, campaign_id, current_user.id)

    # Get total count
    total = session.exec(
        select(func.count(CampaignLead.id)).where(
            CampaignLead.campaign_id == campaign_id
        )
    ).one()

    # Get paginated results
    campaign_leads = session.exec(
        select(CampaignLead)
        .where(CampaignLead.campaign_id == campaign_id)
        .order_by(CampaignLead.created_at.desc())
        .offset(skip)
        .limit(limit)
    ).all()

    return CampaignLeadListResponse(
        campaign_leads=[CampaignLeadRead.model_validate(cl) for cl in campaign_leads],
        total=total,
        skip=skip,
        limit=limit
    )


@router.delete(
    "/{campaign_id}/leads/{lead_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove lead from campaign",
    description="Remove a lead from a campaign"
)
async def remove_lead_from_campaign(
    campaign_id: str,
    lead_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> None:
    """
    Remove a lead from a campaign.

    This deletes the campaign lead association but not the lead itself.
    """
    CampaignService.remove_lead_from_campaign(
        session=session,
        campaign_id=campaign_id,
        lead_id=lead_id,
        user_id=current_user.id
    )


@router.patch(
    "/{campaign_id}/leads/{campaign_lead_id}",
    response_model=CampaignLeadRead,
    summary="Update campaign lead",
    description="Update campaign lead status and metadata"
)
async def update_campaign_lead(
    campaign_id: str,
    campaign_lead_id: str,
    update_data: CampaignLeadUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> CampaignLeadRead:
    """
    Update campaign lead information.

    Typically used by workflows to update status and tracking information.
    """
    # Verify campaign ownership
    CampaignService.get_campaign(session, campaign_id, current_user.id)

    # Get campaign lead
    campaign_lead = session.get(CampaignLead, campaign_lead_id)
    if not campaign_lead or campaign_lead.campaign_id != campaign_id:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign lead not found"
        )

    # Apply updates
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(campaign_lead, field, value)

    campaign_lead.updated_at = datetime.utcnow()

    try:
        session.add(campaign_lead)
        session.commit()
        session.refresh(campaign_lead)
        return CampaignLeadRead.model_validate(campaign_lead)

    except Exception as e:
        session.rollback()
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update campaign lead: {str(e)}"
        )
