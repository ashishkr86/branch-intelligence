"""
GET /api/analytics — SQL-driven business analytics.
Every query returns live data from MySQL.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from db import get_db

router = APIRouter()


@router.get("")
def get_analytics(
    limit: int = Query(10, le=100),
    db: Session = Depends(get_db),
):
    # ─── 1. Top branches by OTP ───
    top_branches = db.execute(text("""
        SELECT b.BM_CODE, b.BRANCH_NAME, b.REGION, COUNT(*) AS otp_count
        FROM otp_report o
        JOIN branch b ON b.BM_CODE = o.BM_CODE
        GROUP BY b.BM_CODE, b.BRANCH_NAME, b.REGION
        ORDER BY otp_count DESC
        LIMIT :limit
    """), {"limit": limit}).fetchall()

    # ─── 2. OTP by purpose ───
    by_purpose = db.execute(text("""
        SELECT PURPOSE, COUNT(*) AS cnt
        FROM otp_report
        GROUP BY PURPOSE
        ORDER BY cnt DESC
    """)).fetchall()

    # ─── 3. Daily OTP trend (last 30 days) ───
    daily_trend = db.execute(text("""
        SELECT OTP_DATE, COUNT(*) AS cnt
        FROM otp_report
        WHERE OTP_DATE >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY OTP_DATE
        ORDER BY OTP_DATE
    """)).fetchall()

    # ─── 4. Employees by region ───
    emp_by_region = db.execute(text("""
        SELECT b.REGION, COUNT(*) AS cnt
        FROM branch_employee e
        JOIN branch b ON b.BM_CODE = e.BM_CODE
        GROUP BY b.REGION
        ORDER BY cnt DESC
    """)).fetchall()

    # ─── 5. Branches without OTP ───
    no_otp = db.execute(text("""
        SELECT b.BM_CODE, b.BRANCH_NAME, b.REGION
        FROM branch b
        LEFT JOIN otp_report o ON o.BM_CODE = b.BM_CODE
        WHERE o.ID IS NULL
        ORDER BY b.BM_CODE
        LIMIT :limit
    """), {"limit": limit}).fetchall()

    # ─── 6. Operator summary ───
    operators = db.execute(text("""
        SELECT OPERATOR, COUNT(*) AS cnt,
               COUNT(DISTINCT BM_CODE) AS branches
        FROM otp_report
        WHERE OPERATOR IS NOT NULL
        GROUP BY OPERATOR
        ORDER BY cnt DESC
        LIMIT :limit
    """), {"limit": limit}).fetchall()

    # ─── 7. OTP per active branch ───
    otp_per_branch = db.execute(text("""
        SELECT b.BM_CODE, b.BRANCH_NAME,
               COUNT(o.ID) AS otp_count,
               COUNT(DISTINCT o.OTP_DATE) AS active_days,
               ROUND(COUNT(o.ID) / GREATEST(COUNT(DISTINCT o.OTP_DATE), 1), 1) AS avg_per_day
        FROM branch b
        LEFT JOIN otp_report o ON o.BM_CODE = b.BM_CODE
        GROUP BY b.BM_CODE, b.BRANCH_NAME
        HAVING otp_count > 0
        ORDER BY otp_count DESC
        LIMIT :limit
    """), {"limit": limit}).fetchall()

    return {
        "topBranches": [
            {"bm": r[0], "name": r[1], "region": r[2], "otp": int(r[3])}
            for r in top_branches
        ],
        "byPurpose": {
            "labels": [r[0] for r in by_purpose],
            "data": [int(r[1]) for r in by_purpose],
            "colors": ["#06b6d4", "#10b981", "#f59e0b", "#8b5cf6", "#64748b", "#ec4899"][:len(by_purpose)],
        },
        "dailyTrend": {
            "labels": [r[0].strftime("%b %d") for r in daily_trend],
            "data": [int(r[1]) for r in daily_trend],
        },
        "empByRegion": {
            "labels": [r[0] for r in emp_by_region],
            "data": [int(r[1]) for r in emp_by_region],
        },
        "branchesWithoutOtp": [
            {"bm": r[0], "name": r[1], "region": r[2]}
            for r in no_otp
        ],
        "operators": [
            {"name": r[0], "otp": int(r[1]), "branches": int(r[2])}
            for r in operators
        ],
        "otpPerBranch": [
            {
                "bm": r[0],
                "name": r[1],
                "otp": int(r[2]),
                "activeDays": int(r[3]),
                "avgPerDay": float(r[4]),
            }
            for r in otp_per_branch
        ],
    }