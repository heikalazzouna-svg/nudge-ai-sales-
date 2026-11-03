from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query, UploadFile, File, status
from fastapi.responses import StreamingResponse
from sqlmodel import Session
from io import StringIO

from app.core.database import get_session
from app.core.auth import get_current_user
from app.models.user import User
from app.services.lead_service import LeadService
from app.schemas.lead import (
    LeadCreate,
    LeadRead,
    LeadUpdate,
    LeadListResponse,
    BulkLeadCreate,
    BulkLeadCreateResponse,
    BulkLeadDelete,
    BulkLeadDeleteResponse,
    LeadImportResponse,
)

router = APIRouter(prefix="/leads", tags=["leads"])


# ============================================================================
# Lead CRUD Operations
# ============================================================================

@router.post(
    "",
    response_model=LeadRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new lead",
    description="Create a single lead with validation and duplicate detection"
)
async def create_lead(
    lead_data: LeadCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> LeadRead:
    """
    Create a new lead.

    - **email**: Lead email address (required, must be unique per user)
    - **first_name**: First name (optional, max 100 characters)
    - **last_name**: Last name (optional, max 100 characters)
    - **company**: Company name (optional, max 200 characters)
    - **job_title**: Job title (optional, max 200 characters)
    - **linkedin_url**: LinkedIn profile URL (optional)
    - **website**: Website URL (optional)
    - **custom_fields**: Additional custom data (optional JSON object)

    Returns the created lead.
    """
    lead = LeadService.create_lead(
        session=session,
        lead_data=lead_data,
        user_id=current_user.id
    )
    return LeadRead.model_validate(lead)


@router.get(
    "",
    response_model=LeadListResponse,
    summary="List leads",
    description="Get a paginated list of leads with optional filtering and search"
)
async def list_leads(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of records to return"),
    company: Optional[str] = Query(None, description="Filter by company (partial match)"),
    job_title: Optional[str] = Query(None, description="Filter by job title (partial match)"),
    has_replied: Optional[bool] = Query(None, description="Filter by reply status"),
    search: Optional[str] = Query(None, description="Search in name, email, and company"),
    created_after: Optional[datetime] = Query(None, description="Filter by creation date (after)"),
    created_before: Optional[datetime] = Query(None, description="Filter by creation date (before)"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> LeadListResponse:
    """
    List leads for the authenticated user.

    Supports filtering by:
    - **company**: Partial match, case-insensitive
    - **job_title**: Partial match, case-insensitive
    - **has_replied**: Boolean filter
    - **search**: Searches in first_name, last_name, full_name, email, and company
    - **created_after**: ISO datetime
    - **created_before**: ISO datetime

    Returns paginated list of leads with total count.
    """
    leads, total = LeadService.list_leads(
        session=session,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        company=company,
        job_title=job_title,
        has_replied=has_replied,
        search=search,
        created_after=created_after,
        created_before=created_before
    )

    return LeadListResponse(
        leads=[LeadRead.model_validate(lead) for lead in leads],
        total=total,
        skip=skip,
        limit=limit
    )


@router.get(
    "/{lead_id}",
    response_model=LeadRead,
    summary="Get lead details",
    description="Get detailed information about a specific lead"
)
async def get_lead(
    lead_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> LeadRead:
    """
    Get lead details by ID.

    Returns lead information if it exists and belongs to the user.
    """
    lead = LeadService.get_lead(
        session=session,
        lead_id=lead_id,
        user_id=current_user.id
    )
    return LeadRead.model_validate(lead)


@router.patch(
    "/{lead_id}",
    response_model=LeadRead,
    summary="Update lead",
    description="Update lead information"
)
async def update_lead(
    lead_id: str,
    update_data: LeadUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> LeadRead:
    """
    Update lead information.

    Only provided fields will be updated. All fields are optional.
    Email uniqueness is validated if email is being updated.
    """
    lead = LeadService.update_lead(
        session=session,
        lead_id=lead_id,
        user_id=current_user.id,
        update_data=update_data
    )
    return LeadRead.model_validate(lead)


@router.delete(
    "/{lead_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete lead",
    description="Delete a lead"
)
async def delete_lead(
    lead_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> None:
    """
    Delete a lead.

    This will also remove the lead from any campaigns.
    """
    LeadService.delete_lead(
        session=session,
        lead_id=lead_id,
        user_id=current_user.id
    )


# ============================================================================
# Bulk Operations
# ============================================================================

@router.post(
    "/bulk",
    response_model=BulkLeadCreateResponse,
    summary="Bulk create leads",
    description="Create multiple leads in one operation"
)
async def bulk_create_leads(
    bulk_data: BulkLeadCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> BulkLeadCreateResponse:
    """
    Bulk create leads.

    - Maximum 1000 leads per request
    - Duplicate emails can be skipped or cause errors based on skip_duplicates flag
    - Returns detailed results including errors for individual leads

    Returns summary of operation with success/failure counts.
    """
    results = LeadService.bulk_create_leads(
        session=session,
        leads_data=bulk_data.leads,
        user_id=current_user.id,
        skip_duplicates=bulk_data.skip_duplicates
    )

    return BulkLeadCreateResponse(**results)


@router.delete(
    "/bulk",
    response_model=BulkLeadDeleteResponse,
    summary="Bulk delete leads",
    description="Delete multiple leads in one operation"
)
async def bulk_delete_leads(
    bulk_data: BulkLeadDelete,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> BulkLeadDeleteResponse:
    """
    Bulk delete leads.

    - Maximum 1000 leads per request
    - Invalid or non-existent lead IDs will be skipped
    - Returns detailed results including errors

    Returns summary of operation with success/failure counts.
    """
    results = LeadService.bulk_delete_leads(
        session=session,
        lead_ids=bulk_data.lead_ids,
        user_id=current_user.id
    )

    return BulkLeadDeleteResponse(**results)


# ============================================================================
# CSV Import/Export
# ============================================================================

@router.post(
    "/import",
    response_model=LeadImportResponse,
    summary="Import leads from CSV",
    description="Import leads from a CSV file"
)
async def import_leads(
    file: UploadFile = File(..., description="CSV file with lead data"),
    skip_duplicates: bool = Query(True, description="Skip duplicate emails"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> LeadImportResponse:
    """
    Import leads from CSV file.

    **CSV Format**:
    - Required columns: `email`
    - Optional columns: `first_name`, `last_name`, `full_name`, `company`, `job_title`, `linkedin_url`, `website`
    - Maximum 10,000 rows per file

    **Example CSV**:
    ```
    email,first_name,last_name,company,job_title
    john@example.com,John,Doe,Acme Corp,CTO
    jane@example.com,Jane,Smith,Tech Inc,VP Engineering
    ```

    Returns import results with success/failure counts and detailed errors.
    """
    results = await LeadService.import_from_csv(
        session=session,
        file=file,
        user_id=current_user.id,
        skip_duplicates=skip_duplicates
    )

    return LeadImportResponse(**results)


@router.get(
    "/export",
    summary="Export leads to CSV",
    description="Export leads to a CSV file"
)
async def export_leads(
    company: Optional[str] = Query(None, description="Filter by company"),
    job_title: Optional[str] = Query(None, description="Filter by job title"),
    has_replied: Optional[bool] = Query(None, description="Filter by reply status"),
    search: Optional[str] = Query(None, description="Search filter"),
    created_after: Optional[datetime] = Query(None, description="Created after date"),
    created_before: Optional[datetime] = Query(None, description="Created before date"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Export leads to CSV file.

    Applies the same filters as the list endpoint.
    Returns a downloadable CSV file.

    **CSV Columns**:
    - email, first_name, last_name, full_name, company, job_title
    - linkedin_url, website, has_replied, replied_at, created_at
    """
    csv_content = LeadService.export_to_csv(
        session=session,
        user_id=current_user.id,
        company=company,
        job_title=job_title,
        has_replied=has_replied,
        search=search,
        created_after=created_after,
        created_before=created_before
    )

    # Return as downloadable file
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=leads_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
        }
    )
