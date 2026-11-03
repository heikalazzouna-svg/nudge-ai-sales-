from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import uuid4

from sqlmodel import Session, select, delete, func, and_, or_
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status

from app.models.campaign import Campaign, CampaignLead
from app.models.lead import Lead
from app.models.enums import CampaignStatus, CampaignLeadStatus, EmailStatus
from app.models.email import EmailLog
from app.schemas.campaign import (
    CampaignCreate,
    CampaignUpdate,
    CampaignStats,
)


class CampaignService:
    """Service class for campaign operations."""

    @staticmethod
    def create_campaign(
        session: Session,
        campaign_data: CampaignCreate,
        user_id: str
    ) -> Campaign:
        """
        Create a new campaign.

        Args:
            session: Database session
            campaign_data: Campaign creation data
            user_id: Owner user ID

        Returns:
            Created campaign

        Raises:
            HTTPException: On validation or database errors
        """
        try:
            campaign_dict = campaign_data.model_dump(exclude_unset=True)
            
            campaign_dict["id"] = str(uuid4())
            campaign_dict["user_id"] = user_id
            campaign_dict["status"] = CampaignStatus.DRAFT
            campaign_dict["created_at"] = datetime.utcnow()
            campaign_dict["updated_at"] = datetime.utcnow()

            campaign = Campaign(**campaign_dict)
            session.add(campaign)
            session.commit()
            session.refresh(campaign)

            return campaign

        except IntegrityError as e:
            session.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Database integrity error: {str(e)}"
            )
        except Exception as e:
            session.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create campaign: {str(e)}"
            )

    @staticmethod
    def get_campaign(
        session: Session,
        campaign_id: str,
        user_id: str
    ) -> Campaign:
        """
        Get a campaign by ID with ownership validation.

        Args:
            session: Database session
            campaign_id: Campaign ID
            user_id: User ID for ownership check

        Returns:
            Campaign instance

        Raises:
            HTTPException: If campaign not found or access denied
        """
        campaign = session.get(Campaign, campaign_id)

        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Campaign {campaign_id} not found"
            )

        if campaign.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You don't own this campaign"
            )

        return campaign

    @staticmethod
    def list_campaigns(
        session: Session,
        user_id: str,
        status_filter: Optional[CampaignStatus] = None,
        skip: int = 0,
        limit: int = 50
    ) -> tuple[List[Campaign], int]:
        """
        List campaigns for a user with pagination and filtering.

        Args:
            session: Database session
            user_id: User ID
            status_filter: Optional status filter
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            Tuple of (campaigns list, total count)
        """
        # Build query
        query = select(Campaign).where(Campaign.user_id == user_id)

        if status_filter:
            query = query.where(Campaign.status == status_filter)

        # Get total count
        count_query = select(func.count()).select_from(Campaign).where(
            Campaign.user_id == user_id
        )
        if status_filter:
            count_query = count_query.where(Campaign.status == status_filter)

        total = session.exec(count_query).one()

        # Get paginated results
        query = query.order_by(Campaign.created_at.desc()).offset(skip).limit(limit)
        campaigns = session.exec(query).all()

        return list(campaigns), total

    @staticmethod
    def update_campaign(
        session: Session,
        campaign_id: str,
        user_id: str,
        update_data: CampaignUpdate
    ) -> Campaign:
        """
        Update campaign fields.

        Args:
            session: Database session
            campaign_id: Campaign ID
            user_id: User ID for ownership check
            update_data: Update data

        Returns:
            Updated campaign

        Raises:
            HTTPException: On validation or access errors
        """
        campaign = CampaignService.get_campaign(session, campaign_id, user_id)

        # Validate status transitions
        update_dict = update_data.model_dump(exclude_unset=True)

        if "status" in update_dict:
            new_status = update_dict["status"]
            CampaignService._validate_status_transition(campaign.status, new_status)

        # Apply updates
        for field, value in update_dict.items():
            setattr(campaign, field, value)

        campaign.updated_at = datetime.utcnow()

        try:
            session.add(campaign)
            session.commit()
            session.refresh(campaign)
            return campaign

        except Exception as e:
            session.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update campaign: {str(e)}"
            )

    @staticmethod
    def delete_campaign(
        session: Session,
        campaign_id: str,
        user_id: str
    ) -> None:
        """
        Delete a campaign and its associated campaign leads.

        Args:
            session: Database session
            campaign_id: Campaign ID
            user_id: User ID for ownership check

        Raises:
            HTTPException: On access or database errors
        """
        campaign = CampaignService.get_campaign(session, campaign_id, user_id)

        try:
            # Delete associated campaign leads first (using bulk delete)
            session.exec(
                delete(CampaignLead).where(CampaignLead.campaign_id == campaign_id)
            )

            session.delete(campaign)
            session.commit()

        except Exception as e:
            session.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete campaign: {str(e)}"
            )

    @staticmethod
    def get_campaign_stats(
        session: Session,
        campaign_id: str,
        user_id: str
    ) -> CampaignStats:
        """
        Get campaign statistics.

        Args:
            session: Database session
            campaign_id: Campaign ID
            user_id: User ID for ownership check

        Returns:
            Campaign statistics

        Raises:
            HTTPException: On access errors
        """
        # Verify ownership
        CampaignService.get_campaign(session, campaign_id, user_id)

        # Get status counts
        stats_query = (
            select(
                CampaignLead.status,
                func.count(CampaignLead.id).label("count")
            )
            .where(CampaignLead.campaign_id == campaign_id)
            .group_by(CampaignLead.status)
        )

        results = session.exec(stats_query).all()

        # Initialize stats
        stats_dict = {
            "total_leads": 0,
            "pending": 0,
            "active": 0,
            "completed": 0,
            "replied": 0,
            "bounced": 0,
            "unsubscribed": 0,
        }

        # Aggregate results
        for status, count in results:
            stats_dict["total_leads"] += count

            if status == CampaignLeadStatus.PENDING:
                stats_dict["pending"] = count
            elif status == CampaignLeadStatus.ACTIVE:
                stats_dict["active"] = count
            elif status == CampaignLeadStatus.COMPLETED:
                stats_dict["completed"] = count
            elif status == CampaignLeadStatus.REPLIED:
                stats_dict["replied"] = count
            elif status == CampaignLeadStatus.BOUNCED:
                stats_dict["bounced"] = count
            elif status == CampaignLeadStatus.UNSUBSCRIBED:
                stats_dict["unsubscribed"] = count

        # Get email stats
        email_stats_query = (
            select(
                EmailLog.status,
                func.count(EmailLog.id).label("count")
            )
            .join(CampaignLead, EmailLog.campaign_lead_id == CampaignLead.id)
            .where(CampaignLead.campaign_id == campaign_id)
            .group_by(EmailLog.status)
        )
        
        email_results = session.exec(email_stats_query).all()
        
        # Initialize email stats
        email_counts = {
            "sent": 0,
            "opened": 0,
            "clicked": 0,
            "bounced": 0
        }
        
        for status, count in email_results:
            # Count all attempted sends as "sent" (including sending, bounced, failed)
            if status in [
                EmailStatus.SENDING, 
                EmailStatus.SENT, 
                EmailStatus.DELIVERED, 
                EmailStatus.OPENED, 
                EmailStatus.CLICKED, 
                EmailStatus.REPLIED,
                EmailStatus.BOUNCED,
                EmailStatus.FAILED
            ]:
                email_counts["sent"] += count
            
            if status in [EmailStatus.OPENED, EmailStatus.CLICKED, EmailStatus.REPLIED]:
                email_counts["opened"] += count
                
            if status in [EmailStatus.CLICKED, EmailStatus.REPLIED]:
                email_counts["clicked"] += count
                
            if status == EmailStatus.BOUNCED:
                email_counts["bounced"] += count

        stats_dict["emails_sent"] = email_counts["sent"]
        stats_dict["emails_opened"] = email_counts["opened"]
        stats_dict["emails_clicked"] = email_counts["clicked"]
        stats_dict["emails_bounced"] = email_counts["bounced"]

        return CampaignStats(**stats_dict)

    @staticmethod
    def add_lead_to_campaign(
        session: Session,
        campaign_id: str,
        lead_id: str,
        user_id: str
    ) -> CampaignLead:
        """
        Add a lead to a campaign.

        Args:
            session: Database session
            campaign_id: Campaign ID
            lead_id: Lead ID
            user_id: User ID for ownership check

        Returns:
            Created CampaignLead

        Raises:
            HTTPException: On validation or duplicate errors
        """
        # Verify campaign ownership
        campaign = CampaignService.get_campaign(session, campaign_id, user_id)

        # Validate campaign status
        if campaign.status in [CampaignStatus.COMPLETED, CampaignStatus.ARCHIVED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot add leads to {campaign.status.value} campaign"
            )

        # Verify lead exists and belongs to user
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

        # Check for duplicate
        existing = session.exec(
            select(CampaignLead).where(
                and_(
                    CampaignLead.campaign_id == campaign_id,
                    CampaignLead.lead_id == lead_id
                )
            )
        ).first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Lead already assigned to this campaign"
            )

        # Create campaign lead
        try:
            campaign_lead = CampaignLead(
                id=str(uuid4()),
                campaign_id=campaign_id,
                lead_id=lead_id,
                status=CampaignLeadStatus.PENDING,
                current_step=0,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )

            session.add(campaign_lead)
            session.commit()
            session.refresh(campaign_lead)

            return campaign_lead

        except IntegrityError as e:
            session.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Lead already assigned to this campaign"
            )
        except Exception as e:
            session.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to add lead to campaign: {str(e)}"
            )

    @staticmethod
    def add_leads_bulk(
        session: Session,
        campaign_id: str,
        lead_ids: List[str],
        user_id: str
    ) -> Dict[str, Any]:
        """
        Add multiple leads to a campaign in bulk.

        Args:
            session: Database session
            campaign_id: Campaign ID
            lead_ids: List of lead IDs
            user_id: User ID for ownership check

        Returns:
            Dictionary with success/failure counts and details

        Raises:
            HTTPException: On validation errors
        """
        # Verify campaign ownership
        campaign = CampaignService.get_campaign(session, campaign_id, user_id)

        # Validate campaign status
        if campaign.status in [CampaignStatus.COMPLETED, CampaignStatus.ARCHIVED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot add leads to {campaign.status.value} campaign"
            )

        results = {
            "total": len(lead_ids),
            "added": 0,
            "skipped": 0,
            "errors": []
        }

        try:
            for lead_id in lead_ids:
                try:
                    # Verify lead exists and belongs to user
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

                    # Check for duplicate
                    existing = session.exec(
                        select(CampaignLead).where(
                            and_(
                                CampaignLead.campaign_id == campaign_id,
                                CampaignLead.lead_id == lead_id
                            )
                        )
                    ).first()

                    if existing:
                        results["skipped"] += 1
                        results["errors"].append({
                            "lead_id": lead_id,
                            "reason": "Already assigned"
                        })
                        continue

                    # Create campaign lead
                    campaign_lead = CampaignLead(
                        id=str(uuid4()),
                        campaign_id=campaign_id,
                        lead_id=lead_id,
                        status=CampaignLeadStatus.PENDING,
                        current_step=0,
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )

                    session.add(campaign_lead)
                    results["added"] += 1

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
                detail=f"Bulk operation failed: {str(e)}"
            )

    @staticmethod
    def remove_lead_from_campaign(
        session: Session,
        campaign_id: str,
        lead_id: str,
        user_id: str
    ) -> None:
        """
        Remove a lead from a campaign.

        Args:
            session: Database session
            campaign_id: Campaign ID
            lead_id: Lead ID
            user_id: User ID for ownership check

        Raises:
            HTTPException: On validation or not found errors
        """
        # Verify campaign ownership
        CampaignService.get_campaign(session, campaign_id, user_id)

        # Find campaign lead
        campaign_lead = session.exec(
            select(CampaignLead).where(
                and_(
                    CampaignLead.campaign_id == campaign_id,
                    CampaignLead.lead_id == lead_id
                )
            )
        ).first()

        if not campaign_lead:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lead not found in this campaign"
            )

        try:
            session.delete(campaign_lead)
            session.commit()

        except Exception as e:
            session.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to remove lead from campaign: {str(e)}"
            )

    @staticmethod
    def start_campaign(
        session: Session,
        campaign_id: str,
        user_id: str
    ) -> Campaign:
        """
        Start a campaign (DRAFT → ACTIVE).

        Args:
            session: Database session
            campaign_id: Campaign ID
            user_id: User ID for ownership check

        Returns:
            Updated campaign

        Raises:
            HTTPException: On validation errors
        """
        campaign = CampaignService.get_campaign(session, campaign_id, user_id)

        # Validate current status
        if campaign.status != CampaignStatus.DRAFT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot start campaign with status {campaign.status.value}"
            )

        # Check if campaign has leads
        lead_count = session.exec(
            select(func.count(CampaignLead.id)).where(
                CampaignLead.campaign_id == campaign_id
            )
        ).one()

        if lead_count == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot start campaign without leads"
            )

        try:
            campaign.status = CampaignStatus.ACTIVE
            campaign.updated_at = datetime.utcnow()

            session.add(campaign)
            session.commit()
            session.refresh(campaign)

            return campaign

        except Exception as e:
            session.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to start campaign: {str(e)}"
            )

    @staticmethod
    def pause_campaign(
        session: Session,
        campaign_id: str,
        user_id: str
    ) -> Campaign:
        """
        Pause a campaign (ACTIVE → PAUSED).

        Args:
            session: Database session
            campaign_id: Campaign ID
            user_id: User ID for ownership check

        Returns:
            Updated campaign

        Raises:
            HTTPException: On validation errors
        """
        campaign = CampaignService.get_campaign(session, campaign_id, user_id)

        # Validate current status
        if campaign.status != CampaignStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot pause campaign with status {campaign.status.value}"
            )

        try:
            campaign.status = CampaignStatus.PAUSED
            campaign.paused_at = datetime.utcnow()
            campaign.paused_by = user_id
            campaign.updated_at = datetime.utcnow()

            session.add(campaign)
            session.commit()
            session.refresh(campaign)

            return campaign

        except Exception as e:
            session.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to pause campaign: {str(e)}"
            )

    @staticmethod
    def resume_campaign(
        session: Session,
        campaign_id: str,
        user_id: str
    ) -> Campaign:
        """
        Resume a paused campaign (PAUSED → ACTIVE).

        Args:
            session: Database session
            campaign_id: Campaign ID
            user_id: User ID for ownership check

        Returns:
            Updated campaign

        Raises:
            HTTPException: On validation errors
        """
        campaign = CampaignService.get_campaign(session, campaign_id, user_id)

        # Validate current status
        if campaign.status != CampaignStatus.PAUSED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot resume campaign with status {campaign.status.value}"
            )

        try:
            campaign.status = CampaignStatus.ACTIVE
            campaign.paused_at = None
            campaign.paused_by = None
            campaign.updated_at = datetime.utcnow()

            session.add(campaign)
            session.commit()
            session.refresh(campaign)

            return campaign

        except Exception as e:
            session.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to resume campaign: {str(e)}"
            )

    @staticmethod
    def complete_campaign(
        session: Session,
        campaign_id: str,
        user_id: str
    ) -> Campaign:
        """
        Mark a campaign as completed (ACTIVE → COMPLETED).

        Args:
            session: Database session
            campaign_id: Campaign ID
            user_id: User ID for ownership check

        Returns:
            Updated campaign

        Raises:
            HTTPException: On validation errors
        """
        campaign = CampaignService.get_campaign(session, campaign_id, user_id)

        # Validate current status
        if campaign.status not in [CampaignStatus.ACTIVE, CampaignStatus.PAUSED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot complete campaign with status {campaign.status.value}"
            )

        try:
            campaign.status = CampaignStatus.COMPLETED
            campaign.updated_at = datetime.utcnow()

            session.add(campaign)
            session.commit()
            session.refresh(campaign)

            return campaign

        except Exception as e:
            session.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to complete campaign: {str(e)}"
            )

    @staticmethod
    def _validate_status_transition(
        current_status: CampaignStatus,
        new_status: CampaignStatus
    ) -> None:
        """
        Validate campaign status transitions.

        Args:
            current_status: Current campaign status
            new_status: Desired new status

        Raises:
            HTTPException: If transition is invalid
        """
        # Define valid transitions
        valid_transitions = {
            CampaignStatus.DRAFT: [CampaignStatus.ACTIVE, CampaignStatus.ARCHIVED],
            CampaignStatus.ACTIVE: [CampaignStatus.PAUSED, CampaignStatus.COMPLETED],
            CampaignStatus.PAUSED: [CampaignStatus.ACTIVE, CampaignStatus.COMPLETED],
            CampaignStatus.COMPLETED: [CampaignStatus.ARCHIVED],
            CampaignStatus.ARCHIVED: [],
        }

        if new_status not in valid_transitions.get(current_status, []):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status transition: {current_status.value} → {new_status.value}"
            )
