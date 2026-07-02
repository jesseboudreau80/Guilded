import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.core.config import settings
from app.core.deps import DB, CurrentUser
from app.core.security import create_access_token, hash_password, verify_password
from app.lib.email import email_service
from app.models.invite_code import InviteCode
from app.models.password_reset import PasswordResetToken
from app.models.user import User

from .schemas import (
    ForgotPasswordRequest, LoginRequest, MeResponse,
    RegisterRequest, ResetPasswordRequest, TokenResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

_RESET_EXPIRY_HOURS = 1


# ── Invite code validation ────────────────────────────────────────────────────

async def _validate_invite_code(db, raw_code: str | None) -> None:
    if not settings.beta_invite_required:
        return

    if not raw_code or not raw_code.strip():
        raise HTTPException(400, "An invite code is required during beta. Contact the team for access.")

    code = raw_code.strip().upper()
    result = await db.execute(
        select(InviteCode).where(InviteCode.code == code, InviteCode.is_active == True)  # noqa: E712
    )
    invite = result.scalar_one_or_none()

    if not invite:
        raise HTTPException(400, "Invalid invite code. Please check your code and try again.")
    if invite.use_count >= invite.max_uses:
        raise HTTPException(400, "This invite code has already been used.")

    invite.use_count += 1
    await db.flush()
    logger.info("Invite code used: %s (use %d/%d)", code, invite.use_count, invite.max_uses)


# ── Register ──────────────────────────────────────────────────────────────────

@router.post("/register", status_code=201)
async def register(body: RegisterRequest, db: DB):
    if len(body.name.strip()) < 2:
        raise HTTPException(400, "Name must be at least 2 characters")
    if len(body.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")

    await _validate_invite_code(db, body.invite_code)

    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Email already registered")

    reset_date = datetime.utcnow() + timedelta(days=30)
    user = User(
        name=body.name.strip(),
        email=body.email,
        password_hash=hash_password(body.password),
        ai_usage_reset_date=reset_date,
    )
    db.add(user)
    await db.flush()

    if user.email:
        try:
            await email_service.send_welcome(to_email=user.email, user_name=user.name or "")
        except Exception:
            logger.exception("Welcome email failed for new user %s", user.id)

    return {"id": user.id, "email": user.email}


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: DB):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash:
        raise HTTPException(401, "Invalid credentials")
    if not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")

    token = create_access_token(user.id)
    return TokenResponse(access_token=token, user_id=user.id, email=user.email, name=user.name)


# ── Me ────────────────────────────────────────────────────────────────────────

@router.get("/me", response_model=MeResponse)
async def me(current_user: CurrentUser):
    return MeResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        tier=current_user.tier.value,
        subscription_status=current_user.subscription_status.value,
        ai_usage_count=current_user.ai_usage_count,
        successful_billing_count=current_user.successful_billing_count,
        founders_pass=current_user.founders_pass,
        lifetime_access=current_user.lifetime_access,
        founders_pass_type=current_user.founders_pass_type,
        founders_pass_date=(
            current_user.founders_pass_date.isoformat()
            if current_user.founders_pass_date else None
        ),
        promo_code_used=current_user.promo_code_used,
    )


# ── Forgot password ───────────────────────────────────────────────────────────

@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest, db: DB):
    """
    Request a password reset link via email.

    Always returns 200 to prevent email enumeration attacks.
    Reset link expires in 1 hour and is single-use.
    """
    result = await db.execute(select(User).where(User.email == body.email))
    user   = result.scalar_one_or_none()

    if user and user.email:
        expires_at = datetime.now(timezone.utc) + timedelta(hours=_RESET_EXPIRY_HOURS)
        prt = PasswordResetToken(user_id=user.id, expires_at=expires_at)
        db.add(prt)
        await db.flush()

        reset_url = f"{settings.nextauth_url}/reset-password?token={prt.token}"
        try:
            await email_service.send_password_reset(
                to_email     = user.email,
                user_name    = user.name or "",
                reset_url    = reset_url,
                expiry_hours = _RESET_EXPIRY_HOURS,
            )
            logger.info("Password reset email sent for user %s", user.id)
        except Exception:
            logger.exception("Password reset email failed for user %s", user.id)
    else:
        logger.info("Password reset requested for unknown email (not revealed to client)")

    return {"message": "If an account with that email exists, a reset link has been sent."}


# ── Reset password ────────────────────────────────────────────────────────────

@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest, db: DB):
    """
    Apply a password reset using a valid, unexpired, single-use token.

    Uses a generic error message to avoid leaking token validity information.
    """
    if len(body.new_password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")

    _INVALID = "This reset link is invalid, expired, or has already been used."

    result = await db.execute(
        select(PasswordResetToken).where(PasswordResetToken.token == body.token)
    )
    prt = result.scalar_one_or_none()

    if not prt:
        raise HTTPException(400, _INVALID)
    if prt.used_at is not None:
        raise HTTPException(400, _INVALID)

    expires = prt.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        raise HTTPException(400, _INVALID)

    user_result = await db.execute(select(User).where(User.id == prt.user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(400, _INVALID)

    user.password_hash = hash_password(body.new_password)
    prt.used_at        = datetime.now(timezone.utc)
    await db.flush()

    logger.info("Password reset applied for user %s", user.id)
    return {"message": "Password updated. You can now sign in with your new password."}
