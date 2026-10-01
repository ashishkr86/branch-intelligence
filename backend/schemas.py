"""
Pydantic models for request/response validation.
"""

from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


# ═══════════════════════════════════════════════════════════════
# AUTH
# ═══════════════════════════════════════════════════════════════

class LoginRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=100)


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)
    full_name: str | None = Field(None, max_length=150)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime
    user: dict


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    fullName: str | None
    role: str


class ChangePasswordRequest(BaseModel):
    old_password: str = Field(..., min_length=6)
    new_password: str = Field(..., min_length=6, max_length=100)


# ═══════════════════════════════════════════════════════════════
# AUDIT
# ═══════════════════════════════════════════════════════════════

class AuditEntry(BaseModel):
    id: int
    action: str
    entity: str | None
    entity_id: str | None
    ip_address: str | None
    details: str | None
    created_at: datetime

    class Config:
        from_attributes = True