"""
GET /api/etl — ETL run history.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from db import get_db

router = APIRouter()


@router.get("/history")
def get_etl_history(limit: int = Query(20, le=200), db: Session = Depends(get_db)):
    rows = db.execute(text(f"""
        SELECT ID, RUN_DATE, FILE_NAME, STARTED_AT, FINISHED_AT,
               DURATION_SEC, ROWS_IN, ROWS_LOADED, ROWS_DROPPED,
               DROP_PCT, STATUS, ERROR_MSG
        FROM etl_runs
        ORDER BY ID DESC
        LIMIT :limit
    """), {"limit": limit}).fetchall()

    runs = [
        {
            "id": f"ETL-{r[0]:06d}",
            "runDate": r[1].strftime("%Y-%m-%d") if r[1] else "—",
            "file": r[2],
            "startedAt": r[3].strftime("%H:%M:%S") if r[3] else "—",
            "finishedAt": r[4].strftime("%H:%M:%S") if r[4] else "—",
            "duration": f"{r[5] or 0}s",
            "rowsIn": int(r[6] or 0),
            "rowsLoaded": int(r[7] or 0),
            "rowsDropped": int(r[8] or 0),
            "dropPct": float(r[9] or 0),
            "status": (r[10] or "UNKNOWN").lower(),
            "error": r[11],
        }
        for r in rows
    ]

    return {"runs": runs, "total": len(runs)}


@router.get("/status")
def get_etl_status(db: Session = Depends(get_db)):
    last = db.execute(text("""
        SELECT FILE_NAME, STATUS, RUN_DATE, ROWS_LOADED
        FROM etl_runs
        ORDER BY ID DESC
        LIMIT 1
    """)).fetchone()

    total = db.execute(text("SELECT COUNT(*) FROM etl_runs")).scalar() or 0

    success = db.execute(text("""
        SELECT COUNT(*) FROM etl_runs WHERE STATUS = 'SUCCESS'
    """)).scalar() or 0

    return {
        "totalRuns": total,
        "successRuns": success,
        "successRate": round(success / total * 100, 1) if total else 100,
        "lastRun": {
            "file": last[0],
            "status": last[1].lower(),
            "date": last[2].strftime("%Y-%m-%d") if last[2] else "—",
            "rowsLoaded": int(last[3] or 0),
        } if last else None,
    }