import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.core.deps import DB, CurrentUser
from app.core.security import create_access_token, hash_password, verify_password
from app.lib.email import email_service
from app.models.user import User

from .schemas import LoginRequest, MeResponse, RegisterRequest, TokenResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", status_code=201)
async def register(body: RegisterRequest, db: DB):
    if len(body.name.strip()) < 2:
        raise HTTPException(400, "Name must be at least 2 characters")
    if len(body.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")

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

    # Send welcome email — fire-and-forget (failure does not block registration)
    if user.email:
        try:
            await email_service.send_welcome(
                to_email=user.email,
                user_name=user.name or "",
            )
        except Exception:
            logger.exception("Welcome email failed for new user %s", user.id)

    return {"id": user.id, "email": user.email}


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: DB):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash:
        raise HTTPException(401, "Invalid credentials")
    if not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")

    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        email=user.email,
        name=user.name,
    )


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
    )
