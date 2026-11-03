import inngest
import inngest.fast_api
from app.workflows.campaign import inngest_client, send_campaign_sequence


def setup_inngest(app):
    """
    Configure Inngest serve endpoint on the FastAPI application.
    
    This registers the Inngest endpoint at /api/inngest/ which handles:
    - Function introspection (PUT request for registration)
    - Event handling (POST request for function invocations)
    
    Args:
        app: FastAPI application instance
    """
    # Serve Inngest at /api/inngest path
    inngest.fast_api.serve(
        app,
        inngest_client,
        [send_campaign_sequence],
        serve_path="/api/inngest"
    )


# Export the client and function for use elsewhere
__all__ = ["inngest_client", "send_campaign_sequence", "setup_inngest"]
