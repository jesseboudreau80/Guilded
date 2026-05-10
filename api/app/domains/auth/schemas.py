from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str | None
    name: str | None


class MeResponse(BaseModel):
    id: str
    name: str | None
    email: str | None
    tier: str
    subscription_status: str
    ai_usage_count: int
    successful_billing_count: int
