from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, and_
from app.core.database import get_session
from app.models.lead import Lead
from app.models.campaign import CampaignLead
from app.models.enums import CampaignLeadStatus
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/simulate-reply/{lead_id}")
async def simulate_reply(
    lead_id: str,
    session: Session = Depends(get_session)
):
    """
    Simulate a reply from a lead.
    
    This marks the lead as 'replied' and updates all associated 
    active campaign leads to 'REPLIED' status, stopping further follow-ups.
    """
    lead = session.get(Lead, lead_id)
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lead {lead_id} not found"
        )
        
    now = datetime.utcnow()
    
    # Update Lead
    lead.has_replied = True
    lead.replied_at = now
    lead.updated_at = now
    session.add(lead)
    
    # Update active CampaignLeads
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
        cl.status = CampaignLeadStatus.REPLIED
        cl.replied_at = now
        cl.updated_at = now
        session.add(cl)
        updated_count += 1
        
    session.commit()
    
    logger.info(f"🧪 Simulated reply for lead {lead.email}. Updated {updated_count} campaign leads.")
    
    return {
        "success": True,
        "message": f"Simulated reply for {lead.email}",
        "updated_campaigns": updated_count
    }
