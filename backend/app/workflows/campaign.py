import logging
from datetime import timedelta, datetime
from typing import Dict, Any

import inngest
from app.core.config import settings
from app.services.ai_services import generate_email_content
from app.services.email_service import send_email, EmailSendError, PermanentError, TransientError
from app.workflows.db_utils import (
    check_if_lead_replied,
    update_campaign_lead_status,
    mark_campaign_lead_error,
    check_campaign_active,
    create_email_log,
    update_email_log_sending,
    update_email_log_sent,
    update_email_log_failed
)
from app.models.enums import EmailStatus
from app.models.enums import CampaignLeadStatus

# Configure logging
logger = logging.getLogger(__name__)

# Initialize Inngest client based on environment
if settings.INNGEST_DEV_MODE:
    # Development mode - no signing key required, works with Inngest Dev Server
    inngest_client = inngest.Inngest(
        app_id="nudge-backend",
        is_production=False  # This tells Inngest we're in dev mode
    )
    logger.info("🔧 Inngest running in DEVELOPMENT mode")
else:
    # Production mode - use cloud keys
    inngest_client = inngest.Inngest(
        app_id="nudge-backend",
        event_key=settings.INNGEST_EVENT_KEY,
        signing_key=settings.INNGEST_SIGNING_KEY,
        is_production=True
    )
    logger.info("🚀 Inngest running in PRODUCTION mode")

# Configuration constants
WAIT_FOR_REPLY_DURATION = timedelta(minutes=1)  # Demo: 1 minute, Production: timedelta(days=2)
MAX_RETRY_COUNT = 2


@inngest_client.create_function(
    fn_id="send-campaign-sequence",
    trigger=inngest.TriggerEvent(event="campaign/start_sequence"),
    retries=MAX_RETRY_COUNT
)
async def send_campaign_sequence(ctx: inngest.Context) -> Dict[str, Any]:
    """
    Durable email sequence workflow.

    This workflow:
    1. Validates campaign is still active
    2. Generates and sends initial personalized email
    3. Waits for configurable duration (checks for reply)
    4. Sends follow-up if no reply received
    5. Tracks all state changes in database

    The workflow is durable - if it fails at any step, Inngest will
    retry from that step, not from the beginning.

    Args:
        ctx: Inngest context containing event data, run metadata, and step manager

    Returns:
        dict: Workflow completion status and details
    """
    # Access step from context (Inngest SDK v0.5+)
    step = ctx.step
    
    # Extract event data
    event_data = ctx.event.data
    campaign_id = event_data.get("campaign_id")
    campaign_lead_id = event_data.get("campaign_lead_id")
    lead = event_data.get("lead", {})
    campaign_config = event_data.get("campaign_config", {})

    # Extract lead details (basic fields for logging/compatibility)
    lead_id = lead.get("id")
    lead_name = lead.get("first_name", "there")
    company = lead.get("company", "your company")
    email = lead.get("email")

    # Extract campaign configuration
    target_audience = campaign_config.get("target_audience", "")
    value_proposition = campaign_config.get("value_proposition", "")
    tone = campaign_config.get("tone", "professional")
    from_email = campaign_config.get("from_email")
    
    # Get sender name from settings for email signature
    sender_name = settings.FROM_NAME

    logger.info(
        f"🚀 Starting campaign sequence for lead {lead_id} "
        f"(campaign: {campaign_id}, run: {ctx.run_id})"
    )

    try:
        # ====================================================================
        # STEP 0: Verify campaign is still active
        # ====================================================================
        is_active = await step.run(
            "check-campaign-active",
            lambda: check_campaign_active(campaign_id)
        )

        if not is_active:
            logger.warning(
                f"Campaign {campaign_id} is no longer active, aborting workflow"
            )
            return {
                "status": "aborted",
                "reason": "Campaign is no longer active",
                "campaign_lead_id": campaign_lead_id
            }

        # ====================================================================
        # STEP 1: Update campaign lead status to ACTIVE
        # ====================================================================
        await step.run(
            "update-status-active",
            lambda: update_campaign_lead_status(
                campaign_lead_id=campaign_lead_id,
                status=CampaignLeadStatus.ACTIVE,
                inngest_run_id=ctx.run_id,
                current_step=1,
                next_step_at=datetime.utcnow() + timedelta(minutes=1)
            )
        )

        logger.info(f"📝 Updated lead {lead_id} status to ACTIVE")

        # ====================================================================
        # STEP 2: Generate initial email using AI with full context
        # ====================================================================
        try:
            email_content = await step.run(
                "generate-first-email",
                lambda: generate_email_content(
                    lead_name=lead_name,
                    company=company,
                    purpose="initial_outreach",
                    lead=lead,
                    campaign_config=campaign_config,
                    sender_name=sender_name
                )
            )
            logger.info(f"🤖 Generated initial email for {lead_name}")
        except Exception as e:
            logger.error(f"Failed to generate email for {lead_name}: {e}")
            await step.run(
                "mark-generation-error",
                lambda: mark_campaign_lead_error(
                    campaign_lead_id=campaign_lead_id,
                    error_message=f"Failed to generate email: {str(e)}"
                )
            )
            raise

        # ====================================================================
        # STEP 3: Create email log with QUEUED status
        # ====================================================================
        email_log_id_1 = await step.run(
            "create-email-log-1",
            lambda: create_email_log(
                campaign_lead_id=campaign_lead_id,
                step_id="send-email-1",
                step_number=1,
                to_email=email,
                from_email=from_email or settings.FROM_EMAIL,
                subject=email_content["subject"],
                body=email_content["body"],
                status=EmailStatus.QUEUED
            )
        )
        logger.info(f"📥 Email 1 queued for {email} (log_id: {email_log_id_1})")

        # ====================================================================
        # STEP 4: Send initial email via Resend
        # ====================================================================
        try:
            # Mark as SENDING before API call
            await step.run(
                "mark-sending-1",
                lambda: update_email_log_sending(email_log_id_1)
            )
            
            # Send the email
            send_result = await step.run(
                "send-email-1",
                lambda: send_email(
                    to_email=email,
                    subject=email_content["subject"],
                    body=email_content["body"],
                    from_email=from_email
                )
            )
            resend_id_1 = send_result.get('email_id', 'unknown')
            
            # Mark as SENT with Resend ID
            await step.run(
                "mark-sent-1",
                lambda: update_email_log_sent(email_log_id_1, resend_id_1)
            )
            
            logger.info(
                f"📧 Sent initial email to {email}, "
                f"resend_id: {resend_id_1}"
            )

            # Update campaign lead status to WAITING after successful send
            await step.run(
                "update-status-waiting",
                lambda: update_campaign_lead_status(
                    campaign_lead_id=campaign_lead_id,
                    status=CampaignLeadStatus.WAITING,
                    current_step=2,
                    next_step_at=datetime.utcnow() + timedelta(minutes=1)
                )
            )

        except EmailSendError as e:
            logger.error(f"Failed to send email to {email}: {e}")
            # Mark email as FAILED
            await step.run(
                "mark-failed-1",
                lambda: update_email_log_failed(email_log_id_1, str(e))
            )
            await step.run(
                "mark-send-error",
                lambda: mark_campaign_lead_error(
                    campaign_lead_id=campaign_lead_id,
                    error_message=f"Failed to send email: {str(e)}"
                )
            )
            raise
        except Exception as e:
            logger.error(f"Unexpected error sending email to {email}: {e}")
            # Mark email as FAILED
            await step.run(
                "mark-failed-1-generic",
                lambda: update_email_log_failed(email_log_id_1, str(e))
            )
            await step.run(
                "mark-send-error-generic",
                lambda: mark_campaign_lead_error(
                    campaign_lead_id=campaign_lead_id,
                    error_message=f"Email send error: {str(e)}"
                )
            )
            raise

        # ====================================================================
        # STEP 5: Wait for reply (durable sleep)
        # ====================================================================
        
        # Get wait duration from config (default to 2 days)
        delay_days = campaign_config.get("follow_up_delay_days", 2)
        
        # In dev mode, use minutes instead of days for faster testing if needed 
        # But per user request, we use the configured value. 
        # To make it testable without waiting days, we can check if it's very small
        
        # PRODUCTION LOGIC:
        wait_duration = timedelta(days=delay_days)
        
        logger.info(
            f"⏳ Waiting {delay_days} days for reply from {lead_name}"
        )
        await step.sleep("wait-for-reply", wait_duration)

        # ====================================================================
        # STEP 6: Check if lead replied
        # ====================================================================
        has_replied = await step.run(
            "check-db-status",
            lambda: check_if_lead_replied(lead_id)
        )

        if has_replied:
            logger.info(f"🎉 Lead {lead_name} replied! Stopping sequence.")
            await step.run(
                "update-status-replied",
                lambda: update_campaign_lead_status(
                    campaign_lead_id=campaign_lead_id,
                    status=CampaignLeadStatus.REPLIED
                )
            )
            return {
                "status": "stopped",
                "reason": "Lead replied! No follow-up sent.",
                "campaign_lead_id": campaign_lead_id
            }

        # ====================================================================
        # STEP 7: Check campaign still active before follow-up
        # ====================================================================
        is_still_active = await step.run(
            "check-campaign-active-before-followup",
            lambda: check_campaign_active(campaign_id)
        )

        if not is_still_active:
            logger.info(f"Campaign {campaign_id} paused/completed, stopping workflow")
            await step.run(
                "update-status-paused",
                lambda: update_campaign_lead_status(
                    campaign_lead_id=campaign_lead_id,
                    status=CampaignLeadStatus.PAUSED
                )
            )
            return {
                "status": "paused",
                "reason": "Campaign was paused/completed before follow-up",
                "campaign_lead_id": campaign_lead_id
            }

        # ====================================================================
        # STEP 8: Generate follow-up email with full context
        # ====================================================================
        try:
            followup_content = await step.run(
                "generate-followup-email",
                lambda: generate_email_content(
                    lead_name=lead_name,
                    company=company,
                    purpose="followup",
                    lead=lead,
                    campaign_config=campaign_config,
                    sender_name=sender_name
                )
            )
            logger.info(f"🤖 Generated follow-up email for {lead_name}")
        except Exception as e:
            logger.error(f"Failed to generate follow-up for {lead_name}: {e}")
            await step.run(
                "mark-followup-generation-error",
                lambda: mark_campaign_lead_error(
                    campaign_lead_id=campaign_lead_id,
                    error_message=f"Failed to generate follow-up: {str(e)}"
                )
            )
            raise

        # ====================================================================
        # STEP 9: Create follow-up email log with QUEUED status
        # ====================================================================
        email_log_id_2 = await step.run(
            "create-email-log-2",
            lambda: create_email_log(
                campaign_lead_id=campaign_lead_id,
                step_id="send-email-2",
                step_number=2,
                to_email=email,
                from_email=from_email or settings.FROM_EMAIL,
                subject=followup_content["subject"],
                body=followup_content["body"],
                status=EmailStatus.QUEUED
            )
        )
        logger.info(f"📥 Follow-up email queued for {email} (log_id: {email_log_id_2})")

        # ====================================================================
        # STEP 10: Send follow-up email
        # ====================================================================
        try:
            # Mark as SENDING
            await step.run(
                "mark-sending-2",
                lambda: update_email_log_sending(email_log_id_2)
            )
            
            # Send the email
            followup_result = await step.run(
                "send-email-2",
                lambda: send_email(
                    to_email=email,
                    subject=followup_content["subject"],
                    body=followup_content["body"],
                    from_email=from_email
                )
            )
            resend_id_2 = followup_result.get('email_id', 'unknown')
            
            # Mark as SENT with Resend ID
            await step.run(
                "mark-sent-2",
                lambda: update_email_log_sent(email_log_id_2, resend_id_2)
            )
            
            logger.info(
                f"📧 Sent follow-up email to {email}, "
                f"resend_id: {resend_id_2}"
            )

        except Exception as e:
            logger.error(f"Failed to send follow-up to {email}: {e}")
            # Mark email as FAILED
            await step.run(
                "mark-failed-2",
                lambda: update_email_log_failed(email_log_id_2, str(e))
            )
            await step.run(
                "mark-followup-send-error",
                lambda: mark_campaign_lead_error(
                    campaign_lead_id=campaign_lead_id,
                    error_message=f"Failed to send follow-up: {str(e)}"
                )
            )
            raise

        # ====================================================================
        # STEP 11: Mark sequence as COMPLETED
        # ====================================================================
        await step.run(
            "update-status-completed",
            lambda: update_campaign_lead_status(
                campaign_lead_id=campaign_lead_id,
                status=CampaignLeadStatus.COMPLETED,
                current_step=3
            )
        )

        logger.info(
            f"✅ Campaign sequence completed for lead {lead_id} "
            f"(campaign: {campaign_id})"
        )

        return {
            "status": "completed",
            "message": "Email sequence finished successfully.",
            "campaign_lead_id": campaign_lead_id,
            "emails_sent": 2
        }

    except Exception as e:
        # Final error handler - log and let Inngest handle retry
        logger.error(
            f"❌ Workflow failed for campaign lead {campaign_lead_id}: {e}",
            exc_info=True
        )

        # Mark error in database (non-critical, don't fail if this fails)
        try:
            mark_campaign_lead_error(
                campaign_lead_id=campaign_lead_id,
                error_message=f"Workflow error: {str(e)}"
            )
        except Exception as db_error:
            logger.error(f"Failed to mark workflow error in DB: {db_error}")

        # Re-raise to trigger Inngest retry
        raise
