"""
GET /api/overview — KPIs + charts for the Overview page.
All values come live from MySQL.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from db import get_db

router = APIRouter()


@router.get("")
def get_overview(db: Session = Depends(get_db)):
    # ─── KPI 1: Total branches ───
    total_branches = db.execute(text("SELECT COUNT(*) FROM branch")).scalar() or 0

    # ─── KPI 2: Total employees ───
    total_employees = db.execute(text("SELECT COUNT(*) FROM branch_employee")).scalar() or 0

    # ─── KPI 3: Total OTPs ───
    total_otps = db.execute(text("SELECT COUNT(*) FROM otp_report")).scalar() or 0

    # ─── KPI 4: ETL success rate (last 30 days) ───
    row = db.execute(text("""
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN STATUS = 'SUCCESS' THEN 1 ELSE 0 END) AS success
        FROM etl_runs
        WHERE RUN_DATE >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    """)).fetchone()
    total_runs = row[0] or 0
    success_runs = row[1] or 0
    etl_health = round(success_runs / total_runs * 100, 1) if total_runs else 100.0

    # ─── OTP trend (last 20 days) ───
    trend_rows = db.execute(text("""
        SELECT OTP_DATE, COUNT(*) AS cnt
        FROM otp_report
        WHERE OTP_DATE >= DATE_SUB(CURDATE(), INTERVAL 20 DAY)
        GROUP BY OTP_DATE
        ORDER BY OTP_DATE
    """)).fetchall()
    otp_trend = {
        "labels": [r[0].strftime("%b %d") for r in trend_rows],
        "data": [int(r[1]) for r in trend_rows],
    }

    # ─── OTP purpose distribution ───
    purpose_rows = db.execute(text("""
        SELECT PURPOSE, COUNT(*) AS cnt
        FROM otp_report
        GROUP BY PURPOSE
        ORDER BY cnt DESC
        LIMIT 6
    """)).fetchall()
    otp_purposes = {
        "labels": [r[0] for r in purpose_rows],
        "data": [int(r[1]) for r in purpose_rows],
        "colors": ["#06b6d4", "#10b981", "#f59e0b", "#8b5cf6", "#64748b", "#ec4899"][:len(purpose_rows)],
    }

    # ─── Regional branch distribution ───
    region_rows = db.execute(text("""
        SELECT REGION, COUNT(*) AS cnt
        FROM branch
        GROUP BY REGION
        ORDER BY cnt DESC
        LIMIT 8
    """)).fetchall()
    regions = {
        "labels": [r[0] for r in region_rows],
        "data": [int(r[1]) for r in region_rows],
    }

    # ─── Pipeline health (latest run per file) ───
    pipeline_rows = db.execute(text("""
        SELECT FILE_NAME, STATUS, DROP_PCT, RUN_DATE
        FROM etl_runs
        ORDER BY RUN_DATE DESC, ID DESC
        LIMIT 5
    """)).fetchall()
    pipeline = [
        {
            "name": r[0],
            "status": "ok" if r[1] == "SUCCESS" else ("warn" if r[1] == "WARNING" else "err"),
            "dropPct": float(r[2]) if r[2] else 0,
            "runDate": r[3].strftime("%b %d") if r[3] else "—",
        }
        for r in pipeline_rows
    ]

    # ─── Recent activity ───
    activity_rows = db.execute(text("""
        SELECT FILE_NAME, ROWS_LOADED, STATUS, RUN_DATE
        FROM etl_runs
        ORDER BY RUN_DATE DESC, ID DESC
        LIMIT 5
    """)).fetchall()
    activity = [
        {
            "file": r[0],
            "rows": f"{int(r[1] or 0):,}",
            "status": "loaded" if r[2] == "SUCCESS" else ("review" if r[2] == "WARNING" else "failed"),
            "time": r[3].strftime("%b %d") if r[3] else "—",
        }
        for r in activity_rows
    ]

    return {
        "kpis": {
            "branches": total_branches,
            "employees": total_employees,
            "otps": total_otps,
            "etlHealth": etl_health,
        },
        "otpTrend": otp_trend,
        "otpPurposes": otp_purposes,
        "regions": regions,
        "pipeline": pipeline,
        "activity": activity,
    }