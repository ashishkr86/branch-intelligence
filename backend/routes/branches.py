"""
GET /api/branches — branch list + analytics.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from db import get_db

router = APIRouter()


@router.get("")
def get_branches(
    region: str | None = Query(None),
    search: str | None = Query(None),
    limit: int = Query(100, le=1000),
    db: Session = Depends(get_db),
):
    where = []
    params = {}

    if region and region != "all":
        where.append("b.REGION = :region")
        params["region"] = region

    if search:
        where.append("(b.BRANCH_NAME LIKE :q OR b.BM_CODE LIKE :q)")
        params["q"] = f"%{search}%"

    where_sql = "WHERE " + " AND ".join(where) if where else ""

    sql = f"""
        SELECT
            b.BM_CODE,
            b.BRANCH_NAME,
            b.REGION,
            COALESCE(emp.cnt, 0) AS employees,
            COALESCE(otp.cnt, 0) AS otp_count,
            otp.last_otp
        FROM branch b
        LEFT JOIN (
            SELECT BM_CODE, COUNT(*) AS cnt
            FROM branch_employee
            GROUP BY BM_CODE
        ) emp ON emp.BM_CODE = b.BM_CODE
        LEFT JOIN (
            SELECT BM_CODE, COUNT(*) AS cnt, MAX(OTP_DATE) AS last_otp
            FROM otp_report
            GROUP BY BM_CODE
        ) otp ON otp.BM_CODE = b.BM_CODE
        {where_sql}
        ORDER BY otp_count DESC
        LIMIT :limit
    """
    params["limit"] = limit

    rows = db.execute(text(sql), params).fetchall()

    branches = [
        {
            "bm": r[0],
            "name": r[1],
            "region": r[2],
            "employees": int(r[3]),
            "otp": int(r[4]),
            "lastOtp": r[5].strftime("%b %d") if r[5] else "—",
            "status": "active" if r[4] > 0 else "idle",
        }
        for r in rows
    ]

    # Region distribution
    region_rows = db.execute(text("""
        SELECT REGION, COUNT(*) FROM branch GROUP BY REGION ORDER BY COUNT(*) DESC
    """)).fetchall()

    return {
        "branches": branches,
        "regions": {
            "labels": [r[0] for r in region_rows],
            "data": [int(r[1]) for r in region_rows],
        },
        "total": len(branches),
    }


@router.get("/{bm_code}")
def get_branch_detail(bm_code: str, db: Session = Depends(get_db)):
    branch = db.execute(
        text("SELECT BM_CODE, BRANCH_NAME, REGION FROM branch WHERE BM_CODE = :bm"),
        {"bm": bm_code},
    ).fetchone()

    if not branch:
        return {"error": "Branch not found"}

    employees = db.execute(
        text("SELECT ID, EMPLOYEE_NAME, EMPLOYEE_NUMBER FROM branch_employee WHERE BM_CODE = :bm"),
        {"bm": bm_code},
    ).fetchall()

    otp_stats = db.execute(text("""
        SELECT COUNT(*), MAX(OTP_DATE), MIN(OTP_DATE)
        FROM otp_report WHERE BM_CODE = :bm
    """), {"bm": bm_code}).fetchone()

    return {
        "bm": branch[0],
        "name": branch[1],
        "region": branch[2],
        "employees": [
            {"id": e[0], "name": e[1], "number": e[2]} for e in employees
        ],
        "otpCount": int(otp_stats[0] or 0),
        "lastOtp": otp_stats[1].strftime("%Y-%m-%d") if otp_stats[1] else None,
        "firstOtp": otp_stats[2].strftime("%Y-%m-%d") if otp_stats[2] else None,
    }