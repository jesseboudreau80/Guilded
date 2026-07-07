from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")

    # App
    app_name: str = "Plutus API"
    debug: bool = False

    # Database — must be postgresql+asyncpg:// format
    database_url: str = "postgresql+asyncpg://guilded:guilded@localhost:5432/guilded"

    # Auth
    secret_key: str = "change-me-in-production"
    access_token_expire_days: int = 30

    # ── Stripe ────────────────────────────────────────────────────────────────
    # STRIPE_MODE selects the active billing environment.
    # "test" → development / beta  |  "live" → real money
    # See STRIPE_LIVE_CUTOVER.md before switching to live.
    stripe_mode: str = "test"

    # Active Stripe credentials for the current STRIPE_MODE
    stripe_secret_key:     str = ""
    stripe_webhook_secret: str = ""

    # ── Stripe price IDs (dual-environment) ──────────────────────────────────
    # Recurring subscriptions — JOURNEYMAN ($25/mo) and MASTER ($49/mo)
    stripe_test_journeyman_price_id: str = ""
    stripe_test_master_price_id:     str = ""

    # Live Stripe products (2026):
    #   JOURNEYMAN: prod_UTsZYlIpw87Nmv  → price_1TUuobKKUUjkHBcxFAqKggtu
    #   MASTER:     prod_UTsffumfGfsBBx  → price_1TUuuWKKUUjkHBcxhabmw62I
    stripe_live_journeyman_price_id: str = ""
    stripe_live_master_price_id:     str = ""

    # ── Founders Pass price IDs (one-time payments) ───────────────────────────
    # STANDARD: $195 one-time — full lifetime access
    # PARTNER:  $97 one-time  — community/partner pricing
    stripe_test_founders_standard_price_id: str = ""
    stripe_test_founders_partner_price_id:  str = ""
    stripe_live_founders_standard_price_id: str = ""
    stripe_live_founders_partner_price_id:  str = ""

    # ── Fair Use Thresholds (architecture only — not enforced yet) ────────────
    # These values define monitoring thresholds. No requests are blocked.
    # Set to 0 to disable monitoring for that dimension.
    fair_use_ai_daily_max:   int = 500   # AI messages per user per day before flagging
    fair_use_ocr_daily_max:  int = 50    # OCR uploads per user per day before flagging
    fair_use_enabled:        bool = False  # Master switch — off until explicitly enabled

    # OpenAI
    openai_api_key: str = ""

    # Email — Resend
    resend_api_key: str = ""
    email_from:     str = "Plutus <noreply@guilded.finance>"

    # Aegis Governance Layer
    aegis_url:              str   = ""
    aegis_service_key:      str   = ""
    aegis_timeout:          float = 3.0
    aegis_fallback_enabled: bool  = True

    # Beta access control
    beta_invite_required: bool = False

    # URLs
    nextauth_url: str = "http://localhost:3000"

    # ── Stripe mode helpers ───────────────────────────────────────────────────

    @property
    def stripe_is_live(self) -> bool:
        return self.stripe_mode.lower() == "live"

    @property
    def stripe_founders_standard_price_id(self) -> str:
        return (
            self.stripe_live_founders_standard_price_id
            if self.stripe_is_live
            else self.stripe_test_founders_standard_price_id
        )

    @property
    def stripe_founders_partner_price_id(self) -> str:
        return (
            self.stripe_live_founders_partner_price_id
            if self.stripe_is_live
            else self.stripe_test_founders_partner_price_id
        )

    @property
    def stripe_journeyman_price_id(self) -> str:
        """
        Active Journeyman price ID for the current STRIPE_MODE.
        Evaluated once at Stripe router import time — returns the correct value
        for test or live mode based on env vars loaded at startup.
        """
        return (
            self.stripe_live_journeyman_price_id
            if self.stripe_is_live
            else self.stripe_test_journeyman_price_id
        )

    @property
    def stripe_master_price_id(self) -> str:
        """Active Master price ID for the current STRIPE_MODE."""
        return (
            self.stripe_live_master_price_id
            if self.stripe_is_live
            else self.stripe_test_master_price_id
        )

    def stripe_mode_warnings(self) -> list[str]:
        """
        Returns warning strings when Stripe configuration is inconsistent.
        Called at startup — warns but does not block service startup.
        """
        warnings: list[str] = []
        key = self.stripe_secret_key

        if not key:
            warnings.append("STRIPE_SECRET_KEY not set — billing will not function.")
            return warnings

        is_test_key  = key.startswith("sk_test_")
        is_live_key  = key.startswith("sk_live_")
        mode_is_live = self.stripe_is_live

        if mode_is_live and is_test_key:
            warnings.append(
                "STRIPE_MODE=live but STRIPE_SECRET_KEY is a test key (sk_test_...). "
                "Real payments will fail. Use a live key or set STRIPE_MODE=test."
            )
        if not mode_is_live and is_live_key:
            warnings.append(
                "STRIPE_MODE=test but STRIPE_SECRET_KEY is a LIVE key (sk_live_...). "
                "You are billing real customers. Confirm this is intentional."
            )
        if mode_is_live and not self.stripe_live_journeyman_price_id:
            warnings.append(
                "STRIPE_MODE=live but STRIPE_LIVE_JOURNEYMAN_PRICE_ID not set. "
                "Journeyman checkout will fail in live mode."
            )
        if mode_is_live and not self.stripe_live_master_price_id:
            warnings.append(
                "STRIPE_MODE=live but STRIPE_LIVE_MASTER_PRICE_ID not set. "
                "Master checkout will fail in live mode."
            )

        return warnings


settings = Settings()
