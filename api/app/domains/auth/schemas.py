from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    name:        str
    email:       EmailStr
    password:    str
    invite_code: str | None = None   # required when settings.beta_invite_required is True


class LoginRequest(BaseModel):
    email:    EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token:        str
    new_password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str | None
    name:  str | None


class MeResponse(BaseModel):
    id:                       str
    name:                     str | None
    email:                    str | None
    tier:                     str
    subscription_status:      str
    ai_usage_count:           int
    successful_billing_count: int
    founders_pass:            bool = False
    lifetime_access:          bool = False
    founders_pass_type:       str | None = None
    founders_pass_date:       str | None = None
    promo_code_used:          str | None = None
