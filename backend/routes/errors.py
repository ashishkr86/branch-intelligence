"""
/api/errors — Error tracking dashboard endpoints.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from db import get_db
from services import error_logger

router = APIRouter()


@router.get("")
def list_errors(
    level: str | None = Query(None),
    source: str | None = Query(None),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
):
    return {
        "errors": error_logger.recent_errors(
            db, level=level, source=source, limit=limit
        )
    }


@router.get("/stats")
def stats(hours: int = Query(24, ge=1, le=720), db: Session = Depends(get_db)):
    return error_logger.error_stats(db, hours=hours)


@router.post("/{error_id}/resolve")
def resolve(error_id: int, db: Session = Depends(get_db)):
    db.execute(
        text("UPDATE error_log SET RESOLVED = 1 WHERE ID = :id"),
        {"id": error_id},
    )
    db.commit()
    return {"id": error_id, "resolved": True}


@router.post("/resolve-all")
def resolve_all(db: Session = Depends(get_db)):
    result = db.execute(text("UPDATE error_log SET RESOLVED = 1 WHERE RESOLVED = 0"))
    db.commit()
    return {"resolved": result.rowcount}


@router.delete("/clear")
def clear_all(db: Session = Depends(get_db)):
    result = db.execute(text("DELETE FROM error_log"))
    db.commit()
    return {"deleted": result.rowcount}


# ─── Manual test endpoint ───

@router.post("/test")
def test_error(db: Session = Depends(get_db)):
    """Generate a test error to verify the tracking works."""
    error_logger.log_error(
        db,
        level="ERROR",
        source="manual_test",
        message="This is a test error from /api/errors/test",
        status_code=500,
    )
    return {"message": "Test error logged", "check": "/api/errors"}