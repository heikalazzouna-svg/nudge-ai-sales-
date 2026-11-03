import uuid

def create_email_html(body: str, signature: str = None) -> str:
    """
    Wraps the email body in a professional HTML template.
    
    Args:
        body: The main content of the email (can contain basic HTML like <br>, <p>)
        signature: Optional signature block to append
        
    Returns:
        Full HTML string
    """
    # Generate unique ID to prevent Gmail clipping
    unique_id = str(uuid.uuid4())
    
    # Process body to ensure paragraphs are preserved if it's plain text
    if "<p>" not in body and "<br>" not in body:
        # Convert newlines to breaks for plain text input
        formatted_body = body.replace("\n", "<br>")
    else:
        formatted_body = body

    signature_html = ""
    if signature:
        signature_html = f"""
        <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; color: #475569; font-size: 16px; line-height: 24px;">
                {signature.replace(chr(10), '<br>')}
            </p>
        </div>
        """

    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Email</title>

<style>
body {{
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    margin: 0;
    padding: 0;
    background-color: #f4f6f9;
    color: #334155;
}}

.wrapper {{
    width: 100%;
    padding: 40px 0;
}}

.card {{
    max-width: 640px;
    margin: auto;
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 6px 20px rgba(0,0,0,0.08);
}}

.header {{
    background: linear-gradient(90deg, #4f46e5, #6366f1);
    padding: 24px;
    text-align: center;
    color: white;
    font-size: 20px;
    font-weight: 600;
}}

.content {{
    padding: 36px;
    font-size: 16px;
    line-height: 1.7;
}}

.button {{
    display: inline-block;
    background: #4f46e5;
    color: white;
    padding: 12px 22px;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 500;
    margin-top: 16px;
}}

.footer {{
    text-align: center;
    padding: 20px;
    font-size: 12px;
    color: #94a3b8;
    border-top: 1px solid #e2e8f0;
}}
</style>
</head>

<body>
<div class="wrapper">
    <div class="card">

        <div class="header">
            Nudge Platform
        </div>

        <div class="content">
            {formatted_body}
            {signature_html}
        </div>

        <div class="footer">
            If you no longer wish to receive these emails,
            <a href="{{unsubscribe_url}}">unsubscribe</a>.
            <span style="display:none;">{unique_id}</span>
        </div>

    </div>
</div>
</body>
</html>
"""
