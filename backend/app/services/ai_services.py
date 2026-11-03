import logging
from typing import Optional, Dict, Any
import google.generativeai as genai
from app.core.config import settings

logger = logging.getLogger(__name__)

# Configure Gemini
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)
    logger.info("✅ Gemini API configured successfully")
else:
    logger.warning("⚠️ GEMINI_API_KEY not set - AI email generation will fail")


def _build_lead_context(lead: Dict[str, Any]) -> str:
    """
    Build a rich context string from lead data for personalization.
    
    Args:
        lead: Dictionary containing lead information
        
    Returns:
        Formatted string with lead context
    """
    context_parts = []
    
    # Name
    first_name = lead.get("first_name") or ""
    last_name = lead.get("last_name") or ""
    full_name = lead.get("full_name") or f"{first_name} {last_name}".strip()
    
    if full_name:
        context_parts.append(f"Name: {full_name}")
    
    # Company
    company = lead.get("company")
    if company:
        context_parts.append(f"Company: {company}")
    
    # Job title
    job_title = lead.get("job_title")
    if job_title:
        context_parts.append(f"Role: {job_title}")
    
    # LinkedIn (indicates B2B professional)
    linkedin_url = lead.get("linkedin_url")
    if linkedin_url:
        context_parts.append(f"LinkedIn: {linkedin_url}")
    
    # Website
    website = lead.get("website")
    if website:
        context_parts.append(f"Website: {website}")
    
    # Custom fields
    custom_fields = lead.get("custom_fields") or {}
    for key, value in custom_fields.items():
        if value:
            context_parts.append(f"{key}: {value}")
    
    return "\n".join(context_parts) if context_parts else "No additional context available"


def _build_campaign_context(campaign_config: Dict[str, Any]) -> str:
    """
    Build campaign context for email generation.
    
    Args:
        campaign_config: Dictionary containing campaign settings
        
    Returns:
        Formatted string with campaign context
    """
    context_parts = []
    
    campaign_name = campaign_config.get("name")
    if campaign_name:
        context_parts.append(f"Campaign: {campaign_name}")
    
    target_audience = campaign_config.get("target_audience")
    if target_audience:
        context_parts.append(f"Target Audience: {target_audience}")
    
    value_proposition = campaign_config.get("value_proposition")
    if value_proposition:
        context_parts.append(f"Value Proposition: {value_proposition}")
    
    tone = campaign_config.get("tone", "professional")
    context_parts.append(f"Tone: {tone}")
    
    return "\n".join(context_parts)


def _get_tone_instructions(tone: str) -> str:
    """
    Get specific writing instructions based on tone.
    
    Args:
        tone: The desired email tone
        
    Returns:
        Instructions for the AI model
    """
    tone_map = {
        "professional": "Use formal language, be respectful of their time, maintain business etiquette",
        "friendly": "Be warm and approachable, use conversational language, feel like a peer reaching out",
        "casual": "Be relaxed and informal, use everyday language, but still professional",
        "formal": "Use highly formal language, traditional business letter style, very respectful",
        "enthusiastic": "Show genuine excitement, use energetic language, be positive and upbeat",
        "direct": "Get straight to the point, no fluff, clear and concise",
    }
    return tone_map.get(tone.lower(), tone_map["professional"])


def generate_email_content(
    lead_name: str,
    company: str,
    purpose: str = "initial_outreach",
    lead: Optional[Dict[str, Any]] = None,
    campaign_config: Optional[Dict[str, Any]] = None,
    sender_name: Optional[str] = None
) -> Dict[str, str]:
    """
    Generate personalized, professional email content using Gemini AI.
    
    Args:
        lead_name: Name of the lead (for backward compatibility)
        company: Lead's company name (for backward compatibility)
        purpose: Either 'initial_outreach' or 'followup'
        lead: Full lead dictionary with all available data
        campaign_config: Campaign configuration with target audience, value prop, etc.
        sender_name: Name of the sender for signature
    
    Returns:
        dict with 'subject' and 'body' keys
    """
    # Use provided lead data or construct minimal version
    if lead is None:
        lead = {
            "first_name": lead_name,
            "company": company
        }
    
    if campaign_config is None:
        campaign_config = {
            "name": "Sales Outreach",
            "tone": "professional"
        }
    
    # Extract key info
    first_name = lead.get("first_name") or lead_name or "there"
    company_name = lead.get("company") or company or "your company"
    job_title = lead.get("job_title") or ""
    tone = campaign_config.get("tone", "professional")
    value_proposition = campaign_config.get("value_proposition", "")
    target_audience = campaign_config.get("target_audience", "")
    
    # Use configured sender name or fall back to settings
    sender = sender_name or settings.FROM_NAME or "The Team"
    company_brand = settings.COMPANY_NAME or "Nudge"
    
    # Build rich context
    lead_context = _build_lead_context(lead)
    campaign_context = _build_campaign_context(campaign_config)
    tone_instructions = _get_tone_instructions(tone)
    
    if purpose == "initial_outreach":
        prompt = f"""You are an expert sales copywriter. Write a compelling cold outreach email.

=== LEAD INFORMATION ===
{lead_context}

=== CAMPAIGN CONTEXT ===
{campaign_context}

=== SENDER INFO ===
Sender Name: {sender}
Company: {company_brand}

=== EMAIL REQUIREMENTS ===
1. SUBJECT LINE (CRITICAL):
   - Must be on the FIRST line, format: "Subject: [your subject]"
   - Make it specific and compelling (not generic like "Quick question")
   - Reference something specific about the lead or their company if possible
   - Examples of GOOD subjects:
     * "Subject: Helping {company_name}'s sales team close 30% more deals"
     * "Subject: {first_name}, quick idea for {company_name}'s outreach"
     * "Subject: Saw {company_name}'s growth - thought of something"
   - Avoid: "Subject: Quick intro", "Subject: Hello", "Subject: Question"

2. EMAIL BODY:
   - Start with a personalized opening that shows you've done research
   - If they have a job title, acknowledge their role
   - Clearly explain the value proposition: {value_proposition if value_proposition else f"how {company_brand} helps sales teams automate personalized outreach"}
   - Include 1-2 specific benefits relevant to their role/company
   - End with a clear, low-commitment call-to-action (e.g., 15-min call)
   - Sign off with the sender's name: "{sender}"
   - Keep it under 150 words total

3. TONE: {tone_instructions}

4. FORMAT:
   - Use short paragraphs (2-3 sentences max)
   - No bullet points in the first email
   - No placeholder text like [Your Name] or {{brackets}}
   - No emojis unless tone is "casual" or "friendly"

Write the email now. Start with "Subject:" on the first line:"""

    else:  # followup
        prompt = f"""You are an expert sales copywriter. Write a follow-up email for someone who didn't respond to the initial outreach.

=== LEAD INFORMATION ===
{lead_context}

=== CAMPAIGN CONTEXT ===
{campaign_context}

=== SENDER INFO ===
Sender Name: {sender}
Company: {company_brand}

=== EMAIL REQUIREMENTS ===
1. SUBJECT LINE (CRITICAL):
   - Must be on the FIRST line, format: "Subject: Re: [reference to original topic]"
   - Should feel like a natural reply/continuation
   - Examples of GOOD subjects:
     * "Subject: Re: Quick thought for {company_name}"
     * "Subject: Following up - {company_brand} for {company_name}"
     * "Subject: {first_name} - did you get a chance to see this?"

2. EMAIL BODY:
   - Acknowledge you've reached out before (don't be apologetic, just matter-of-fact)
   - Provide a NEW angle or additional value (not just "bumping this up")
   - Maybe mention a quick win or case study
   - Keep the ask simple and low-pressure
   - Sign off with: "{sender}"
   - Keep it under 100 words

3. TONE: {tone_instructions}
   - Not pushy or desperate
   - Respect their time

4. FORMAT:
   - Very short paragraphs
   - No placeholder text
   - No guilt-tripping language

Write the follow-up email now. Start with "Subject:" on the first line:"""

    try:
        # Use Gemini 1.5 Flash (fast, free tier friendly)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.7,
                max_output_tokens=500,
            )
        )
        
        generated_text = response.text.strip()
        
        # Parse subject and body from response
        lines = generated_text.split('\n', 1)
        
        if lines[0].lower().startswith('subject:'):
            subject = lines[0].replace('Subject:', '').replace('subject:', '').strip()
            # Remove any quotes around subject
            subject = subject.strip('"').strip("'")
            body = lines[1].strip() if len(lines) > 1 else generated_text
        else:
            # Fallback if model doesn't include subject line
            subject = _generate_fallback_subject(first_name, company_name, purpose)
            body = generated_text
        
        # Clean up the body
        body = _clean_email_body(body)
        
        logger.info(f"✅ Generated {purpose} email for {first_name} at {company_name}")
        
        return {
            "subject": subject,
            "body": body
        }
        
    except Exception as e:
        logger.error(f"❌ Gemini API error: {e}")
        # Return a professional fallback
        return _generate_fallback_email(
            first_name=first_name,
            company_name=company_name,
            job_title=job_title,
            purpose=purpose,
            sender=sender,
            company_brand=company_brand,
            value_proposition=value_proposition
        )


def _generate_fallback_subject(first_name: str, company_name: str, purpose: str) -> str:
    """
    Generate a fallback subject line when AI fails to include one.
    """
    if purpose == "followup":
        return f"Re: Quick thought for {company_name}"
    else:
        if company_name and company_name != "your company":
            return f"Helping {company_name}'s team with sales automation"
        else:
            return f"{first_name} - streamline your sales outreach?"


def _clean_email_body(body: str) -> str:
    """
    Clean up the email body text.
    """
    # Remove any stray "Subject:" lines that got included in body
    lines = body.split('\n')
    cleaned_lines = []
    for line in lines:
        if not line.lower().strip().startswith('subject:'):
            cleaned_lines.append(line)
    return '\n'.join(cleaned_lines).strip()


def _generate_fallback_email(
    first_name: str,
    company_name: str,
    job_title: str,
    purpose: str,
    sender: str,
    company_brand: str,
    value_proposition: str
) -> Dict[str, str]:
    """
    Generate a professional fallback email when AI is unavailable.
    """
    # Build personalized greeting
    greeting = f"Hi {first_name}," if first_name and first_name != "there" else "Hi there,"
    
    # Build role-aware opening
    if job_title:
        role_mention = f"As {job_title.lower().replace('the ', '')} at {company_name}, you likely understand "
    elif company_name and company_name != "your company":
        role_mention = f"Working at {company_name}, you likely understand "
    else:
        role_mention = "In your role, you likely understand "
    
    # Build value proposition
    if value_proposition:
        value_text = value_proposition
    else:
        value_text = "how challenging it can be to maintain personalized outreach at scale"
    
    if purpose == "initial_outreach":
        subject = f"Helping {company_name}'s team with sales automation" if company_name != "your company" else f"{first_name} - streamline your sales outreach?"
        
        body = f"""{greeting}

{role_mention}{value_text}.

We've built {company_brand} to help sales teams send highly personalized emails at scale, without sacrificing the human touch that gets replies.

Teams using our approach typically see 2-3x higher response rates compared to generic templates.

Would you have 15 minutes this week for a quick call? I'd love to show you how it works.

Best,
{sender}"""
    else:  # followup
        subject = f"Re: Quick thought for {company_name}" if company_name != "your company" else f"Following up, {first_name}"
        
        body = f"""{greeting}

I wanted to follow up on my previous email about helping your team with sales outreach.

One thing I didn't mention: {company_brand} includes AI-powered personalization that adapts to each prospect, so your emails feel handwritten even when sending hundreds.

Worth a quick 10-minute chat?

Best,
{sender}"""
    
    return {
        "subject": subject,
        "body": body
    }
