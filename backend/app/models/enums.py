from enum import Enum


class CampaignStatus(str, Enum):
    """Campaign status enum."""
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    COMPLETED = "COMPLETED"
    ARCHIVED = "ARCHIVED"


class CampaignLeadStatus(str, Enum):
    """Campaign lead status enum."""
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    WAITING = "WAITING"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    REPLIED = "REPLIED"
    COMPLETED = "COMPLETED"
    UNSUBSCRIBED = "UNSUBSCRIBED"
    BOUNCED = "BOUNCED"
    PAUSED = "PAUSED"


class EmailStatus(str, Enum):
    """
    Email status enum representing the full email delivery lifecycle.
    
    Flow: QUEUED -> SENDING -> SENT -> DELIVERED -> OPENED -> CLICKED -> REPLIED
    Error states: BOUNCED, FAILED
    
    Webhook events from Resend:
    - email.sent -> SENT
    - email.delivered -> DELIVERED  
    - email.opened -> OPENED (tracking pixel)
    - email.clicked -> CLICKED (link tracking)
    - email.bounced -> BOUNCED
    - email.complained -> BOUNCED (treated as bounce)
    - Inbound email -> REPLIED
    """
    # Pre-send states
    QUEUED = "QUEUED"       # Email created, waiting to be sent
    SENDING = "SENDING"     # Currently being sent to email provider
    
    # Post-send states (from Resend webhooks)
    SENT = "SENT"           # Successfully sent to email provider
    DELIVERED = "DELIVERED" # Delivered to recipient's mailbox (webhook)
    OPENED = "OPENED"       # Recipient opened the email (webhook)
    CLICKED = "CLICKED"     # Recipient clicked a link (webhook)
    REPLIED = "REPLIED"     # Recipient replied (inbound webhook)
    
    # Error states
    BOUNCED = "BOUNCED"     # Email bounced or complained (webhook)
    FAILED = "FAILED"       # Failed to send (API error)


class WorkflowEventType(str, Enum):
    """Workflow event type enum."""
    CAMPAIGN_STARTED = "CAMPAIGN_STARTED"
    STEP_STARTED = "STEP_STARTED"
    STEP_COMPLETED = "STEP_COMPLETED"
    EMAIL_GENERATED = "EMAIL_GENERATED"
    EMAIL_SENT = "EMAIL_SENT"
    SLEEP_STARTED = "SLEEP_STARTED"
    SLEEP_COMPLETED = "SLEEP_COMPLETED"
    REPLY_DETECTED = "REPLY_DETECTED"
    WORKFLOW_PAUSED = "WORKFLOW_PAUSED"
    WORKFLOW_RESUMED = "WORKFLOW_RESUMED"
    WORKFLOW_ABORTED = "WORKFLOW_ABORTED"
    ERROR_OCCURRED = "ERROR_OCCURRED"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    REVIEW_APPROVED = "REVIEW_APPROVED"
    REVIEW_REJECTED = "REVIEW_REJECTED"


class SuppressionReason(str, Enum):
    """Suppression reason enum."""
    UNSUBSCRIBED = "UNSUBSCRIBED"
    BOUNCED = "BOUNCED"
    COMPLAINED = "COMPLAINED"
    MANUAL = "MANUAL"
