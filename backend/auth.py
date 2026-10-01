"""
Authentication helpers — password hashing + JWT tokens.
"""

import os
import uuid
from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import text
from sqlalchemy.orm import Session

from db import get_db

# ─── Config ───
JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-production-please-use-a-long-random-string")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "24"))

# ─── Password hashing ───
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ─── OAuth2 scheme (FastAPI docs integration) ───
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


# ═══════════════════════════════════════════════════════════════
# PASSWORD
# ═══════════════════════════════════════════════════════════════

def hash_password(plain: str) -> str:
    """Hash a password with bcrypt."""
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Verify password against hash."""
    try:
        return pwd_context.verify(plain, hashed)
    except Exception:
        return False


# ═══════════════════════════════════════════════════════════════
# JWT
# ═══════════════════════════════════════════════════════════════

def create_access_token(user_id: int, username: str, role: str) -> dict:
    """Create JWT. Returns { token, jti, expires_at }."""
    jti = uuid.uuid4().hex
    now = datetime.utcnow()
    expires = now + timedelta(hours=JWT_EXPIRE_HOURS)

    payload = {
        "sub": str(user_id),
        "username": username,
        "role": role,
        "jti": jti,
        "iat": now,
        "exp": expires,
    }

    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return {"token": token, "jti": jti, "expires_at": expires}


def decode_token(token: str) -> Optional[dict]:
    """Decode JWT. Returns payload or None."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        return None


# ═══════════════════════════════════════════════════════════════
# FASTAPI DEPENDENCIES
# ═══════════════════════════════════════════════════════════════

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> dict:
    """Validate token, return current user. Raises 401 if invalid."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check session is not revoked
    jti = payload.get("jti")
    if jti:
        revoked = db.execute(
            text("SELECT REVOKED FROM sessions WHERE TOKEN_JTI = :jti"),
            {"jti": jti},
        ).fetchone()
        if revoked and revoked[0]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token revoked",
            )

    # Load user
    user = db.execute(
        text("""
            SELECT ID, USERNAME, EMAIL, FULL_NAME, ROLE, IS_ACTIVE
            FROM users WHERE ID = :id
        """),
        {"id": int(payload["sub"])},
    ).fetchone()

    if not user or not user[5]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User inactive or not found",
        )

    return {
        "id": user[0],
        "username": user[1],
        "email": user[2],
        "fullName": user[3],
        "role": user[4],
    }


def require_role(*allowed_roles: str):
    """Dependency factory: require specific role(s)."""
    def checker(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user['role']}' not allowed. Required: {', '.join(allowed_roles)}",
            )
        return user
    return checker


# ─── Convenience dependencies ───
require_admin = require_role("admin")
require_analyst = require_role("admin", "analyst")
require_any = get_current_user