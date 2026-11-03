import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlmodel import Session, select
from app.core.database import engine
from app.models.lead import Lead
from app.models.campaign import CampaignLead, Campaign
from app.models.lead import Lead
from app.models.email import EmailLog
from app.models.enums import CampaignLeadStatus, CampaignStatus, EmailStatus

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
                "tone": campaign.tone or "professional",
                "from_email": campaign.from_email
            }

    except Exception as e:
        logger.error(f"Error getting campaign config for {campaign_id}: {e}")
        return None


def create_email_log(
    campaign_lead_id: str,
    step_id: str,
    step_number: int,
    to_email: str,
    from_email: str,
    subject: str,
    body: str,
    resend_id: Optional[str] = None,
    status: Optional[EmailStatus] = None
) -> Optional[str]:
    """
    Create a new email log entry.

    Args:
        campaign_lead_id: Campaign lead ID
        step_id: Unique step ID
        step_number: Step number in sequence
        to_email: Recipient email
        from_email: Sender email
        subject: Email subject
        body: Email body
        resend_id: Resend API ID (optional, can be set later)
        status: Initial status (defaults to QUEUED if no resend_id, SENT if has resend_id)

    Returns:
        Email log ID if created, None otherwise
    """
    try:
        from uuid import uuid4
        
        # Determine initial status
        if status is not None:
            initial_status = status
        elif resend_id:
            initial_status = EmailStatus.SENT
        else:
            initial_status = EmailStatus.QUEUED
        
        with Session(engine) as session:
            email_log = EmailLog(
                id=str(uuid4()),
                campaign_lead_id=campaign_lead_id,
                step_id=step_id,
                step_number=step_number,
                to_email=to_email,
                from_email=from_email,
                subject=subject,
                body=body,
                resend_id=resend_id,
                status=initial_status,
                sent_at=datetime.utcnow() if initial_status == EmailStatus.SENT else None
            )
            session.add(email_log)
            session.commit()
            
            logger.info(f"📧 Created email log {email_log.id} with status {initial_status.value}")
            return email_log.id
    except Exception as e:
        # Check for integrity error (duplicate entry)
        if "unique constraint" in str(e).lower() or "integrity" in str(e).lower():
            try:
                with Session(engine) as session:
                    existing_log = session.exec(
                        select(EmailLog).where(
                            EmailLog.campaign_lead_id == campaign_lead_id,
                            EmailLog.step_number == step_number
                        )
                    ).first()
                    if existing_log:
                        logger.info(f"📧 Found existing email log {existing_log.id} for lead {campaign_lead_id} step {step_number}")
                        return existing_log.id
            except Exception as inner_e:
                logger.error(f"Error fetching existing email log: {inner_e}")
        
        logger.error(f"Error creating email log: {e}")
        return None


def update_email_log_sending(
    email_log_id: str
) -> bool:
    """
    Mark email as SENDING (about to be sent to provider).

    Args:
        email_log_id: Email log ID

    Returns:
        True if updated, False otherwise
    """
    try:
        with Session(engine) as session:
            email_log = session.get(EmailLog, email_log_id)
            if not email_log:
                logger.warning(f"Email log not found: {email_log_id}")
                return False
            
            email_log.status = EmailStatus.SENDING
            email_log.updated_at = datetime.utcnow()
            session.add(email_log)
            session.commit()
            
            logger.debug(f"📤 Email {email_log_id} marked as SENDING")
            return True
    except Exception as e:
        logger.error(f"Error updating email to SENDING: {e}")
        return False


def update_email_log_sent(
    email_log_id: str,
    resend_id: str
) -> bool:
    """
    Mark email as SENT after successful API call.

    Args:
        email_log_id: Email log ID
        resend_id: Resend API email ID for webhook correlation

    Returns:
        True if updated, False otherwise
    """
    try:
        with Session(engine) as session:
            email_log = session.get(EmailLog, email_log_id)
            if not email_log:
                logger.warning(f"Email log not found: {email_log_id}")
                return False
            
            email_log.status = EmailStatus.SENT
            email_log.resend_id = resend_id
            email_log.sent_at = datetime.utcnow()
            email_log.updated_at = datetime.utcnow()
            session.add(email_log)
            session.commit()
            
            logger.info(f"✅ Email {email_log_id} marked as SENT (resend_id: {resend_id})")
            return True
    except Exception as e:
        logger.error(f"Error updating email to SENT: {e}")
        return False


def update_email_log_failed(
    email_log_id: str,
    error_message: str
) -> bool:
    """
    Mark email as FAILED after send error.

    Args:
        email_log_id: Email log ID
        error_message: Error description

    Returns:
        True if updated, False otherwise
    """
    try:
        with Session(engine) as session:
            email_log = session.get(EmailLog, email_log_id)
            if not email_log:
                logger.warning(f"Email log not found: {email_log_id}")
                return False
            
            email_log.status = EmailStatus.FAILED
            email_log.error_message = error_message[:500]  # Truncate long errors
            email_log.updated_at = datetime.utcnow()
            session.add(email_log)
            session.commit()
            
            logger.warning(f"❌ Email {email_log_id} marked as FAILED: {error_message[:100]}")
            return True
    except Exception as e:
        logger.error(f"Error updating email to FAILED: {e}")
        return False


def update_email_status(
    resend_id: str,
    status: EmailStatus,
    event_at: Optional[datetime] = None
) -> bool:
    """
    Update email status based on Resend ID (from webhook events).

    This function is called by webhook handlers when Resend sends
    delivery status updates.

    Args:
        resend_id: Resend email ID (from webhook payload)
        status: New status (DELIVERED, OPENED, CLICKED, REPLIED, BOUNCED)
        event_at: Timestamp of event (defaults to now)

    Returns:
        True if updated, False if email not found
    """
    try:
        with Session(engine) as session:
            email_log = session.exec(
                select(EmailLog).where(EmailLog.resend_id == resend_id)
            ).first()
            
            if not email_log:
                logger.debug(f"Email log not found for resend_id: {resend_id}")
                return False

            # Only update if the new status is "higher" in the lifecycle
            # This prevents webhooks arriving out of order from overwriting
            status_order = {
                EmailStatus.QUEUED: 0,
                EmailStatus.SENDING: 1,
                EmailStatus.SENT: 2,
                EmailStatus.DELIVERED: 3,
                EmailStatus.OPENED: 4,
                EmailStatus.CLICKED: 5,
                EmailStatus.REPLIED: 6,
                EmailStatus.BOUNCED: 99,  # Error state, always update
                EmailStatus.FAILED: 99,   # Error state, always update
            }
            
            current_order = status_order.get(email_log.status, 0)
            new_order = status_order.get(status, 0)
            
            # Skip if trying to go backwards (except for error states)
            if new_order < current_order and new_order < 99:
                logger.debug(
                    f"Skipping status update {email_log.status} -> {status} "
                    f"(out of order webhook)"
                )
                return True  # Return True since email exists
            
            email_log.status = status
            email_log.updated_at = datetime.utcnow()
            
            timestamp = event_at or datetime.utcnow()

            # Update specific timestamps based on status
            if status == EmailStatus.SENT:
                email_log.sent_at = email_log.sent_at or timestamp
            elif status == EmailStatus.DELIVERED:
                email_log.delivered_at = timestamp
            elif status == EmailStatus.OPENED:
                email_log.opened_at = email_log.opened_at or timestamp  # Keep first open
            elif status == EmailStatus.CLICKED:
                email_log.clicked_at = email_log.clicked_at or timestamp  # Keep first click
            elif status == EmailStatus.REPLIED:
                email_log.replied_at = timestamp
            elif status == EmailStatus.BOUNCED:
                email_log.bounced_at = timestamp
            
            session.add(email_log)
            session.commit()
            
            logger.info(f"📍 Email {resend_id} status updated to {status.value}")
            return True
            
    except Exception as e:
        logger.error(f"Error updating email status: {e}")
        return False


def get_email_log_by_resend_id(resend_id: str) -> Optional[Dict[str, Any]]:
    """
    Get email log by Resend ID.

    Args:
        resend_id: Resend email ID

    Returns:
        Email log data or None
    """
    try:
        with Session(engine) as session:
            email_log = session.exec(
                select(EmailLog).where(EmailLog.resend_id == resend_id)
            ).first()
            
            if not email_log:
                return None
            
            return {
                "id": email_log.id,
                "campaign_lead_id": email_log.campaign_lead_id,
                "to_email": email_log.to_email,
                "subject": email_log.subject,
                "status": email_log.status.value,
                "sent_at": email_log.sent_at.isoformat() if email_log.sent_at else None,
                "delivered_at": email_log.delivered_at.isoformat() if email_log.delivered_at else None,
                "opened_at": email_log.opened_at.isoformat() if email_log.opened_at else None,
                "clicked_at": email_log.clicked_at.isoformat() if email_log.clicked_at else None,
                "replied_at": email_log.replied_at.isoformat() if email_log.replied_at else None,
                "bounced_at": email_log.bounced_at.isoformat() if email_log.bounced_at else None,
            }
    except Exception as e:
        logger.error(f"Error getting email log: {e}")
        return None
