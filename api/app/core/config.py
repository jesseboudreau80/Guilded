from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")

    # App
    app_name: str = "Guilded API"
    debug: bool = False

    # Database — must be postgresql+asyncpg:// format
    database_url: str = "postgresql+asyncpg://guilded:guilded@localhost:5432/guilded"

    # Auth
    secret_key: str = "change-me-in-production"
    access_token_expire_days: int = 30

    # Stripe — env vars: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
    #                     STRIPE_JOURNEYMAN_PRICE_ID, STRIPE_MASTER_PRICE_ID
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_journeyman_price_id: str = ""
    stripe_master_price_id: str = ""

    # OpenAI
    openai_api_key: str = ""

    # Email — Resend (https://resend.com)
    # pip install resend, then set RESEND_API_KEY
    resend_api_key: str = ""
    email_from:     str = "Guilded <noreply@guilded.finance>"

    # Aegis Governance Layer
    # Guilded is a governed application in the Aegis ecosystem.
    # AEGIS_URL          — base URL of the Aegis API  (e.g. https://aegis.jesseboudreau.com)
    # AEGIS_SERVICE_KEY  — HMAC signing key for authenticated service requests
    # AEGIS_TIMEOUT      — seconds to wait for Aegis before falling back to local decisions
    # AEGIS_FALLBACK     — allow local entitlement decisions when Aegis is unreachable
    aegis_url:             str   = ""
    aegis_service_key:     str   = ""
    aegis_timeout:         float = 3.0
    aegis_fallback_enabled: bool  = True

    # URLs
    nextauth_url: str = "http://localhost:3000"


settings = Settings()
