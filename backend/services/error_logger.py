"""
Error logging service — captures and stores errors.
"""

import hashlib
import traceback
from typing import Optional

from sqlalchemy import text
from sqlalchemy.orm import Session


def _fingerprint(source: str, message: str, endpoint: str | None = None) -> str:
    """Compute a short fingerprint for grouping similar errors."""
    raw = f"{source}|{endpoint or ''}|{message[:200]}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]


def log_error(
    db: Session,
    level: str,
    source: str,
    message: str,
    stack_trace: str | None = None,
    user_id: int | None = None,
    endpoint: str | None = None,
    method: str | None = None,
    status_code: int | None = None,
    request_body: str | None = None,
    ip_address: str | None = None,
) -> int:
    """Insert an error into error_log. Returns the new ID."""
    fp = _fingerprint(source, message, endpoint)
    try:
        result = db.execute(
            text("""
                INSERT INTO error_log
                  (LEVEL, SOURCE, MESSAGE, STACK_TRACE, USER_ID, ENDPOINT,
                   METHOD, STATUS_CODE, REQUEST_BODY, IP_ADDRESS, FINGERPRINT)
                VALUES
                  (:lv, :src, :msg, :st, :uid, :ep, :m, :sc, :rb, :ip, :fp)
            """),
            {
                "lv": level[:20],
                "src": source[:50],
                "msg": message,
                "st": (stack_trace or "")[:10000],
                "uid": user_id,
                "ep": endpoint[:255] if endpoint else None,
                "m": method[:10] if method else None,
                "sc": status_code,
                "rb": (request_body or "")[:2000],
                "ip": ip_address[:45] if ip_address else None,
                "fp": fp,
            },
        )
        db.commit()
        return result.lastrowid
    except Exception:
        db.rollback()
        return 0


def capture_exception(
    db: Session,
    source: str,
    exc: Exception,
    **kwargs,
) -> int:
    """Convenience: log a Python exception."""
    tb = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
    return log_error(
        db,
        level="ERROR",
        source=source,
        message=str(exc),
        stack_trace=tb,
        **kwargs,
    )


def recent_errors(
    db: Session,
    level: str | None = None,
    source: str | None = None,
    limit: int = 100,
) -> list[dict]:
    where = []
    params = {"limit": limit}
    if level:
        where.append("LEVEL = :level")
        params["level"] = level
    if source:
        where.append("SOURCE = :source")
        params["source"] = source

    where_sql = "WHERE " + " AND ".join(where) if where else ""

    rows = db.execute(
        text(f"""
            SELECT ID, LEVEL, SOURCE, MESSAGE, ENDPOINT, METHOD,
                   STATUS_CODE, IP_ADDRESS, FINGERPRINT, RESOLVED, CREATED_AT
            FROM error_log
            {where_sql}
            ORDER BY ID DESC
            LIMIT :limit
        """),
        params,
    ).fetchall()

    return [
        {
            "id": r[0],
            "level": r[1],
            "source": r[2],
            "message": r[3],
            "endpoint": r[4],
            "method": r[5],
            "statusCode": r[6],
            "ip": r[7],
            "fingerprint": r[8],
            "resolved": bool(r[9]),
            "createdAt": r[10].isoformat() if r[10] else None,
        }
        for r in rows
    ]


def error_stats(db: Session, hours: int = 24) -> dict:
    """Counts by level and source over the last N hours."""
    total = db.execute(
        text("""
            SELECT COUNT(*) FROM error_log
            WHERE CREATED_AT >= DATE_SUB(NOW(), INTERVAL :h HOUR)
        """),
        {"h": hours},
    ).scalar() or 0

    by_level = db.execute(
        text("""
            SELECT LEVEL, COUNT(*) FROM error_log
            WHERE CREATED_AT >= DATE_SUB(NOW(), INTERVAL :h HOUR)
            GROUP BY LEVEL
        """),
        {"h": hours},
    ).fetchall()

    by_source = db.execute(
        text("""
            SELECT SOURCE, COUNT(*) FROM error_log
            WHERE CREATED_AT >= DATE_SUB(NOW(), INTERVAL :h HOUR)
            GROUP BY SOURCE
            ORDER BY COUNT(*) DESC
            LIMIT 10
        """),
        {"h": hours},
    ).fetchall()

    groups = db.execute(
        text("""
            SELECT FINGERPRINT, MESSAGE, SOURCE, COUNT(*) AS cnt,
                   MAX(CREATED_AT) AS last_seen
            FROM error_log
            WHERE RESOLVED = 0
            GROUP BY FINGERPRINT, MESSAGE, SOURCE
            ORDER BY cnt DESC
            LIMIT 10
        """),
        {"h": hours},
    ).fetchall()

    return {
        "hours": hours,
        "total": total,
        "byLevel": {r[0]: r[1] for r in by_level},
        "bySource": [{"source": r[0], "count": r[1]} for r in by_source],
        "topGroups": [
            {
                "fingerprint": r[0],
                "message": r[1][:200],
                "source": r[2],
                "count": r[3],
                "lastSeen": r[4].isoformat() if r[4] else None,
            }
            for r in groups
        ],
    }