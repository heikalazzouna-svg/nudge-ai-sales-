import sys
import os
import uuid
from datetime import datetime

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlmodel import Session, select, create_engine
from app.models.campaign import Campaign, CampaignLead
from app.models.lead import Lead
from app.models.email import EmailLog
from app.models.enums import EmailStatus, CampaignLeadStatus
from app.core.config import settings

def backfill_logs():
    engine = create_engine(settings.DATABASE_URL)
    campaign_id = "e5f9b6a0-f6c5-4edf-940e-030bc3e4d7c1"
    
    with Session(engine) as session:
        campaign = session.get(Campaign, campaign_id)
        if not campaign:
            print("Campaign not found")
            return

        print(f"Backfilling logs for campaign: {campaign.name}")
        
        # Get completed leads without logs
        leads = session.exec(
            select(CampaignLead, Lead)
            .join(Lead, CampaignLead.lead_id == Lead.id)
            .where(
                CampaignLead.campaign_id == campaign_id,
                CampaignLead.status == CampaignLeadStatus.COMPLETED
            )
        ).all()
        
        count = 0
        for cl, lead in leads:
            # Check if log exists
            log_exists = session.exec(
                select(EmailLog).where(EmailLog.campaign_lead_id == cl.id)
            ).first()
            
            if not log_exists:
                print(f"Creating backfill log for lead {lead.email}")
                # Create fake log
                log = EmailLog(
                    id=str(uuid.uuid4()),
                    campaign_lead_id=cl.id,
                    step_id="backfill-1",
                    step_number=1,
                    to_email=lead.email,
                    from_email=campaign.from_email or "system@nudge.ai",
                    subject="Initial Outreach (Backfilled)",
                    body="Backfilled log entry",
                    status=EmailStatus.SENT,
                    sent_at=cl.updated_at or datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                session.add(log)
                count += 1
        
        session.commit()
        print(f"Backfilled {count} email logs.")

if __name__ == "__main__":
    backfill_logs()
