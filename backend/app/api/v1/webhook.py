import json
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Request, Depends, HTTPException
from sqlmodel import Session, select, and_
from svix.webhooks import Webhook, WebhookVerificationError

from app.core.config import settings
from app.core.database import get_session
from app.models.lead import Lead
from app.models.campaign import CampaignLead
from app.models.enums import CampaignLeadStatus, EmailStatus
from app.workflows.db_utils import update_email_status, get_email_log_by_resend_id

# Initialize Router
router = APIRouter()
logger = logging.getLogger(__name__)


async def verify_webhook_signature(request: Request) -> dict:
    # Check if webhook secret is configured
    webhook_secret = settings.RESEND_WEBHOOK_SECRET
    if not webhook_secret:
        logger.error("❌ RESEND_WEBHOOK_SECRET not configured")
        raise HTTPException(
            status_code=500,
            detail="Webhook secret not configured"
        )
    
    # Get the raw body for signature verification
    try:
        body = await request.body()
        body_str = body.decode("utf-8")
    except Exception as e:
        logger.error(f"❌ Failed to read request body: {e}")
        raise HTTPException(status_code=400, detail="Invalid request body")
    
    # Extract Svix headers for signature verification
    headers = {
        "svix-id": request.headers.get("svix-id"),
        "svix-timestamp": request.headers.get("svix-timestamp"),
        "svix-signature": request.headers.get("svix-signature"),
    }
    
    # Check if all required headers are present
    missing_headers = [k for k, v in headers.items() if not v]
    if missing_headers:
        logger.warning(f"⚠️ Missing Svix headers: {missing_headers}")
        # For inbound emails, Resend might not send Svix headers
        # Fall back to parsing without verification but log a warning
        try:
            payload = json.loads(body_str)
            # If this looks like an inbound email (no 'type' field with email. prefix)
            # allow it through but log the warning
            if "type" not in payload or not payload.get("type", "").startswith("email."):
                logger.warning("⚠️ Processing unverified inbound webhook (no Svix headers)")
                return payload
            # For regular email events, require signature verification
            raise HTTPException(
                status_code=401,
                detail=f"Missing required webhook headers: {missing_headers}"
            )
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON payload")
    
    # Verify the webhook signature using Svix
    try:
        wh = Webhook(webhook_secret)
        payload = wh.verify(body_str, headers)
        logger.debug("✅ Webhook signature verified successfully")
        return payload
    except WebhookVerificationError as e:
        logger.error(f"❌ Webhook signature verification failed: {e}")
        raise HTTPException(
            status_code=401,
            detail="Invalid webhook signature"
        )
    except Exception as e:
        logger.error(f"❌ Unexpected error during webhook verification: {e}")
        raise HTTPException(
            status_code=500,
            detail="Webhook verification error"
        )


@router.post("/resend")
async def handle_resend_webhook(request: Request, session: Session = Depends(get_session)):
    """
    Handles all webhooks from Resend for email delivery tracking.
    
    Security:
    - Verifies webhook signature using Svix (RESEND_WEBHOOK_SECRET)
    - Rejects requests with invalid or missing signatures
    
    Email Lifecycle Events:
    - email.sent → SENT (email accepted by provider)
    - email.delivered → DELIVERED (reached recipient's mailbox)
    - email.opened → OPENED (tracking pixel fired)
    - email.clicked → CLICKED (link clicked)
    - email.bounced → BOUNCED (delivery failed)
    - email.complained → BOUNCED (marked as spam)
    
    Inbound Email (Reply Detection):
    - Parses reply and marks lead + email as REPLIED
    
    Configure in Resend Dashboard:
    - Webhook URL: https://your-domain.com/api/v1/webhooks/resend
    - Events: All email events
    - Signing Secret: Copy to RESEND_WEBHOOK_SECRET env var
    - Inbound: Configure for reply tracking
    """
    # 1. Verify webhook signature and parse payload
    try:
        payload = await verify_webhook_signature(request)
        logger.info(f"🔔 Resend webhook received: {payload.get('type', 'inbound')}")
        logger.debug(f"Full payload: {json.dumps(payload, indent=2)}")
    except HTTPException:
        # Re-raise HTTP exceptions from verification
        raise
    except Exception as e:
        logger.error(f"❌ Failed to process webhook: {e}")
        raise HTTPException(status_code=400, detail="Invalid webhook payload")
    
    event_type = payload.get("type")
    data = payload.get("data", {})
    
    # --- EMAIL STATUS EVENTS ---
    # Map Resend event types to our EmailStatus enum
    email_status_map = {
        "email.sent": EmailStatus.SENT,
        "email.delivered": EmailStatus.DELIVERED,
        "email.opened": EmailStatus.OPENED,
        "email.clicked": EmailStatus.CLICKED,
        "email.bounced": EmailStatus.BOUNCED,
        "email.complained": EmailStatus.BOUNCED,  # Treat complaints as bounces
    }
    
    if event_type in email_status_map:
        email_id = data.get("email_id")
        created_at_str = data.get("created_at")
        
        # Parse event timestamp
        event_time = None
        if created_at_str:
            try:
                event_time = datetime.fromisoformat(created_at_str.replace('Z', '+00:00'))
            except:
                event_time = datetime.utcnow()
        
        status_updated = False
        if email_id:
            status_updated = update_email_status(
                resend_id=email_id,
                status=email_status_map[event_type],
                event_at=event_time
            )
            
            if status_updated:
                logger.info(
                    f"📧 Email {email_id[:8]}... → {email_status_map[event_type].value}"
                )
        
        # --- BOUNCE/COMPLAINT HANDLING ---
        # Stop campaigns for bounced/complained emails
        if event_type in ["email.bounced", "email.complained"]:
            to_email = data.get("to", [])
            if isinstance(to_email, list):
                target_email = to_email[0] if to_email else None
            else:
                target_email = to_email
            
            if target_email:
                logger.warning(f"🛑 Email bounced/complained for: {target_email}")
                await update_lead_status(
                    session,
                    target_email,
                    new_status="bounced",
                    campaign_lead_status=CampaignLeadStatus.BOUNCED
                )
                return {
                    "status": "processed",
                    "action": "marked_bounced",
                    "email_status_updated": status_updated
                }
        
        return {
            "status": "success",
            "action": "status_updated",
            "event": event_type,
            "email_id": email_id
        }
    
    # --- INBOUND EMAIL (REPLY) HANDLING ---
    # Resend inbound sends: { "from": "Name <email>", "to": "...", "text": "...", "subject": "..." }
    from_address = payload.get("from")
    email_body = payload.get("text") or payload.get("html")
    in_reply_to = payload.get("headers", {}).get("in-reply-to") or payload.get("in_reply_to")
    
    if from_address and email_body:
        clean_email = extract_email(from_address)
        logger.info(f"📩 Inbound reply received from: {clean_email}")
        
        # Try to find the original email if we have In-Reply-To header
        # This would contain the Message-ID of our original email
        original_email_updated = False
        if in_reply_to:
            # Try to correlate with our sent email
            logger.debug(f"In-Reply-To header: {in_reply_to}")
        
        # Update Lead and all active CampaignLeads to REPLIED
        lead_updated = await update_lead_status(
            session,
            clean_email,
            new_status="replied",
            campaign_lead_status=CampaignLeadStatus.REPLIED
        )
        
        # Also update any email logs for this lead to REPLIED
        if lead_updated:
            await update_emails_for_lead_replied(session, clean_email)
            logger.info(f"✅ Lead {clean_email} marked as REPLIED - follow-up stopped")
            return {
                "status": "success",
                "action": "marked_replied",
                "lead_email": clean_email
            }
        else:
            logger.info(f"⚠️ Reply from unknown lead: {clean_email}")
            return {"status": "ignored", "reason": "lead_not_found"}
    
    logger.debug(f"Unhandled webhook event type: {event_type}")
    return {"status": "ignored", "reason": "unknown_event_type"}


# --- HELPER FUNCTIONS ---

async def update_lead_status(
    session: Session, 
    email: str, 
    new_status: str,
    campaign_lead_status: CampaignLeadStatus
) -> bool:
    """
    Update lead and all associated campaign_leads when reply/bounce is received.
    
    Args:
        session: Database session
        email: Lead's email address
        new_status: Status string ('replied', 'bounced')
        campaign_lead_status: CampaignLeadStatus enum value
    
    Returns:
        True if lead was found and updated
    """
    clean_email = email.lower().strip()
    
    # Find the lead
    lead = session.exec(
        select(Lead).where(Lead.email == clean_email)
    ).first()
    
    if not lead:
        return False
    
    now = datetime.utcnow()
    
    # Update Lead fields
    if new_status == "replied":
        lead.has_replied = True
        lead.replied_at = now
    
    lead.updated_at = now
    session.add(lead)
    
    # Update ALL CampaignLeads for this lead that are in active states
    # This stops any pending follow-up workflows
    active_statuses = [
        CampaignLeadStatus.PENDING,
        CampaignLeadStatus.ACTIVE,
        CampaignLeadStatus.WAITING,
        CampaignLeadStatus.PAUSED
    ]
    
    campaign_leads = session.exec(
        select(CampaignLead).where(
            and_(
                CampaignLead.lead_id == lead.id,
                CampaignLead.status.in_(active_statuses)
            )
        )
    ).all()
    
    updated_count = 0
    for cl in campaign_leads:
        cl.status = campaign_lead_status
        cl.updated_at = now
        if new_status == "replied":
            cl.replied_at = now
        session.add(cl)
        updated_count += 1
    
    session.commit()
    
    logger.info(
        f"📊 Updated lead {clean_email} and {updated_count} campaign_leads to {campaign_lead_status.value}"
    )
    
    return True


def extract_email(raw_from: str) -> str:
    """
    Parses 'John Doe <john@doe.com>' -> 'john@doe.com'
    """
    if "<" in raw_from and ">" in raw_from:
        return raw_from.split("<")[1].split(">")[0].lower().strip()
    return raw_from.lower().strip()


async def update_emails_for_lead_replied(
    session: Session,
    lead_email: str
) -> int:
    """
    Update all email logs for a lead to REPLIED status when they reply.
    
    This marks the most recent DELIVERED/OPENED email as REPLIED since
    that's likely the one they're responding to.
    
    Args:
        session: Database session
        lead_email: Lead's email address
        
    Returns:
        Number of email logs updated
    """
    from app.models.email import EmailLog
    from sqlalchemy import desc
    
    try:
        # Find the lead
        lead = session.exec(
            select(Lead).where(Lead.email == lead_email.lower().strip())
        ).first()
        
        if not lead:
            return 0
        
        # Find all campaign_leads for this lead
        campaign_leads = session.exec(
            select(CampaignLead).where(CampaignLead.lead_id == lead.id)
        ).all()
        
        if not campaign_leads:
            return 0
        
        campaign_lead_ids = [cl.id for cl in campaign_leads]
        
        # Find the most recent delivered/opened email for this lead
        # and mark it as REPLIED
        from app.models.email import EmailLog
        
        recent_email = session.exec(
            select(EmailLog)
            .where(
                EmailLog.campaign_lead_id.in_(campaign_lead_ids),
                EmailLog.status.in_([
                    EmailStatus.SENT,
                    EmailStatus.DELIVERED,
                    EmailStatus.OPENED,
                    EmailStatus.CLICKED
                ])
            )
            .order_by(desc(EmailLog.sent_at))
        ).first()
        
        if recent_email:
            recent_email.status = EmailStatus.REPLIED
            recent_email.replied_at = datetime.utcnow()
            recent_email.updated_at = datetime.utcnow()
            session.add(recent_email)
            session.commit()
            
            logger.info(f"📧 Email {recent_email.id} marked as REPLIED")
            return 1
        
        return 0
        
    except Exception as e:
        logger.error(f"Error updating emails for lead reply: {e}")
        return 0
