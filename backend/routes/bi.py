"""
/api/bi — Power BI-style aggregate endpoint.
Returns all data needed for the BI dashboard in one call.
Supports filters: region, purpose, days.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from db import get_db

router = APIRouter()


@router.get("")
def get_bi(
    region: str | None = Query(None),
    purpose: str | None = Query(None),
    days: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
):
    # ─── Build WHERE clauses ───
    otp_where = ["OTP_DATE >= DATE_SUB(CURDATE(), INTERVAL :days DAY)"]
    otp_params = {"days": days}

    if region and region != "all":
        otp_where.append("BM_CODE IN (SELECT BM_CODE FROM branch WHERE REGION = :region)")
        otp_params["region"] = region

    if purpose and purpose != "all":
        otp_where.append("PURPOSE = :purpose")
        otp_params["purpose"] = purpose

    otp_where_sql = " AND ".join(otp_where)

    # ─── KPI totals ───
    kpis = db.execute(text(f"""
        SELECT
            (SELECT COUNT(*) FROM branch) AS total_branches,
            (SELECT COUNT(*) FROM branch_employee) AS total_employees,
            (SELECT COUNT(*) FROM otp_report WHERE {otp_where_sql}) AS total_otp,
            (SELECT ROUND(SUM(CASE WHEN STATUS='SUCCESS' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1)
             FROM etl_runs) AS etl_rate
    """), otp_params).fetchone()

    # ─── Daily OTP trend ───
    trend_rows = db.execute(text(f"""
        SELECT OTP_DATE, COUNT(*) AS cnt
        FROM otp_report
        WHERE {otp_where_sql}
        GROUP BY OTP_DATE
        ORDER BY OTP_DATE
    """), otp_params).fetchall()

    # ─── By purpose ───
    purpose_rows = db.execute(text(f"""
        SELECT PURPOSE, COUNT(*) AS cnt
        FROM otp_report
        WHERE {otp_where_sql}
        GROUP BY PURPOSE
        ORDER BY cnt DESC
    """), otp_params).fetchall()

    # ─── Top operators ───
    operator_rows = db.execute(text(f"""
        SELECT OPERATOR, COUNT(*) AS cnt
        FROM otp_report
        WHERE {otp_where_sql} AND OPERATOR IS NOT NULL AND OPERATOR != ''
        GROUP BY OPERATOR
        ORDER BY cnt DESC
        LIMIT 8
    """), otp_params).fetchall()

    # ─── Top branches ───
    branch_rows = db.execute(text(f"""
        SELECT b.BRANCH_NAME, COUNT(*) AS cnt
        FROM otp_report o
        JOIN branch b ON b.BM_CODE = o.BM_CODE
        WHERE {" AND ".join(otp_where).replace("BM_CODE IN", "o.BM_CODE IN").replace("OTP_DATE", "o.OTP_DATE").replace("PURPOSE", "o.PURPOSE")}
        GROUP BY b.BM_CODE, b.BRANCH_NAME
        ORDER BY cnt DESC
        LIMIT 8
    """), otp_params).fetchall() if region and region != "all" or purpose and purpose != "all" else db.execute(text(f"""
        SELECT b.BRANCH_NAME, COUNT(*) AS cnt
        FROM otp_report o
        JOIN branch b ON b.BM_CODE = o.BM_CODE
        WHERE o.OTP_DATE >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
        GROUP BY b.BM_CODE, b.BRANCH_NAME
        ORDER BY cnt DESC
        LIMIT 8
    """), {"days": days}).fetchall()

    # ─── Branch detail table ───
    detail_rows = db.execute(text(f"""
        SELECT
            b.BM_CODE,
            b.BRANCH_NAME,
            b.REGION,
            COALESCE(emp.cnt, 0) AS employees,
            COALESCE(otp.cnt, 0) AS otp_count,
            COALESCE(ROUND(otp.cnt / GREATEST(emp.cnt, 1), 2), 0) AS otp_per_employee
        FROM branch b
        LEFT JOIN (
            SELECT BM_CODE, COUNT(*) AS cnt FROM branch_employee GROUP BY BM_CODE
        ) emp ON emp.BM_CODE = b.BM_CODE
        LEFT JOIN (
            SELECT o.BM_CODE, COUNT(*) AS cnt
            FROM otp_report o
            WHERE o.OTP_DATE >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
            {"AND o.PURPOSE = :purpose" if purpose and purpose != "all" else ""}
            GROUP BY o.BM_CODE
        ) otp ON otp.BM_CODE = b.BM_CODE
        {"WHERE b.REGION = :region" if region and region != "all" else ""}
        ORDER BY otp_count DESC
        LIMIT 50
    """), {**{"days": days}, **({"purpose": purpose} if purpose and purpose != "all" else {}), **({"region": region} if region and region != "all" else {})}).fetchall()

    # ─── Filter options ───
    regions = [r[0] for r in db.execute(text("SELECT DISTINCT REGION FROM branch ORDER BY REGION")).fetchall()]
    purposes = [r[0] for r in db.execute(text("SELECT DISTINCT PURPOSE FROM otp_report ORDER BY PURPOSE")).fetchall()]

    return {
        "kpis": {
            "branches": int(kpis[0] or 0),
            "employees": int(kpis[1] or 0),
            "otp": int(kpis[2] or 0),
            "etlRate": float(kpis[3] or 0),
        },
        "trend": {
            "labels": [r[0].strftime("%b %d") for r in trend_rows],
            "data": [int(r[1]) for r in trend_rows],
        },
        "byPurpose": {
            "labels": [r[0] for r in purpose_rows],
            "data": [int(r[1]) for r in purpose_rows],
            "colors": ["#06b6d4", "#10b981", "#f59e0b", "#8b5cf6", "#64748b", "#ec4899"][:len(purpose_rows)],
        },
        "topOperators": {
            "labels": [r[0] for r in operator_rows],
            "data": [int(r[1]) for r in operator_rows],
        },
        "topBranches": {
            "labels": [r[0] for r in branch_rows],
            "data": [int(r[1]) for r in branch_rows],
        },
        "detail": [
            {
                "bm": r[0],
                "name": r[1],
                "region": r[2],
                "employees": int(r[3]),
                "otp": int(r[4]),
                "otpPerEmployee": float(r[5]),
            }
            for r in detail_rows
        ],
        "filterOptions": {
            "regions": regions,
            "purposes": purposes,
        },
    }