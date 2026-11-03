from datetime import datetime, date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func
from pydantic import BaseModel

from app.db.engine import get_session
from app.core.auth import get_current_user
from app.models.user import User
from app.models.lead import Lead
from app.models.campaign import Campaign, CampaignLead
from app.models.enums import CampaignStatus, CampaignLeadStatus, EmailStatus
from app.models.email import EmailLog

router = APIRouter(prefix="/stats", tags=["stats"])


# ============================================================================
# Response Schemas
# ============================================================================

class FunnelData(BaseModel):
    leads_added: int
    emails_sent: int
    waiting: int
    replied: int


class DashboardStatsResponse(BaseModel):
    """Dashboard statistics response."""
    total_leads: int
    total_campaigns: int
    active_campaigns: int
    emails_sent_today: int
    daily_limit: int
    funnel_data: FunnelData


# ============================================================================
# Endpoints
# ============================================================================

@router.get("", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> DashboardStatsResponse:
    """
    Get aggregated dashboard statistics.
    
    Returns:
        DashboardStatsResponse: Dashboard statistics including:
            - total_leads: Total number of leads for the user
            - total_campaigns: Total number of campaigns
            - active_campaigns: Number of active campaigns
            - emails_sent_today: Emails sent today (from email logs)
            - daily_limit: User's daily email limit from settings
            - funnel_data: Conversion funnel statistics
    """
    user_id = current_user.id
    
    # Count total leads
    total_leads = session.exec(
        select(func.count(Lead.id)).where(Lead.user_id == user_id)
    ).one()
    
    # Count total campaigns
    total_campaigns = session.exec(
        select(func.count(Campaign.id)).where(Campaign.user_id == user_id)
    ).one()
    
    # Count active campaigns
    active_campaigns = session.exec(
        select(func.count(Campaign.id)).where(
            Campaign.user_id == user_id,
            Campaign.status == CampaignStatus.ACTIVE
        )
    ).one()
    
    # Get all campaign lead IDs for this user's campaigns
    campaign_lead_ids = session.exec(
        select(CampaignLead.id).where(
            CampaignLead.campaign_id.in_(
                select(Campaign.id).where(Campaign.user_id == user_id)
            )
        )
    ).all()
    
    # Count emails sent today (through campaign_leads join)
    today_start = datetime.combine(date.today(), datetime.min.time())
    if campaign_lead_ids:
        emails_sent_today = session.exec(
            select(func.count(EmailLog.id)).where(
                EmailLog.campaign_lead_id.in_(campaign_lead_ids),
                EmailLog.sent_at >= today_start
            )
        ).one()
    else:
        emails_sent_today = 0
    
    # Get user's daily limit from settings
    from app.models.user import UserSettings
    settings = session.exec(
        select(UserSettings).where(UserSettings.user_id == user_id)
    ).first()
    daily_limit = settings.daily_send_limit if settings else 50
    
    # Calculate funnel data
    # Leads added = total leads
    leads_added = total_leads
    
    # Get campaign lead statistics for the user's campaigns
    campaign_ids = session.exec(
        select(Campaign.id).where(Campaign.user_id == user_id)
    ).all()
    
    if campaign_ids:
        # Emails sent = campaign leads with current_step > 0
        emails_sent = session.exec(
            select(func.count(CampaignLead.id)).where(
                CampaignLead.campaign_id.in_(campaign_ids),
                CampaignLead.current_step > 0
            )
        ).one()
        
        # Waiting = campaign leads with status WAITING
        waiting = session.exec(
            select(func.count(CampaignLead.id)).where(
                CampaignLead.campaign_id.in_(campaign_ids),
                CampaignLead.status == CampaignLeadStatus.WAITING
            )
        ).one()
        
        # Replied = campaign leads with status REPLIED
        replied = session.exec(
            select(func.count(CampaignLead.id)).where(
                CampaignLead.campaign_id.in_(campaign_ids),
                CampaignLead.status == CampaignLeadStatus.REPLIED
            )
        ).one()
    else:
        emails_sent = 0
        waiting = 0
        replied = 0
    
    return DashboardStatsResponse(
        total_leads=total_leads,
        total_campaigns=total_campaigns,
        active_campaigns=active_campaigns,
        emails_sent_today=emails_sent_today,
        daily_limit=daily_limit,
        funnel_data=FunnelData(
            leads_added=leads_added,
            emails_sent=emails_sent,
            waiting=waiting,
            replied=replied
        )
    )


class EmailDeliveryStats(BaseModel):
    """
    Email delivery statistics showing the full lifecycle.
    
    Flow: QUEUED -> SENDING -> SENT -> DELIVERED -> OPENED -> CLICKED -> REPLIED
    """
    queued: int = 0
    sending: int = 0
    sent: int = 0
    delivered: int = 0
    opened: int = 0
    clicked: int = 0
    replied: int = 0
    bounced: int = 0
    failed: int = 0
    total: int = 0
    
    # Calculated rates
    delivery_rate: float = 0.0  # delivered / sent
    open_rate: float = 0.0      # opened / delivered
    click_rate: float = 0.0     # clicked / opened
    reply_rate: float = 0.0     # replied / delivered
    bounce_rate: float = 0.0    # bounced / sent


@router.get("/emails", response_model=EmailDeliveryStats)
async def get_email_delivery_stats(
    campaign_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> EmailDeliveryStats:
    """
    Get email delivery statistics across all campaigns or for a specific campaign.
    
    Shows the full email lifecycle:
    - QUEUED: Email created, waiting to send
    - SENDING: Currently being sent
    - SENT: Accepted by email provider
    - DELIVERED: Reached recipient's inbox (webhook)
    - OPENED: Recipient opened email (webhook)
    - CLICKED: Recipient clicked a link (webhook)
    - REPLIED: Recipient replied (inbound webhook)
    - BOUNCED: Delivery failed (webhook)
    - FAILED: API error during send
    
    Args:
        campaign_id: Optional campaign ID to filter by
        
    Returns:
        EmailDeliveryStats with counts and calculated rates
    """
    user_id = current_user.id
    
    # Get campaign IDs for this user
    if campaign_id:
        # Verify user owns this campaign
        campaign = session.get(Campaign, campaign_id)
        if not campaign or campaign.user_id != user_id:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Campaign not found")
        campaign_ids = [campaign_id]
    else:
        campaign_ids = list(session.exec(
            select(Campaign.id).where(Campaign.user_id == user_id)
        ).all())
    
    if not campaign_ids:
        return EmailDeliveryStats()
    
    # Get campaign_lead IDs for these campaigns
    campaign_lead_ids = list(session.exec(
        select(CampaignLead.id).where(
            CampaignLead.campaign_id.in_(campaign_ids)
        )
    ).all())
    
    if not campaign_lead_ids:
        return EmailDeliveryStats()
    
    # Count emails by status
    status_counts = session.exec(
        select(EmailLog.status, func.count(EmailLog.id))
        .where(EmailLog.campaign_lead_id.in_(campaign_lead_ids))
        .group_by(EmailLog.status)
    ).all()
    
    # Build stats dict
    counts = {status: count for status, count in status_counts}
    
    queued = counts.get(EmailStatus.QUEUED, 0)
    sending = counts.get(EmailStatus.SENDING, 0)
    sent = counts.get(EmailStatus.SENT, 0)
    delivered = counts.get(EmailStatus.DELIVERED, 0)
    opened = counts.get(EmailStatus.OPENED, 0)
    clicked = counts.get(EmailStatus.CLICKED, 0)
    replied = counts.get(EmailStatus.REPLIED, 0)
    bounced = counts.get(EmailStatus.BOUNCED, 0)
    failed = counts.get(EmailStatus.FAILED, 0)
    
    total = sum([queued, sending, sent, delivered, opened, clicked, replied, bounced, failed])
    
    # Calculate rates (avoid division by zero)
    # For rates, we use the "highest status" count since emails progress through states
    # Sent includes delivered, opened, clicked, replied (they all went through sent)
    total_sent = sent + delivered + opened + clicked + replied + bounced
    total_delivered = delivered + opened + clicked + replied
    total_opened = opened + clicked + replied
    
    delivery_rate = (total_delivered / total_sent * 100) if total_sent > 0 else 0.0
    open_rate = (total_opened / total_delivered * 100) if total_delivered > 0 else 0.0
    click_rate = ((clicked + replied) / total_opened * 100) if total_opened > 0 else 0.0
    reply_rate = (replied / total_delivered * 100) if total_delivered > 0 else 0.0
    bounce_rate = (bounced / total_sent * 100) if total_sent > 0 else 0.0
    
    return EmailDeliveryStats(
        queued=queued,
        sending=sending,
        sent=sent,
        delivered=delivered,
        opened=opened,
        clicked=clicked,
        replied=replied,
        bounced=bounced,
        failed=failed,
        total=total,
        delivery_rate=round(delivery_rate, 1),
        open_rate=round(open_rate, 1),
        click_rate=round(click_rate, 1),
        reply_rate=round(reply_rate, 1),
        bounce_rate=round(bounce_rate, 1)
    )
