"""
/api/alerts — Panic + Smoke alert endpoints.
"""

from datetime import datetime, date
from typing import Optional

import io
import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from db import get_db

router = APIRouter()


# ═══════════════════════════════════════════════════════════════
# PANIC ALERTS
# ═══════════════════════════════════════════════════════════════

@router.get("/panic")
def get_panic_alerts(
    days: int = Query(365, ge=1, le=3650),
    status: str | None = Query(None),
    alert_type: str | None = Query(None),
    limit: int = Query(500, le=5000),
    db: Session = Depends(get_db),
):
    where = ["ALERT_DATE >= DATE_SUB(CURDATE(), INTERVAL :days DAY)"]
    params = {"days": days, "limit": limit}

    if status and status != "all":
        where.append("STATUS = :status")
        params["status"] = status

    if alert_type and alert_type != "all":
        where.append("ALERT_TYPE = :alert_type")
        params["alert_type"] = alert_type

    where_sql = " AND ".join(where)

    rows = db.execute(text(f"""
        SELECT ID, BM_CODE, BRANCH_NAME, ALERT_TYPE,
               ALERT_DATE, ALERT_TIME, OPERATOR,
               COMMENTS, STATUS
        FROM panic_alerts
        WHERE {where_sql}
        ORDER BY ALERT_DATE DESC, ALERT_TIME DESC
        LIMIT :limit
    """), params).fetchall()

    kpis = db.execute(text(f"""
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN ALERT_TYPE LIKE 'Panic%%' THEN 1 ELSE 0 END) AS panic_count,
            SUM(CASE WHEN ALERT_TYPE LIKE '%%Relese%%'
                      OR ALERT_TYPE LIKE '%%Release%%' THEN 1 ELSE 0 END) AS emergency_count,
            SUM(CASE WHEN STATUS = 'OPEN' THEN 1 ELSE 0 END) AS open_count,
            COUNT(DISTINCT BM_CODE) AS branches_affected
        FROM panic_alerts
        WHERE {where_sql}
    """), params).fetchone()

    trend = db.execute(text(f"""
        SELECT ALERT_DATE, COUNT(*) AS cnt
        FROM panic_alerts
        WHERE {where_sql}
        GROUP BY ALERT_DATE
        ORDER BY ALERT_DATE
    """), params).fetchall()

    by_type = db.execute(text(f"""
        SELECT ALERT_TYPE, COUNT(*) AS cnt
        FROM panic_alerts
        WHERE {where_sql}
        GROUP BY ALERT_TYPE
        ORDER BY cnt DESC
    """), params).fetchall()

    return {
        "kpis": {
            "total": int(kpis[0] or 0),
            "panic": int(kpis[1] or 0),
            "emergencyRelease": int(kpis[2] or 0),
            "open": int(kpis[3] or 0),
            "branchesAffected": int(kpis[4] or 0),
        },
        "records": [
            {
                "id": r[0], "bm": r[1], "branch": r[2],
                "type": r[3],
                "date": r[4].strftime("%Y-%m-%d") if r[4] else "—",
                "time": str(r[5]) if r[5] else "—",
                "operator": r[6] or "—",
                "comments": r[7] or "—",
                "status": r[8] or "OPEN",
            }
            for r in rows
        ],
        "trend": {
            "labels": [r[0].strftime("%b %d") for r in trend],
            "data": [int(r[1]) for r in trend],
        },
        "byType": [
            {"type": r[0], "count": int(r[1])} for r in by_type
        ],
    }


# ── Panic: single insert ────────────────────────────────────────
class PanicAlertIn(BaseModel):
    bm_code: str
    branch_name: Optional[str] = None
    alert_type: str = "Panic Alert"
    alert_date: Optional[date] = None
    alert_time: Optional[str] = None
    operator: Optional[str] = None
    comments: Optional[str] = None
    status: str = "OPEN"


@router.post("/panic", status_code=201)
def create_panic_alert(payload: PanicAlertIn, db: Session = Depends(get_db)):
    alert_date = payload.alert_date or date.today()
    alert_time = payload.alert_time or datetime.now().strftime("%H:%M:%S")

    result = db.execute(text("""
        INSERT INTO panic_alerts
            (BM_CODE, BRANCH_NAME, ALERT_TYPE, ALERT_DATE, ALERT_TIME,
             OPERATOR, COMMENTS, STATUS)
        VALUES
            (:bm, :branch, :type, :d, :t,
             :op, :comments, :status)
    """), {
        "bm": payload.bm_code,
        "branch": payload.branch_name,
        "type": payload.alert_type,
        "d": alert_date,
        "t": alert_time,
        "op": payload.operator,
        "comments": payload.comments,
        "status": payload.status,
    })
    db.commit()
    return {"id": result.lastrowid, "status": "created"}


# ── Panic: bulk import CSV / Excel ──────────────────────────────
@router.post("/panic/import")
async def import_panic_alerts(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    return await _import_alerts(file, db, kind="panic")


# ═══════════════════════════════════════════════════════════════
# SMOKE ALERTS
# ═══════════════════════════════════════════════════════════════

@router.get("/smoke")
def get_smoke_alerts(
    days: int = Query(365, ge=1, le=3650),
    severity: str | None = Query(None),
    status: str | None = Query(None),
    limit: int = Query(500, le=5000),
    db: Session = Depends(get_db),
):
    where = ["ALERT_DATE >= DATE_SUB(CURDATE(), INTERVAL :days DAY)"]
    params = {"days": days, "limit": limit}

    if severity and severity != "all":
        where.append("SEVERITY = :severity")
        params["severity"] = severity

    if status and status != "all":
        where.append("STATUS = :status")
        params["status"] = status

    where_sql = " AND ".join(where)

    rows = db.execute(text(f"""
        SELECT ID, BM_CODE, BRANCH_NAME, SENSOR_TYPE, SENSOR_ID,
               ALERT_DATE, ALERT_TIME, SEVERITY, DESCRIPTION, STATUS
        FROM smoke_alerts
        WHERE {where_sql}
        ORDER BY ALERT_DATE DESC, ALERT_TIME DESC
        LIMIT :limit
    """), params).fetchall()

    kpis = db.execute(text(f"""
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN SENSOR_TYPE = 'SMOKE' THEN 1 ELSE 0 END) AS smoke_count,
            SUM(CASE WHEN SENSOR_TYPE = 'CEILING_SMOKE' THEN 1 ELSE 0 END) AS ceiling_count,
            SUM(CASE WHEN SEVERITY IN ('HIGH','CRITICAL') THEN 1 ELSE 0 END) AS high_severity,
            COUNT(DISTINCT BM_CODE) AS branches_affected
        FROM smoke_alerts
        WHERE {where_sql}
    """), params).fetchone()

    trend = db.execute(text(f"""
        SELECT ALERT_DATE, COUNT(*) AS cnt
        FROM smoke_alerts
        WHERE {where_sql}
        GROUP BY ALERT_DATE
        ORDER BY ALERT_DATE
    """), params).fetchall()

    by_severity = db.execute(text(f"""
        SELECT SEVERITY, COUNT(*) AS cnt
        FROM smoke_alerts
        WHERE {where_sql}
        GROUP BY SEVERITY
    """), params).fetchall()

    by_type = db.execute(text(f"""
        SELECT SENSOR_TYPE, COUNT(*) AS cnt
        FROM smoke_alerts
        WHERE {where_sql}
        GROUP BY SENSOR_TYPE
    """), params).fetchall()

    return {
        "kpis": {
            "total": int(kpis[0] or 0),
            "smoke": int(kpis[1] or 0),
            "ceilingSmoke": int(kpis[2] or 0),
            "highSeverity": int(kpis[3] or 0),
            "branchesAffected": int(kpis[4] or 0),
        },
        "records": [
            {
                "id": r[0], "bm": r[1], "branch": r[2],
                "sensorType": r[3], "sensorId": r[4] or "—",
                "date": r[5].strftime("%Y-%m-%d") if r[5] else "—",
                "time": str(r[6]) if r[6] else "—",
                "severity": r[7] or "MEDIUM",
                "description": r[8] or "—",
                "status": r[9] or "OPEN",
            }
            for r in rows
        ],
        "trend": {
            "labels": [r[0].strftime("%b %d") for r in trend],
            "data": [int(r[1]) for r in trend],
        },
        "bySeverity": {
            "labels": [r[0] for r in by_severity],
            "data": [int(r[1]) for r in by_severity],
        },
        "byType": [
            {"type": r[0], "count": int(r[1])} for r in by_type
        ],
    }


# ── Smoke: single insert ────────────────────────────────────────
class SmokeAlertIn(BaseModel):
    bm_code: str
    branch_name: Optional[str] = None
    sensor_type: str = "SMOKE"
    sensor_id: Optional[str] = None
    alert_date: Optional[date] = None
    alert_time: Optional[str] = None
    severity: str = "MEDIUM"
    description: Optional[str] = None
    status: str = "OPEN"


@router.post("/smoke", status_code=201)
def create_smoke_alert(payload: SmokeAlertIn, db: Session = Depends(get_db)):
    alert_date = payload.alert_date or date.today()
    alert_time = payload.alert_time or datetime.now().strftime("%H:%M:%S")

    result = db.execute(text("""
        INSERT INTO smoke_alerts
            (BM_CODE, BRANCH_NAME, SENSOR_TYPE, SENSOR_ID,
             ALERT_DATE, ALERT_TIME, SEVERITY, DESCRIPTION, STATUS)
        VALUES
            (:bm, :branch, :stype, :sid,
             :d, :t, :sev, :desc, :status)
    """), {
        "bm": payload.bm_code,
        "branch": payload.branch_name,
        "stype": payload.sensor_type,
        "sid": payload.sensor_id,
        "d": alert_date,
        "t": alert_time,
        "sev": payload.severity,
        "desc": payload.description,
        "status": payload.status,
    })
    db.commit()
    return {"id": result.lastrowid, "status": "created"}


# ── Smoke: bulk import CSV / Excel ──────────────────────────────
@router.post("/smoke/import")
async def import_smoke_alerts(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    return await _import_alerts(file, db, kind="smoke")


# ═══════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════

@router.get("/summary")
def get_alerts_summary(db: Session = Depends(get_db)):
    panic_count = db.execute(text("""
        SELECT COUNT(*) FROM panic_alerts
        WHERE ALERT_DATE >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    """)).scalar() or 0

    smoke_count = db.execute(text("""
        SELECT COUNT(*) FROM smoke_alerts
        WHERE ALERT_DATE >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    """)).scalar() or 0

    open_panic = db.execute(text("""
        SELECT COUNT(*) FROM panic_alerts WHERE STATUS = 'OPEN'
    """)).scalar() or 0

    open_smoke = db.execute(text("""
        SELECT COUNT(*) FROM smoke_alerts WHERE STATUS = 'OPEN'
    """)).scalar() or 0

    return {
        "panic": {"total30d": int(panic_count), "open": int(open_panic)},
        "smoke": {"total30d": int(smoke_count), "open": int(open_smoke)},
    }


# ═══════════════════════════════════════════════════════════════
# SHARED IMPORT HELPER
# ═══════════════════════════════════════════════════════════════

PANIC_REQUIRED = {"BM_CODE", "ALERT_DATE"}
SMOKE_REQUIRED = {"BM_CODE", "ALERT_DATE"}


async def _import_alerts(file: UploadFile, db: Session, kind: str):
    name = (file.filename or "").lower()
    if not name.endswith((".csv", ".xlsx", ".xls")):
        raise HTTPException(400, "Only CSV or Excel files are supported")

    contents = await file.read()
    try:
        df = (pd.read_csv(io.BytesIO(contents))
              if name.endswith(".csv")
              else pd.read_excel(io.BytesIO(contents)))
    except Exception as exc:
        raise HTTPException(422, f"Could not parse file: {exc}")

    df.columns = [str(c).strip().upper().replace(" ", "_") for c in df.columns]

    required = PANIC_REQUIRED if kind == "panic" else SMOKE_REQUIRED
    missing = required - set(df.columns)
    if missing:
        raise HTTPException(422, f"Missing columns: {sorted(missing)}")

    df["ALERT_DATE"] = pd.to_datetime(
        df["ALERT_DATE"], errors="coerce", dayfirst=True
    ).dt.date
    df = df.dropna(subset=["ALERT_DATE"])

    if "ALERT_TIME" in df.columns:
        df["ALERT_TIME"] = df["ALERT_TIME"].astype(str)
    else:
        df["ALERT_TIME"] = datetime.now().strftime("%H:%M:%S")

    records = df.where(pd.notnull(df), None).to_dict("records")

    if kind == "panic":
        return _insert_panic(db, records)
    return _insert_smoke(db, records)


def _insert_panic(db: Session, records: list):
    sql = text("""
        INSERT INTO panic_alerts
            (BM_CODE, BRANCH_NAME, ALERT_TYPE, ALERT_DATE, ALERT_TIME,
             OPERATOR, COMMENTS, STATUS)
        VALUES
            (:BM_CODE, :BRANCH_NAME, :ALERT_TYPE, :ALERT_DATE, :ALERT_TIME,
             :OPERATOR, :COMMENTS, :STATUS)
    """)

    payload = [{
        "BM_CODE": r.get("BM_CODE"),
        "BRANCH_NAME": r.get("BRANCH_NAME"),
        "ALERT_TYPE": r.get("ALERT_TYPE") or "Panic Alert",
        "ALERT_DATE": r.get("ALERT_DATE"),
        "ALERT_TIME": r.get("ALERT_TIME"),
        "OPERATOR": r.get("OPERATOR"),
        "COMMENTS": r.get("COMMENTS"),
        "STATUS": r.get("STATUS") or "CLOSED",
    } for r in records]

    try:
        db.execute(sql, payload)
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(500, f"Insert failed: {exc}")

    return {"status": "success", "inserted": len(payload)}


def _insert_smoke(db: Session, records: list):
    sql = text("""
        INSERT INTO smoke_alerts
            (BM_CODE, BRANCH_NAME, SENSOR_TYPE, SENSOR_ID,
             ALERT_DATE, ALERT_TIME, SEVERITY, DESCRIPTION, STATUS)
        VALUES
            (:BM_CODE, :BRANCH_NAME, :SENSOR_TYPE, :SENSOR_ID,
             :ALERT_DATE, :ALERT_TIME, :SEVERITY, :DESCRIPTION, :STATUS)
    """)

    payload = [{
        "BM_CODE": r.get("BM_CODE"),
        "BRANCH_NAME": r.get("BRANCH_NAME"),
        "SENSOR_TYPE": r.get("SENSOR_TYPE") or "SMOKE",
        "SENSOR_ID": r.get("SENSOR_ID"),
        "ALERT_DATE": r.get("ALERT_DATE"),
        "ALERT_TIME": r.get("ALERT_TIME"),
        "SEVERITY": r.get("SEVERITY") or "MEDIUM",
        "DESCRIPTION": r.get("DESCRIPTION"),
        "STATUS": r.get("STATUS") or "OPEN",
    } for r in records]

    try:
        db.execute(sql, payload)
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(500, f"Insert failed: {exc}")

    return {"status": "success", "inserted": len(payload)}