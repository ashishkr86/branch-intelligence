"""
/api/auth — Login, register, me, logout.
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from db import get_db
from schemas import LoginRequest, RegisterRequest, ChangePasswordRequest
from auth import create_access_token, decode_token, get_current_user, require_admin
from services import user_service

router = APIRouter()


@router.post("/login")
def login(
    body: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    user = user_service.authenticate(db, body.username, body.password)
    if not user:
        # Log failed attempt
        user_service.log_action(
            db, None, "LOGIN_FAILED", "user", body.username,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token_data = create_access_token(
        user_id=user["id"],
        username=user["username"],
        role=user["role"],
    )

    user_service.create_session(
        db, user["id"], token_data["jti"], token_data["expires_at"],
        user_agent=request.headers.get("user-agent", ""),
    )

    user_service.log_action(
        db, user["id"], "LOGIN", "user", str(user["id"]),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    return {
        "access_token": token_data["token"],
        "token_type": "bearer",
        "expires_at": token_data["expires_at"].isoformat(),
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "fullName": user["fullName"],
            "role": user["role"],
        },
    }


@router.post("/register")
def register(
    body: RegisterRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    # Check existing
    if user_service.get_by_username(db, body.username):
        raise HTTPException(status_code=400, detail="Username already exists")

    user = user_service.create_user(
        db,
        username=body.username,
        email=body.email,
        password=body.password,
        full_name=body.full_name,
        role="viewer",
    )

    user_service.log_action(
        db, user["id"], "REGISTER", "user", str(user["id"]),
        ip_address=request.client.host if request.client else None,
    )

    # Auto-login after register
    token_data = create_access_token(user["id"], user["username"], user["role"])
    user_service.create_session(
        db, user["id"], token_data["jti"], token_data["expires_at"],
    )

    return {
        "access_token": token_data["token"],
        "token_type": "bearer",
        "expires_at": token_data["expires_at"].isoformat(),
        "user": user,
    }


@router.get("/me")
def me(user: dict = Depends(get_current_user)):
    return user


@router.post("/logout")
def logout(
    request: Request,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    auth_header = request.headers.get("authorization", "")
    token = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else ""
    payload = decode_token(token)
    if payload and payload.get("jti"):
        user_service.revoke_session(db, payload["jti"])

    user_service.log_action(
        db, user["id"], "LOGOUT", "user", str(user["id"]),
        ip_address=request.client.host if request.client else None,
    )
    return {"message": "Logged out"}


@router.post("/change-password")
def change_password(
    body: ChangePasswordRequest,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ok = user_service.change_password(
        db, user["id"], body.old_password, body.new_password
    )
    if not ok:
        raise HTTPException(status_code=400, detail="Old password incorrect")

    user_service.log_action(
        db, user["id"], "CHANGE_PASSWORD", "user", str(user["id"]),
    )
    return {"message": "Password changed"}


# ═══════════════════════════════════════════════════════════════
# ADMIN ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@router.get("/users")
def list_users(
    user: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return {"users": user_service.list_users(db)}


@router.get("/audit")
def audit_log(
    limit: int = 50,
    user: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return {"entries": user_service.recent_audit(db, limit=limit)}
