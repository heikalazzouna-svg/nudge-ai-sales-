import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlmodel import Session, select
from app.core.database import engine
from app.models.lead import Lead
from app.models.campaign import CampaignLead, Campaign
from app.models.enums import CampaignLeadStatus, CampaignStatus

# Configure logging
logger = logging.getLogger(__name__)


def check_if_lead_replied(lead_id: str) -> bool:
    """
    Check if a lead has replied.

    Args:
        lead_id: Lead ID to check

    Returns:
        True if lead has replied, False otherwise
    """
    try:
        with Session(engine) as session:
            lead = session.get(Lead, lead_id)
            if not lead:
                logger.warning(f"Lead {lead_id} not found when checking reply status")
                return False
            return lead.has_replied

    except Exception as e:
        logger.error(f"Error checking if lead {lead_id} replied: {e}")
        return False


def update_campaign_lead_status(
    campaign_lead_id: str,
    status: CampaignLeadStatus,
    inngest_run_id: Optional[str] = None,
    next_step_at: Optional[datetime] = None,
    current_step: Optional[int] = None
) -> bool:
    """
    Update campaign lead status and workflow metadata.

    This is an idempotent operation - calling with the same parameters
    multiple times will have the same effect.

    Args:
        campaign_lead_id: Campaign lead ID
        status: New status to set
        inngest_run_id: Optional Inngest run ID for tracking
        next_step_at: Optional timestamp for next workflow step
        current_step: Optional current step number in sequence

    Returns:
        True if update successful, False otherwise
    """
    try:
        with Session(engine) as session:
            campaign_lead = session.get(CampaignLead, campaign_lead_id)
            if not campaign_lead:
                logger.error(f"Campaign lead {campaign_lead_id} not found")
                return False

            # Update core status
            campaign_lead.status = status
            campaign_lead.updated_at = datetime.utcnow()

            # Update optional workflow metadata
            if inngest_run_id is not None:
                campaign_lead.inngest_run_id = inngest_run_id

            if next_step_at is not None:
                campaign_lead.next_step_at = next_step_at

            if current_step is not None:
                campaign_lead.current_step = current_step

            # Set completion timestamps based on status
            if status == CampaignLeadStatus.COMPLETED:
                campaign_lead.completed_at = datetime.utcnow()
            elif status == CampaignLeadStatus.REPLIED:
                campaign_lead.replied_at = datetime.utcnow()

            session.add(campaign_lead)
            session.commit()

            logger.info(
                f"Updated campaign lead {campaign_lead_id} status to {status.value}"
            )
            return True

    except Exception as e:
        logger.error(f"Error updating campaign lead {campaign_lead_id} status: {e}")
        return False


def mark_campaign_lead_error(
    campaign_lead_id: str,
    error_message: str
) -> bool:
    """
    Mark a campaign lead with an error.

    Increments error count and stores error message. If error count
    exceeds threshold (3), marks lead for manual review.

    Args:
        campaign_lead_id: Campaign lead ID
        error_message: Error message to record

    Returns:
        True if update successful, False otherwise
    """
    try:
        with Session(engine) as session:
            campaign_lead = session.get(CampaignLead, campaign_lead_id)
            if not campaign_lead:
                logger.error(f"Campaign lead {campaign_lead_id} not found for error marking")
                return False

            campaign_lead.last_error = error_message
            campaign_lead.error_count += 1
            campaign_lead.updated_at = datetime.utcnow()

            # If too many errors, mark as needs review
            if campaign_lead.error_count >= 3:
                campaign_lead.status = CampaignLeadStatus.NEEDS_REVIEW
                logger.warning(
                    f"Campaign lead {campaign_lead_id} marked as NEEDS_REVIEW "
                    f"after {campaign_lead.error_count} errors"
                )

            session.add(campaign_lead)
            session.commit()

            logger.info(
                f"Recorded error for campaign lead {campaign_lead_id}: {error_message[:50]}..."
            )
            return True

    except Exception as e:
        logger.error(f"Error marking campaign lead {campaign_lead_id} error: {e}")
        return False


def check_campaign_active(campaign_id: str) -> bool:
    """
    Check if a campaign is active.

    Used by workflows to verify campaign hasn't been paused or completed
    before proceeding with next steps.

    Args:
        campaign_id: Campaign ID to check

    Returns:
        True if campaign is active, False otherwise
    """
    try:
        with Session(engine) as session:
            campaign = session.get(Campaign, campaign_id)
            if not campaign:
                logger.warning(f"Campaign {campaign_id} not found")
                return False
            return campaign.status == CampaignStatus.ACTIVE

    except Exception as e:
        logger.error(f"Error checking campaign {campaign_id} status: {e}")
        return False


def get_campaign_lead_by_id(campaign_lead_id: str) -> Optional[Dict[str, Any]]:
    """
    Get campaign lead information by ID.

    Args:
        campaign_lead_id: Campaign lead ID

    Returns:
        Dictionary with campaign lead data or None
    """
    try:
        with Session(engine) as session:
            campaign_lead = session.get(CampaignLead, campaign_lead_id)
            if not campaign_lead:
                return None

            return {
                "id": campaign_lead.id,
                "campaign_id": campaign_lead.campaign_id,
                "lead_id": campaign_lead.lead_id,
                "status": campaign_lead.status,
                "current_step": campaign_lead.current_step,
                "error_count": campaign_lead.error_count,
                "inngest_run_id": campaign_lead.inngest_run_id,
                "next_step_at": campaign_lead.next_step_at.isoformat() if campaign_lead.next_step_at else None
            }

    except Exception as e:
        logger.error(f"Error getting campaign lead {campaign_lead_id}: {e}")
        return None


def get_campaign_leads_for_workflow(campaign_id: str) -> List[Dict[str, Any]]:
    """
    Get all pending campaign leads for a campaign.

    Used when starting a campaign to get all leads that need
    to be processed by the workflow.

    Args:
        campaign_id: Campaign ID

    Returns:
        List of campaign lead dictionaries with lead details
    """
    try:
        with Session(engine) as session:
            campaign_leads = session.exec(
                select(CampaignLead, Lead)
                .join(Lead, CampaignLead.lead_id == Lead.id)
                .where(
                    CampaignLead.campaign_id == campaign_id,
                    CampaignLead.status == CampaignLeadStatus.PENDING
                )
            ).all()

            results = []
            for campaign_lead, lead in campaign_leads:
                results.append({
                    "campaign_lead_id": campaign_lead.id,
                    "lead": {
                        "id": lead.id,
                        "email": lead.email,
                        "first_name": lead.first_name or "there",
                        "company": lead.company or "your company"
                    }
                })

            logger.info(
                f"Found {len(results)} pending leads for campaign {campaign_id}"
            )
            return results

    except Exception as e:
        logger.error(f"Error getting campaign leads for {campaign_id}: {e}")
        return []


def get_campaign_config(campaign_id: str) -> Optional[Dict[str, Any]]:
    """
    Get campaign configuration for workflow.

    Args:
        campaign_id: Campaign ID

    Returns:
        Dictionary with campaign configuration or None
    """
    try:
        with Session(engine) as session:
            campaign = session.get(Campaign, campaign_id)
            if not campaign:
                return None

            return {
                "id": campaign.id,
                "name": campaign.name,
                "target_audience": campaign.target_audience or "",
                "value_proposition": campaign.value_proposition or "",
                "tone": campaign.tone or "professional"
            }

    except Exception as e:
        logger.error(f"Error getting campaign config for {campaign_id}: {e}")
        return None
