import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.core.config import settings
from app.core.database import AsyncSessionLocal, Base, engine

# Import all models so Base.metadata.create_all registers them.
import app.models  # noqa: F401

from app.domains.auth.router import router as auth_router
from app.domains.ai.router import router as ai_router
from app.domains.modules.router import router as modules_router
from app.domains.lessons.router import router as lessons_router
from app.domains.progress.router import router as progress_router
from app.domains.consultations.router import router as consultations_router
from app.domains.stripe.router import router as stripe_router
from app.domains.loot_ledger.router import router as loot_ledger_router
from app.domains.bankruptcy.router import router as bankruptcy_router
from app.domains.audit.router import router as audit_router
from app.domains.dispute.router import router as dispute_router
from app.domains.academy.router import router as academy_router
from app.domains.admin.router  import router as admin_router
from app.domains.aegis.router    import router as aegis_router
from app.domains.feedback.router import router as feedback_router
from app.domains.academy.service import seed_academy_curriculum

logger = logging.getLogger(__name__)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


# ── Production environment validation ────────────────────────────────────────

def _check_env() -> None:
    """
    Logs a startup environment health report.
    Does NOT block startup — only warns.
    Missing required vars will cause runtime errors; this makes them visible early.
    """
    REQUIRED = {
        "SECRET_KEY":             (settings.secret_key,             settings.secret_key == "change-me-in-production"),
        "DATABASE_URL":           (settings.database_url,           False),
        "OPENAI_API_KEY":         (settings.openai_api_key,         not settings.openai_api_key),
    }
    BILLING = {
        "STRIPE_SECRET_KEY":                    (settings.stripe_secret_key,                    not settings.stripe_secret_key),
        "STRIPE_WEBHOOK_SECRET":                (settings.stripe_webhook_secret,                not settings.stripe_webhook_secret),
        "STRIPE_JOURNEYMAN_PRICE_ID":           (settings.stripe_journeyman_price_id,           not settings.stripe_journeyman_price_id),
        "STRIPE_MASTER_PRICE_ID":               (settings.stripe_master_price_id,               not settings.stripe_master_price_id),
        "STRIPE_FOUNDERS_STANDARD_PRICE_ID":    (settings.stripe_founders_standard_price_id,    not settings.stripe_founders_standard_price_id),
        "STRIPE_FOUNDERS_PARTNER_PRICE_ID":     (settings.stripe_founders_partner_price_id,     not settings.stripe_founders_partner_price_id),
    }
    OPTIONAL = {
        "RESEND_API_KEY":  settings.resend_api_key,
        "NEXTAUTH_URL":    settings.nextauth_url,
    }

    lines = ["", "=" * 52, "  GUILDED STARTUP ENV CHECK", "=" * 52]

    all_ok = True
    for name, (val, is_default) in {**REQUIRED, **BILLING}.items():
        if not val or is_default:
            lines.append(f"  ⚠️  {name:<36} — MISSING / DEFAULT")
            all_ok = False
        else:
            masked = val[:6] + "…" if len(val) > 6 else val
            lines.append(f"  ✅  {name:<36} — {masked}")

    lines.append("  —" * 26)
    for name, val in OPTIONAL.items():
        status = "set" if val else "not set (optional)"
        lines.append(f"  💡  {name:<36} — {status}")

    # Stripe mode consistency check
    stripe_warnings = settings.stripe_mode_warnings()
    lines.append("  —" * 26)
    lines.append(f"  Stripe mode: {settings.stripe_mode.upper()}")
    for w in stripe_warnings:
        lines.append(f"  ⚠️  {w}")
    if not stripe_warnings:
        lines.append(f"  ✅  Stripe configuration appears consistent with {settings.stripe_mode} mode.")

    lines.append("=" * 52)
    if all_ok:
        lines.append("  All required vars are configured.")
    else:
        lines.append("  ⚠️  Some required vars are missing — check before launch.")
    lines.append("=" * 52 + "\n")

    logger.info("\n".join(lines))

ALLOWED_ORIGINS = [
    "https://guilded.jesseboudreau.com",
    "https://plutus.jesseboudreau.com",  # Plutus rebrand domain (2026-07-03)
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    _check_env()
    logger.info("CORS allowed origins: %s", ALLOWED_ORIGINS)
    # Fail loudly on startup if the database is unreachable.
    # create_all is a no-op for tables that already exist (safe for prod).
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables verified/created")

        # Safe column additions for existing deployments.
        # ALTER TABLE ... ADD COLUMN IF NOT EXISTS is idempotent — safe every startup.
        _MIGRATIONS = [
            # audit_accounts — OCR confidence fields
            "ALTER TABLE audit_accounts ADD COLUMN IF NOT EXISTS account_number VARCHAR",
            "ALTER TABLE audit_accounts ADD COLUMN IF NOT EXISTS confidence VARCHAR(10)",
            "ALTER TABLE audit_accounts ADD COLUMN IF NOT EXISTS extraction_flags JSONB",
            # audits — OCR metadata
            "ALTER TABLE audits ADD COLUMN IF NOT EXISTS ocr_char_count INTEGER",
            "ALTER TABLE audits ADD COLUMN IF NOT EXISTS ocr_page_count INTEGER",
            # audit_recommendations — account traceability
            "ALTER TABLE audit_recommendations ADD COLUMN IF NOT EXISTS account_id VARCHAR",
            "ALTER TABLE audits ADD COLUMN IF NOT EXISTS pii_scan_json JSONB",
            # users — founders pass + lifetime access
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS founders_pass BOOLEAN NOT NULL DEFAULT FALSE",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS lifetime_access BOOLEAN NOT NULL DEFAULT FALSE",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS founders_pass_type VARCHAR",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS founders_pass_date TIMESTAMPTZ",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS promo_code_used VARCHAR",
        ]
        from sqlalchemy import text as _sql_text
        try:
            async with engine.begin() as conn:
                for stmt in _MIGRATIONS:
                    await conn.execute(_sql_text(stmt))
            logger.info("Column migrations applied (%d statements)", len(_MIGRATIONS))
        except Exception as _col_exc:
            logger.warning("Column migration warning (non-fatal): %s", _col_exc)

        # Seed academy curriculum (idempotent — no-op after first run)
        async with AsyncSessionLocal() as seed_db:
            await seed_academy_curriculum(seed_db)
    except Exception as exc:
        logger.critical("Cannot reach database: %s", exc)
        raise

    yield

    await engine.dispose()


app = FastAPI(
    title=settings.app_name,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# GZip must be added first (inner) so CORS is outermost.
# Starlette builds the middleware stack LIFO — last added = outermost.
# CORS must intercept OPTIONS preflights before any other layer touches them.
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(ai_router)
app.include_router(modules_router)
app.include_router(lessons_router)
app.include_router(progress_router)
app.include_router(consultations_router)
app.include_router(stripe_router)
app.include_router(loot_ledger_router)
app.include_router(bankruptcy_router)
app.include_router(audit_router)
app.include_router(dispute_router)
app.include_router(academy_router)
app.include_router(admin_router)
app.include_router(aegis_router)
app.include_router(feedback_router)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "2.0.0", "service": "guilded"}


@app.get("/whoami")
async def whoami():
    return {"app": "Plutus API", "version": "2.0.0", "port": 8100, "environment": "production", "owner": "jesse"}


@app.get("/.well-known/aegis-meta")
async def aegis_meta():
    import os, time
    return {
        "pack_id": "guilded", "pack_name": "Plutus", "version": "2.0.0",
        "environment": "production", "frontend_port": 3000, "backend_port": 8100,
        "auth_required": True, "governance_enabled": False, "replay_supported": False,
        "observability_supported": False, "systemd_service": None,
        "tunnel_name": "reselleros", "uptime_s": None,
        "build_sha": os.environ.get("GIT_SHA"), "owner": "jesse",
        "doctrine_version": "2026-05-18", "runtime_type": "nextjs+fastapi",
        "capabilities": ["guild_management", "ai_tutoring", "billing", "academy"],
    }
