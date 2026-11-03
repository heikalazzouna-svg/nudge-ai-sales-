from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import uuid4
from io import StringIO
import csv

from sqlmodel import Session, select, func, or_
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status, UploadFile

from app.models.lead import Lead
from app.schemas.lead import LeadCreate, LeadUpdate


class LeadService:
    """Service class for lead operations."""

    @staticmethod
    def create_lead(
        session: Session,
        lead_data: LeadCreate,
        user_id: str
    ) -> Lead:
        """
        Create a new lead.

        Args:
            session: Database session
            lead_data: Lead creation data
            user_id: Owner user ID

        Returns:
            Created lead

        Raises:
            HTTPException: On validation or database errors
        """
        try:
            # Check for duplicate email
            existing = session.exec(
                select(Lead).where(
                    Lead.user_id == user_id,
                    Lead.email == lead_data.email
                )
            ).first()

            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"A lead with email {lead_data.email} already exists"
                )

            # Prepare lead data
            lead_dict = lead_data.model_dump(exclude_unset=True)
            
            # Convert URLs to strings if needed
            if "linkedin_url" in lead_dict and lead_dict["linkedin_url"]:
                lead_dict["linkedin_url"] = str(lead_dict["linkedin_url"])
            if "website" in lead_dict and lead_dict["website"]:
                lead_dict["website"] = str(lead_dict["website"])

            # Add required fields
            lead_dict["id"] = str(uuid4())
            lead_dict["user_id"] = user_id
            lead_dict["has_replied"] = False
            lead_dict["created_at"] = datetime.utcnow()
            lead_dict["updated_at"] = datetime.utcnow()

            # Create lead
            lead = Lead(**lead_dict)
            session.add(lead)
            session.commit()
            session.refresh(lead)

            return lead

        except HTTPException:
            raise
        except IntegrityError as e:
            session.rollback()
            if "uq_user_email" in str(e).lower():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A lead with this email already exists"
                )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Database integrity error: {str(e)}"
            )
        except Exception as e:
            session.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create lead: {str(e)}"
            )

    @staticmethod
    def get_lead(
        session: Session,
        lead_id: str,
        user_id: str
    ) -> Lead:
        """
        Get a lead by ID with ownership validation.

        Args:
            session: Database session
            lead_id: Lead ID
            user_id: User ID for ownership check

        Returns:
            Lead instance

        Raises:
            HTTPException: If lead not found or access denied
        """
        lead = session.get(Lead, lead_id)

        if not lead:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Lead {lead_id} not found"
            )

        if lead.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You don't own this lead"
            )

        return lead

    @staticmethod
    def list_leads(
        session: Session,
        user_id: str,
        skip: int = 0,
        limit: int = 50,
        company: Optional[str] = None,
        job_title: Optional[str] = None,
        has_replied: Optional[bool] = None,
        search: Optional[str] = None,
        created_after: Optional[datetime] = None,
        created_before: Optional[datetime] = None
    ) -> tuple[List[Lead], int]:
        """
        List leads for a user with pagination and filtering.

        Args:
            session: Database session
            user_id: User ID
            skip: Number of records to skip
            limit: Maximum number of records to return
            company: Filter by company (case-insensitive partial match)
            job_title: Filter by job title (case-insensitive partial match)
            has_replied: Filter by reply status
            search: Search in name and email
            created_after: Filter by creation date (after)
            created_before: Filter by creation date (before)

        Returns:
            Tuple of (leads list, total count)
        """
        # Build query
        query = select(Lead).where(Lead.user_id == user_id)

        # Apply filters
        if company:
            query = query.where(Lead.company.ilike(f"%{company}%"))

        if job_title:
            query = query.where(Lead.job_title.ilike(f"%{job_title}%"))

        if has_replied is not None:
            query = query.where(Lead.has_replied == has_replied)

        if search:
            search_pattern = f"%{search}%"
            query = query.where(
                or_(
                    Lead.first_name.ilike(search_pattern),
                    Lead.last_name.ilike(search_pattern),
                    Lead.full_name.ilike(search_pattern),
                    Lead.email.ilike(search_pattern),
                    Lead.company.ilike(search_pattern)
                )
            )

        if created_after:
            query = query.where(Lead.created_at >= created_after)

        if created_before:
            query = query.where(Lead.created_at <= created_before)

        # Get total count
        count_query = select(func.count()).select_from(Lead).where(Lead.user_id == user_id)
        
        # Apply same filters to count
        if company:
            count_query = count_query.where(Lead.company.ilike(f"%{company}%"))
        if job_title:
            count_query = count_query.where(Lead.job_title.ilike(f"%{job_title}%"))
        if has_replied is not None:
            count_query = count_query.where(Lead.has_replied == has_replied)
        if search:
            search_pattern = f"%{search}%"
            count_query = count_query.where(
                or_(
                    Lead.first_name.ilike(search_pattern),
                    Lead.last_name.ilike(search_pattern),
                    Lead.full_name.ilike(search_pattern),
                    Lead.email.ilike(search_pattern),
                    Lead.company.ilike(search_pattern)
                )
            )
        if created_after:
            count_query = count_query.where(Lead.created_at >= created_after)
        if created_before:
            count_query = count_query.where(Lead.created_at <= created_before)

        total = session.exec(count_query).one()

        # Get paginated results
        query = query.order_by(Lead.created_at.desc()).offset(skip).limit(limit)
        leads = session.exec(query).all()

        return list(leads), total

    @staticmethod
    def update_lead(
        session: Session,
        lead_id: str,
        user_id: str,
        update_data: LeadUpdate
    ) -> Lead:
        """
        Update lead fields.

        Args:
            session: Database session
            lead_id: Lead ID
            user_id: User ID for ownership check
            update_data: Update data

        Returns:
            Updated lead

        Raises:
            HTTPException: On validation or access errors
        """
        lead = LeadService.get_lead(session, lead_id, user_id)

        # Check for duplicate email if email is being updated
        update_dict = update_data.model_dump(exclude_unset=True)
        
        if "email" in update_dict and update_dict["email"] != lead.email:
            existing = session.exec(
                select(Lead).where(
                    Lead.user_id == user_id,
                    Lead.email == update_dict["email"],
                    Lead.id != lead_id
                )
            ).first()

            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"A lead with email {update_dict['email']} already exists"
                )

        # Convert URLs to strings if needed
        if "linkedin_url" in update_dict and update_dict["linkedin_url"]:
            update_dict["linkedin_url"] = str(update_dict["linkedin_url"])
        if "website" in update_dict and update_dict["website"]:
            update_dict["website"] = str(update_dict["website"])

        # Apply updates
        for field, value in update_dict.items():
            setattr(lead, field, value)

        lead.updated_at = datetime.utcnow()

        try:
            session.add(lead)
            session.commit()
            session.refresh(lead)
            return lead

        except Exception as e:
            session.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update lead: {str(e)}"
            )

    @staticmethod
    def delete_lead(
        session: Session,
        lead_id: str,
        user_id: str
    ) -> None:
        """
        Delete a lead.

        Args:
            session: Database session
            lead_id: Lead ID
            user_id: User ID for ownership check

        Raises:
            HTTPException: On access or database errors
        """
        lead = LeadService.get_lead(session, lead_id, user_id)

        try:
            session.delete(lead)
            session.commit()

        except Exception as e:
            session.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete lead: {str(e)}"
            )

    @staticmethod
    def bulk_create_leads(
        session: Session,
        leads_data: List[LeadCreate],
        user_id: str,
        skip_duplicates: bool = True
    ) -> Dict[str, Any]:
        """
        Bulk create leads.

        Args:
            session: Database session
            leads_data: List of lead creation data
            user_id: Owner user ID
            skip_duplicates: If True, skip duplicate emails; if False, raise error

        Returns:
            Dictionary with success/failure counts and details

        Raises:
            HTTPException: On validation errors
        """
        if len(leads_data) > 1000:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Maximum 1000 leads allowed per bulk request"
            )

        results = {
            "total": len(leads_data),
            "created": 0,
            "skipped": 0,
            "errors": []
        }

        # Get existing emails for this user
        existing_emails = set(
            session.exec(
                select(Lead.email).where(Lead.user_id == user_id)
            ).all()
        )

        try:
            for idx, lead_data in enumerate(leads_data):
                try:
                    # Check for duplicate
                    if lead_data.email in existing_emails:
                        if skip_duplicates:
                            results["skipped"] += 1
                            results["errors"].append({
                                "index": idx,
                                "email": lead_data.email,
                                "reason": "Duplicate email"
                            })
                            continue
                        else:
                            raise HTTPException(
                                status_code=status.HTTP_409_CONFLICT,
                                detail=f"Duplicate email: {lead_data.email}"
                            )

                    # Prepare lead data
                    lead_dict = lead_data.model_dump(exclude_unset=True)
                    
                    # Convert URLs
                    if "linkedin_url" in lead_dict and lead_dict["linkedin_url"]:
                        lead_dict["linkedin_url"] = str(lead_dict["linkedin_url"])
                    if "website" in lead_dict and lead_dict["website"]:
                        lead_dict["website"] = str(lead_dict["website"])

                    # Add required fields
                    lead_dict["id"] = str(uuid4())
                    lead_dict["user_id"] = user_id
                    lead_dict["has_replied"] = False
                    lead_dict["created_at"] = datetime.utcnow()
                    lead_dict["updated_at"] = datetime.utcnow()

                    # Create lead
                    lead = Lead(**lead_dict)
                    session.add(lead)
                    
                    # Add to existing emails set
                    existing_emails.add(lead_data.email)
                    results["created"] += 1

                except HTTPException:
                    raise
                except Exception as e:
                    results["skipped"] += 1
                    results["errors"].append({
                        "index": idx,
                        "email": lead_data.email if hasattr(lead_data, 'email') else 'unknown',
                        "reason": str(e)
                    })

            session.commit()
            return results

        except HTTPException:
            session.rollback()
            raise
        except Exception as e:
            session.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Bulk operation failed: {str(e)}"
            )

    @staticmethod
    def bulk_delete_leads(
        session: Session,
        lead_ids: List[str],
        user_id: str
    ) -> Dict[str, Any]:
        """
        Bulk delete leads.

        Args:
            session: Database session
            lead_ids: List of lead IDs to delete
            user_id: User ID for ownership check

        Returns:
            Dictionary with deletion results
        """
        results = {
            "total": len(lead_ids),
            "deleted": 0,
            "skipped": 0,
            "errors": []
        }

        try:
            for lead_id in lead_ids:
                try:
                    lead = session.get(Lead, lead_id)
                    
                    if not lead:
                        results["skipped"] += 1
                        results["errors"].append({
                            "lead_id": lead_id,
                            "reason": "Lead not found"
                        })
                        continue

                    if lead.user_id != user_id:
                        results["skipped"] += 1
                        results["errors"].append({
                            "lead_id": lead_id,
                            "reason": "Access denied"
                        })
                        continue

                    session.delete(lead)
                    results["deleted"] += 1

                except Exception as e:
                    results["skipped"] += 1
                    results["errors"].append({
                        "lead_id": lead_id,
                        "reason": str(e)
                    })

            session.commit()
            return results

        except Exception as e:
            session.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Bulk delete failed: {str(e)}"
            )

    @staticmethod
    async def import_from_csv(
        session: Session,
        file: UploadFile,
        user_id: str,
        skip_duplicates: bool = True
    ) -> Dict[str, Any]:
        """
        Import leads from CSV file.

        Args:
            session: Database session
            file: Uploaded CSV file
            user_id: Owner user ID
            skip_duplicates: Skip duplicate emails

        Returns:
            Import results with counts and errors

        Raises:
            HTTPException: On file or validation errors
        """
        # Validate file type
        if not file.filename.endswith('.csv'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be a CSV file"
            )

        try:
            # Read file content
            content = await file.read()
            csv_content = content.decode('utf-8')
            
            # Parse CSV
            csv_reader = csv.DictReader(StringIO(csv_content))
            
            # Validate headers
            required_fields = ['email']
            if not all(field in csv_reader.fieldnames for field in required_fields):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"CSV must contain required columns: {required_fields}"
                )

            # Convert rows to lead data
            leads_data = []
            for row_num, row in enumerate(csv_reader, start=2):  # Start at 2 (header is row 1)
                try:
                    lead_data = LeadCreate(
                        email=row.get('email'),
                        first_name=row.get('first_name'),
                        last_name=row.get('last_name'),
                        full_name=row.get('full_name'),
                        company=row.get('company'),
                        job_title=row.get('job_title'),
                        linkedin_url=row.get('linkedin_url'),
                        website=row.get('website'),
                        custom_fields={}
                    )
                    leads_data.append(lead_data)
                except Exception as e:
                    # Skip invalid rows but continue processing
                    continue

            if len(leads_data) > 10000:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="Maximum 10,000 rows allowed per CSV import"
                )

            # Use bulk create
            results = LeadService.bulk_create_leads(
                session=session,
                leads_data=leads_data,
                user_id=user_id,
                skip_duplicates=skip_duplicates
            )

            return {
                "total_rows": len(leads_data),
                "imported": results["created"],
                "skipped": results["skipped"],
                "errors": results["errors"]
            }

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to import CSV: {str(e)}"
            )

    @staticmethod
    def export_to_csv(
        session: Session,
        user_id: str,
        **filters
    ) -> str:
        """
        Export leads to CSV format.

        Args:
            session: Database session
            user_id: User ID
            **filters: Optional filters (same as list_leads)

        Returns:
            CSV content as string
        """
        # Get all leads (no pagination for export)
        leads, _ = LeadService.list_leads(
            session=session,
            user_id=user_id,
            skip=0,
            limit=100000,  # Large limit for export
            **filters
        )

        # Generate CSV
        output = StringIO()
        fieldnames = [
            'email', 'first_name', 'last_name', 'full_name',
            'company', 'job_title', 'linkedin_url', 'website',
            'has_replied', 'replied_at', 'created_at'
        ]
        
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()

        for lead in leads:
            writer.writerow({
                'email': lead.email,
                'first_name': lead.first_name or '',
                'last_name': lead.last_name or '',
                'full_name': lead.full_name or '',
                'company': lead.company or '',
                'job_title': lead.job_title or '',
                'linkedin_url': lead.linkedin_url or '',
                'website': lead.website or '',
                'has_replied': lead.has_replied,
                'replied_at': lead.replied_at.isoformat() if lead.replied_at else '',
                'created_at': lead.created_at.isoformat()
            })

        return output.getvalue()
