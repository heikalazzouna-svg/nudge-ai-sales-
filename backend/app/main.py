from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.ml import ml_instance 
from app.api.v1.router import api_router
from app.db.engine import create_db_and_tables
from app.api.v1.webhook import router as webhook_router
from app.api.v1.debug import router as debug_router
from app.api.v1.inngest import setup_inngest
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Create database tables on startup
    create_db_and_tables()
    yield
    # Cleanup on shutdown (if needed)


app = FastAPI(
    title="Nudge Backend",
    description="AI Powered Cold Emailing Tool",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware - Use environment configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,  # Use configured origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """Health check endpoint with authentication status."""
    return {
        "status": "ok",
        "auth": {
            "method": "clerk_id_header",
            "webhook_configured": bool(settings.CLERK_WEBHOOK_SECRET)
        }
    }

# Include routers
app.include_router(api_router, prefix="/api/v1")
app.include_router(webhook_router, prefix="/api/v1/webhook")
app.include_router(debug_router, prefix="/api/v1/debug", tags=["Debug"])

# Setup Inngest (registers endpoint at /api/inngest)
setup_inngest(app)
