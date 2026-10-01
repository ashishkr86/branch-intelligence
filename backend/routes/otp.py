"""
GET /api/otp — OTP records + analytics.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from db import get_db

router = APIRouter()


@router.get("")
def get_otp(
    limit: int = Query(50, le=500),
    db: Session = Depends(get_db),
):
    rows = db.execute(text(f"""
        SELECT o.ID, o.BM_CODE, b.BRANCH_NAME, o.PURPOSE, o.OPERATOR,
               o.OTP_DATE, o.OTP_TIME, o.MOBILE_NUMBER
        FROM otp_report o
        JOIN branch b ON b.BM_CODE = o.BM_CODE
        ORDER BY o.OTP_DATE DESC, o.OTP_TIME DESC
        LIMIT :limit
    """), {"limit": limit}).fetchall()

    records = [
        {
            "id": r[0],
            "bm": r[1],
            "branch": r[2],
            "purpose": r[3],
            "operator": r[4] or "—",
            "date": r[5].strftime("%Y-%m-%d") if r[5] else "—",
            "time": str(r[6]) if r[6] else "—",
            "mobile": (r[7][:2] + "XXXXXX" + r[7][-2:]) if r[7] and len(r[7]) > 4 else "—",
        }
        for r in rows
    ]

    return {"records": records, "total": len(records)}


@router.get("/summary")
def get_otp_summary(db: Session = Depends(get_db)):
    # Total KPIs
    total = db.execute(text("SELECT COUNT(*) FROM otp_report")).scalar() or 0

    today = db.execute(text(
        "SELECT COUNT(*) FROM otp_report WHERE OTP_DATE = CURDATE()"
    )).scalar() or 0

    active_branches = db.execute(text(
        "SELECT COUNT(DISTINCT BM_CODE) FROM otp_report"
    )).scalar() or 0

    unique_operators = db.execute(text(
        "SELECT COUNT(DISTINCT OPERATOR) FROM otp_report WHERE OPERATOR IS NOT NULL"
    )).scalar() or 0

    avg = round(total / active_branches, 1) if active_branches else 0

    # Trend (last 20 days)
    trend = db.execute(text("""
        SELECT OTP_DATE, COUNT(*) AS cnt
        FROM otp_report
        WHERE OTP_DATE >= DATE_SUB(CURDATE(), INTERVAL 20 DAY)
        GROUP BY OTP_DATE
        ORDER BY OTP_DATE
    """)).fetchall()

    # By purpose
    purpose = db.execute(text("""
        SELECT PURPOSE, COUNT(*) AS cnt
        FROM otp_report
        GROUP BY PURPOSE
        ORDER BY cnt DESC
        LIMIT 6
    """)).fetchall()

    # Top operators
    operator = db.execute(text("""
        SELECT OPERATOR, COUNT(*) AS cnt
        FROM otp_report
        WHERE OPERATOR IS NOT NULL
        GROUP BY OPERATOR
        ORDER BY cnt DESC
        LIMIT 6
    """)).fetchall()

    # Top branches
    branch_rows = db.execute(text("""
        SELECT b.BRANCH_NAME, COUNT(*) AS cnt
        FROM otp_report o
        JOIN branch b ON b.BM_CODE = o.BM_CODE
        GROUP BY o.BM_CODE, b.BRANCH_NAME
        ORDER BY cnt DESC
        LIMIT 5
    """)).fetchall()

    # Hourly
    hourly = db.execute(text("""
        SELECT HOUR(OTP_TIME) AS h, COUNT(*) AS cnt
        FROM otp_report
        GROUP BY HOUR(OTP_TIME)
        ORDER BY h
    """)).fetchall()

    return {
        "kpis": {
            "total": total,
            "today": today,
            "activeBranches": active_branches,
            "uniqueOperators": unique_operators,
            "avgPerBranch": avg,
        },
        "trend": {
            "labels": [r[0].strftime("%b %d") for r in trend],
            "data": [int(r[1]) for r in trend],
        },
        "byPurpose": {
            "labels": [r[0] for r in purpose],
            "data": [int(r[1]) for r in purpose],
            "colors": ["#06b6d4", "#10b981", "#f59e0b", "#8b5cf6", "#64748b", "#ec4899"][:len(purpose)],
        },
        "byOperator": {
            "labels": [r[0] for r in operator],
            "data": [int(r[1]) for r in operator],
        },
        "byBranch": {
            "labels": [r[0] for r in branch_rows],
            "data": [int(r[1]) for r in branch_rows],
        },
        "byHour": {
            "labels": [f"{r[0]:02d}" for r in hourly],
            "data": [int(r[1]) for r in hourly],
        },
    }