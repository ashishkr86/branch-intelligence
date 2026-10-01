"""
User CRUD operations + audit logging.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from auth import hash_password, verify_password


# ═══════════════════════════════════════════════════════════════
# USERS
# ═══════════════════════════════════════════════════════════════

def get_by_username(db: Session, username: str) -> Optional[dict]:
    row = db.execute(
        text("""
            SELECT ID, USERNAME, EMAIL, FULL_NAME, PASSWORD_HASH, ROLE, IS_ACTIVE
            FROM users WHERE USERNAME = :u
        """),
        {"u": username},
    ).fetchone()
    if not row:
        return None
    return {
        "id": row[0],
        "username": row[1],
        "email": row[2],
        "fullName": row[3],
        "passwordHash": row[4],
        "role": row[5],
        "isActive": bool(row[6]),
    }


def get_by_id(db: Session, user_id: int) -> Optional[dict]:
    row = db.execute(
        text("""
            SELECT ID, USERNAME, EMAIL, FULL_NAME, ROLE, IS_ACTIVE, LAST_LOGIN
            FROM users WHERE ID = :id
        """),
        {"id": user_id},
    ).fetchone()
    if not row:
        return None
    return {
        "id": row[0],
        "username": row[1],
        "email": row[2],
        "fullName": row[3],
        "role": row[4],
        "isActive": bool(row[5]),
        "lastLogin": row[6],
    }


def create_user(
    db: Session,
    username: str,
    email: str,
    password: str,
    full_name: str | None = None,
    role: str = "viewer",
) -> dict:
    """Create a new user. Returns the created user."""
    hashed = hash_password(password)
    result = db.execute(
        text("""
            INSERT INTO users (USERNAME, EMAIL, FULL_NAME, PASSWORD_HASH, ROLE)
            VALUES (:u, :e, :fn, :ph, :r)
        """),
        {"u": username, "e": email, "fn": full_name, "ph": hashed, "r": role},
    )
    db.commit()
    return get_by_id(db, result.lastrowid)


def authenticate(db: Session, username: str, password: str) -> Optional[dict]:
    """Verify credentials. Returns user dict if valid."""
    user = get_by_username(db, username)
    if not user or not user["isActive"]:
        return None
    if not verify_password(password, user["passwordHash"]):
        return None

    # Update last login
    db.execute(
        text("UPDATE users SET LAST_LOGIN = NOW() WHERE ID = :id"),
        {"id": user["id"]},
    )
    db.commit()
    return user


def change_password(db: Session, user_id: int, old_pw: str, new_pw: str) -> bool:
    """Change password. Returns True on success."""
    user = get_by_username(db, (get_by_id(db, user_id) or {}).get("username", ""))
    if not user:
        return False
    if not verify_password(old_pw, user["passwordHash"]):
        return False

    db.execute(
        text("UPDATE users SET PASSWORD_HASH = :ph WHERE ID = :id"),
        {"ph": hash_password(new_pw), "id": user_id},
    )
    db.commit()
    return True


def list_users(db: Session, limit: int = 100) -> list[dict]:
    rows = db.execute(
        text("""
            SELECT ID, USERNAME, EMAIL, FULL_NAME, ROLE, IS_ACTIVE, LAST_LOGIN, CREATED_AT
            FROM users
            ORDER BY ID
            LIMIT :limit
        """),
        {"limit": limit},
    ).fetchall()
    return [
        {
            "id": r[0],
            "username": r[1],
            "email": r[2],
            "fullName": r[3],
            "role": r[4],
            "isActive": bool(r[5]),
            "lastLogin": r[6].isoformat() if r[6] else None,
            "createdAt": r[7].isoformat() if r[7] else None,
        }
        for r in rows
    ]


# ═══════════════════════════════════════════════════════════════
# SESSIONS
# ═══════════════════════════════════════════════════════════════

def create_session(
    db: Session,
    user_id: int,
    jti: str,
    expires_at: datetime,
    user_agent: str = "",
) -> None:
    db.execute(
        text("""
            INSERT INTO sessions (USER_ID, TOKEN_JTI, ISSUED_AT, EXPIRES_AT, USER_AGENT)
            VALUES (:uid, :jti, NOW(), :exp, :ua)
        """),
        {"uid": user_id, "jti": jti, "exp": expires_at, "ua": user_agent[:255]},
    )
    db.commit()


def revoke_session(db: Session, jti: str) -> None:
    db.execute(
        text("UPDATE sessions SET REVOKED = 1 WHERE TOKEN_JTI = :jti"),
        {"jti": jti},
    )
    db.commit()


# ═══════════════════════════════════════════════════════════════
# AUDIT
# ═══════════════════════════════════════════════════════════════

def log_action(
    db: Session,
    user_id: int | None,
    action: str,
    entity: str | None = None,
    entity_id: str | None = None,
    ip: str | None = None,
    user_agent: str | None = None,
    details: str | None = None,
) -> None:
    db.execute(
        text("""
            INSERT INTO audit_log (USER_ID, ACTION, ENTITY, ENTITY_ID, IP_ADDRESS, USER_AGENT, DETAILS)
            VALUES (:uid, :a, :e, :eid, :ip, :ua, :d)
        """),
        {
            "uid": user_id,
            "a": action,
            "e": entity,
            "eid": entity_id,
            "ip": ip,
            "ua": user_agent[:255] if user_agent else None,
            "d": details,
        },
    )
    db.commit()


def recent_audit(db: Session, limit: int = 50) -> list[dict]:
    rows = db.execute(
        text("""
            SELECT a.ID, u.USERNAME, a.ACTION, a.ENTITY, a.ENTITY_ID, a.IP_ADDRESS, a.DETAILS, a.CREATED_AT
            FROM audit_log a
            LEFT JOIN users u ON u.ID = a.USER_ID
            ORDER BY a.ID DESC
            LIMIT :limit
        """),
        {"limit": limit},
    ).fetchall()
    return [
        {
            "id": r[0],
            "username": r[1] or "system",
            "action": r[2],
            "entity": r[3],
            "entityId": r[4],
            "ip": r[5],
            "details": r[6],
            "createdAt": r[7].isoformat() if r[7] else None,
        }
        for r in rows
    ]