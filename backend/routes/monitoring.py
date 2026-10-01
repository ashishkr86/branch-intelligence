"""
GET /api/monitoring — system health + status.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from db import get_db

router = APIRouter()


@router.get("")
def get_monitoring(db: Session = Depends(get_db)):
    # Table row counts
    tables = {}
    for t in ["branch", "branch_employee", "otp_report", "etl_runs"]:
        tables[t] = db.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar() or 0

    # Recent errors
    errors = db.execute(text("""
        SELECT FILE_NAME, ERROR_MSG, RUN_DATE
        FROM etl_runs
        WHERE STATUS = 'FAILED'
        ORDER BY ID DESC
        LIMIT 5
    """)).fetchall()

    return {
        "status": "healthy",
        "database": "connected",
        "api": "running",
        "tables": tables,
        "errors": [
            {
                "file": e[0],
                "message": e[1] or "Unknown error",
                "date": e[2].strftime("%Y-%m-%d") if e[2] else "—",
            }
            for e in errors
        ],
    }