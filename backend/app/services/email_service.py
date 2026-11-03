import logging
import re
import time
from typing import Optional, Dict, Any, List
from functools import wraps
import resend
from app.core.config import settings

# Configure logging
logger = logging.getLogger(__name__)

# Initialize Resend API key
resend.api_key = settings.RESEND_API_KEY

# Email validation regex pattern
EMAIL_REGEX = re.compile(
    r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
)


def validate_email(email: str) -> bool:
    """Validate email address format."""
    if not email or not isinstance(email, str):
        return False
    return bool(EMAIL_REGEX.match(email.strip()))


def retry_with_backoff(max_retries: int = 3, base_delay: float = 1.0):
    """
    Decorator for retry logic with exponential backoff.
    
    Args:
        max_retries: Maximum number of retry attempts
        base_delay: Base delay in seconds (will be multiplied exponentially)
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except RateLimitError as e:
                    # Rate limit - use longer backoff
                    if attempt < max_retries:
                        delay = base_delay * (4 ** attempt)  # More aggressive backoff
                        logger.warning(
                            f"Rate limited, waiting {delay}s before retry "
                            f"(attempt {attempt + 1}/{max_retries})"
                        )
                        time.sleep(delay)
                        last_exception = e
                    else:
                        raise
                except TransientError as e:
                    # Transient error - use standard backoff
                    if attempt < max_retries:
                        delay = base_delay * (2 ** attempt)
                        logger.warning(
                            f"Transient error, retrying in {delay}s "
                            f"(attempt {attempt + 1}/{max_retries}): {e}"
                        )
                        time.sleep(delay)
                        last_exception = e
                    else:
                        raise
                except PermanentError:
                    # Permanent error - don't retry
                    raise
            raise last_exception
        return wrapper
    return decorator


class EmailSendError(Exception):
    """Base exception for email sending failures."""
    
    def __init__(
        self,
        message: str,
        to_email: str = "",
        subject: str = "",
        original_error: Optional[Exception] = None,
        is_retryable: bool = True
    ):
        super().__init__(message)
        self.to_email = to_email
        self.subject = subject
        self.original_error = original_error
        self.is_retryable = is_retryable


class PermanentError(EmailSendError):
    """Permanent error - should not retry."""
    def __init__(self, *args, **kwargs):
        kwargs['is_retryable'] = False
        super().__init__(*args, **kwargs)


class TransientError(EmailSendError):
    """Transient error - should retry."""
    pass


class RateLimitError(TransientError):
    """Rate limit error - should retry with longer backoff."""
    pass


class ValidationError(PermanentError):
    """Validation error - don't retry."""
    pass


class EmailService:
    """Production-grade email service using Resend."""
    
    # Resend free tier: 100 emails/day, 1 email/second
    MIN_SEND_INTERVAL = 1.1  # seconds between sends to avoid rate limiting
    _last_send_time: float = 0
    
    @classmethod
    def _rate_limit_wait(cls):
        """Ensure minimum interval between sends."""
        now = time.time()
        elapsed = now - cls._last_send_time
        if elapsed < cls.MIN_SEND_INTERVAL:
            time.sleep(cls.MIN_SEND_INTERVAL - elapsed)
        cls._last_send_time = time.time()
    
    @staticmethod
    def _categorize_error(error: Exception, to_email: str, subject: str) -> EmailSendError:
        """Categorize error for appropriate retry behavior."""
        error_msg = str(error).lower()
        
        # Rate limiting
        if 'rate limit' in error_msg or '429' in error_msg:
            return RateLimitError(
                f"Rate limited: {error}",
                to_email=to_email,
                subject=subject,
                original_error=error
            )
        
        # Permanent errors (don't retry)
        permanent_indicators = [
            'invalid api key', 'api key', 'unauthorized', '401',
            'forbidden', '403', 'not found', '404',
            'invalid email', 'unsubscribed', 'bounced',
            'domain not verified', 'verify a domain', 'testing emails',
            'only send testing emails'
        ]
        if any(indicator in error_msg for indicator in permanent_indicators):
            return PermanentError(
                f"Permanent error: {error}",
                to_email=to_email,
                subject=subject,
                original_error=error
            )
        
        # Default to transient (retry)
        return TransientError(
            f"Transient error: {error}",
            to_email=to_email,
            subject=subject,
            original_error=error
        )
    
    @classmethod
    @retry_with_backoff(max_retries=3, base_delay=1.0)
    def send_email(
        cls,
        to_email: str,
        subject: str,
        body: str,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
        html_body: Optional[str] = None,
        reply_to: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Send an email using Resend with retry logic.
        
        Args:
            to_email: Recipient email address
            subject: Email subject line
            body: Plain text body (used if html_body not provided)
            from_email: Sender email (defaults to settings.FROM_EMAIL)
            html_body: HTML body (optional, overrides body if provided)
            reply_to: Reply-to email address (optional)
            metadata: Additional metadata for tracking (optional)
        
        Returns:
            dict: Response from Resend API containing email ID
            
        Raises:
            ValidationError: If email validation fails
            PermanentError: If error is not retryable
            TransientError: If error is retryable (after max retries)
        """
        # Validate email
        if not validate_email(to_email):
            raise ValidationError(
                f"Invalid email address: {to_email}",
                to_email=to_email,
                subject=subject
            )
        
        # Validate subject
        if not subject or not subject.strip():
            raise ValidationError(
                "Email subject cannot be empty",
                to_email=to_email,
                subject=subject
            )
        
        try:
            # Apply rate limiting
            cls._rate_limit_wait()
            
            # Build sender with display name: "Name <email@domain.com>"
            sender_email = from_email or settings.FROM_EMAIL
            sender_name = from_name or settings.FROM_NAME
            
            # Format as "Display Name <email>" for better email client display
            if sender_name:
                sender = f"{sender_name} <{sender_email}>"
            else:
                sender = sender_email
            
            # Build email payload
            email_payload = {
                "from": sender,
                "to": to_email,
                "subject": subject,
            }
            
            # Use HTML body if provided, otherwise convert text to HTML
            if html_body:
                email_payload["html"] = html_body
            else:
                # Use professional HTML template
                from app.services.email_templates import create_email_html
                email_payload["html"] = create_email_html(body)
            
            # Always include plain text version for deliverability
            email_payload["text"] = body
            
            # Add optional fields
            if reply_to:
                email_payload["reply_to"] = reply_to
            elif settings.INBOUND_EMAIL:
                # Use inbound email for reply tracking if configured
                email_payload["reply_to"] = settings.INBOUND_EMAIL
            
            logger.info(f"📧 Sending email to {to_email} | Subject: {subject[:50]}...")
            
            # Send via Resend
            response = resend.Emails.send(email_payload)
            
            email_id = response.get('id', 'unknown') if isinstance(response, dict) else getattr(response, 'id', 'unknown')
            
            logger.info(f"✅ Email sent successfully to {to_email} | ID: {email_id}")
            
            return {
                "success": True,
                "email_id": email_id,
                "to": to_email,
                "subject": subject
            }
            
        except (ValidationError, PermanentError, TransientError, RateLimitError):
            # Re-raise our custom exceptions
            raise
        except Exception as e:
            logger.error(f"❌ Failed to send email to {to_email}: {str(e)}")
            raise cls._categorize_error(e, to_email, subject)
    
    @classmethod
    def send_bulk_emails(
        cls,
        emails: List[Dict[str, Any]],
        fail_fast: bool = False
    ) -> Dict[str, Any]:
        """
        Send multiple emails with proper rate limiting.
        
        Args:
            emails: List of email dicts with to_email, subject, body
            fail_fast: If True, stop on first failure
            
        Returns:
            dict with success_count, failure_count, results
        """
        results = []
        success_count = 0
        failure_count = 0
        
        for email_data in emails:
            try:
                result = cls.send_email(
                    to_email=email_data['to_email'],
                    subject=email_data['subject'],
                    body=email_data['body'],
                    html_body=email_data.get('html_body'),
                    reply_to=email_data.get('reply_to')
                )
                results.append({"status": "sent", **result})
                success_count += 1
            except Exception as e:
                failure_count += 1
                results.append({
                    "status": "failed",
                    "to": email_data.get('to_email'),
                    "error": str(e)
                })
                if fail_fast:
                    break
        
        return {
            "success_count": success_count,
            "failure_count": failure_count,
            "results": results
        }


# Create singleton instance
email_service = EmailService()


def send_email(
    to_email: str,
    subject: str,
    body: str,
    from_email: Optional[str] = None,
    from_name: Optional[str] = None,
    html_body: Optional[str] = None,
    reply_to: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Convenience function for sending emails.
    
    This is the main interface used by workflows to send emails.
    Wraps the EmailService.send_email method.
    
    Args:
        to_email: Recipient email address
        subject: Email subject line
        body: Email body content
        from_email: Optional custom sender email
        from_name: Optional sender display name
        html_body: Optional HTML body
        reply_to: Optional reply-to address
        metadata: Optional metadata
        
    Returns:
        dict: Response from email service
        
    Raises:
        EmailSendError: If email sending fails
    """
    return email_service.send_email(
        to_email=to_email,
        subject=subject,
        body=body,
        from_email=from_email,
        from_name=from_name,
        html_body=html_body,
        reply_to=reply_to,
        metadata=metadata
    )
