from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str 
    
    # API
    API_V1_STR: str 
    PROJECT_NAME: str 
    
    # Email
    RESEND_API_KEY: str
    RESEND_WEBHOOK_SECRET: str = ""  # Webhook signing secret from Resend dashboard
    FROM_EMAIL: str = "hello@nudgesends.com"  # Default sender email
    FROM_NAME: str = "Nudge Team"  # Default sender display name
    COMPANY_NAME: str = "Nudge"  # Company name for email signatures
    INBOUND_EMAIL: str = ""  # For reply tracking, e.g., "replies@yourdomain.resend.app"
    
    # AI (Gemini - Free Tier: 15 RPM, 1M tokens/day)
    GEMINI_API_KEY: str = ""
    
    # Inngest
    INNGEST_EVENT_KEY: str = ""  # Optional for dev mode
    INNGEST_SIGNING_KEY: str = ""  # Optional for dev mode
    INNGEST_DEV_MODE: bool = True  # Set to False in production
    INNGEST_BASE_URL: str = "http://localhost:8000"  # Your app's base URL
    
    # Clerk Authentication (for webhook user sync)
    CLERK_WEBHOOK_SECRET: str = ""  # Optional for development
    
    # CORS
    FRONTEND_URL: str = "http://localhost:3000"  # Default for development
    ALLOWED_ORIGINS: str = "https://www.nudgesends.com,http://localhost:3000,http://localhost:3001"  # Comma-separated

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Allow extra fields in .env
    
    @property
    def cors_origins(self) -> list[str]:
        """Parse ALLOWED_ORIGINS into a list."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]


settings = Settings()
