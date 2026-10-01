"""
/api/operators — operator-level OTP analytics.

Endpoints:
  GET /api/operators                → list all operators with summary
  GET /api/operators/{operator}     → detail for one operator
  GET /api/operators/{operator}/records → recent OTP records for one operator
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from db import get_db

router = APIRouter()


@router.get("")
def list_operators(
    search: str | None = Query(None),
    region: str | None = Query(None),
    limit: int = Query(100, le=1000),
    db: Session = Depends(get_db),
):
    """
    List every operator with:
      - Total OTPs
      - Branches covered
      - First & last activity
      - Average OTPs per branch
    """
    where = ["OPERATOR IS NOT NULL", "OPERATOR != ''"]
    params = {"limit": limit}

    if search:
        where.append("OPERATOR LIKE :q")
        params["q"] = f"%{search}%"

    if region and region != "all":
        where.append("BM_CODE IN (SELECT BM_CODE FROM branch WHERE REGION = :region)")
        params["region"] = region

    where_sql = " AND ".join(where)

    rows = db.execute(
        text(f"""
            SELECT
                OPERATOR,
                COUNT(*) AS otp_count,
                COUNT(DISTINCT BM_CODE) AS branches_covered,
                COUNT(DISTINCT PURPOSE) AS purposes_used,
                MIN(OTP_DATE) AS first_activity,
                MAX(OTP_DATE) AS last_activity,
                ROUND(COUNT(*) * 1.0 / COUNT(DISTINCT BM_CODE), 2) AS avg_per_branch
            FROM otp_report
            WHERE {where_sql}
            GROUP BY OPERATOR
            ORDER BY otp_count DESC
            LIMIT :limit
        """),
        params,
    ).fetchall()

    operators = [
        {
            "operator": r[0],
            "otp": int(r[1]),
            "branches": int(r[2]),
            "purposes": int(r[3]),
            "firstActivity": r[4].strftime("%Y-%m-%d") if r[4] else "—",
            "lastActivity": r[5].strftime("%Y-%m-%d") if r[5] else "—",
            "avgPerBranch": float(r[6]),
        }
        for r in rows
    ]

    # Summary stats
    total_operators = len(operators)
    total_otp = sum(o["otp"] for o in operators)
    avg_otp = round(total_otp / total_operators, 1) if total_operators else 0
    top_operator = operators[0] if operators else None

    # Region breakdown
    region_rows = db.execute(text("""
        SELECT REGION FROM branch ORDER BY REGION
    """)).fetchall()
    regions = [r[0] for r in region_rows]

    return {
        "operators": operators,
        "total": total_operators,
        "summary": {
            "totalOperators": total_operators,
            "totalOtp": total_otp,
            "avgOtpPerOperator": avg_otp,
            "topOperator": top_operator["operator"] if top_operator else "—",
            "topOperatorOtp": top_operator["otp"] if top_operator else 0,
        },
        "filterOptions": {
            "regions": regions,
        },
    }


@router.get("/{operator}/records")
def operator_records(
    operator: str,
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
):
    """Recent OTP records for a single operator."""
    # Confirm operator exists
    exists = db.execute(
        text("SELECT COUNT(*) FROM otp_report WHERE OPERATOR = :op"),
        {"op": operator},
    ).scalar()

    if not exists:
        raise HTTPException(status_code=404, detail="Operator not found")

    rows = db.execute(
        text("""
            SELECT o.ID, o.BM_CODE, b.BRANCH_NAME, b.REGION,
                   o.PURPOSE, o.OTP_DATE, o.OTP_TIME, o.MOBILE_NUMBER
            FROM otp_report o
            JOIN branch b ON b.BM_CODE = o.BM_CODE
            WHERE o.OPERATOR = :op
            ORDER BY o.OTP_DATE DESC, o.OTP_TIME DESC
            LIMIT :limit
        """),
        {"op": operator, "limit": limit},
    ).fetchall()

    return {
        "operator": operator,
        "records": [
            {
                "id": r[0],
                "bm": r[1],
                "branch": r[2],
                "region": r[3],
                "purpose": r[4],
                "date": r[5].strftime("%Y-%m-%d") if r[5] else "—",
                "time": str(r[6]) if r[6] else "—",
                "mobile": (
                    r[7][:2] + "XXXXXX" + r[7][-2:]
                    if r[7] and len(r[7]) > 4
                    else "—"
                ),
            }
            for r in rows
        ],
    }


@router.get("/{operator}")
def operator_detail(operator: str, db: Session = Depends(get_db)):
    """Full analytics for a single operator."""
    # Basic stats
    stats = db.execute(
        text("""
            SELECT
                COUNT(*) AS otp_count,
                COUNT(DISTINCT BM_CODE) AS branches_covered,
                COUNT(DISTINCT PURPOSE) AS purposes_used,
                COUNT(DISTINCT OTP_DATE) AS active_days,
                MIN(OTP_DATE) AS first_activity,
                MAX(OTP_DATE) AS last_activity
            FROM otp_report
            WHERE OPERATOR = :op
        """),
        {"op": operator},
    ).fetchone()

    if not stats or stats[0] == 0:
        raise HTTPException(status_code=404, detail="Operator not found")

    # By purpose
    purpose_rows = db.execute(
        text("""
            SELECT PURPOSE, COUNT(*) AS cnt
            FROM otp_report
            WHERE OPERATOR = :op
            GROUP BY PURPOSE
            ORDER BY cnt DESC
        """),
        {"op": operator},
    ).fetchall()

    # By branch
    branch_rows = db.execute(
        text("""
            SELECT b.BM_CODE, b.BRANCH_NAME, b.REGION, COUNT(*) AS cnt
            FROM otp_report o
            JOIN branch b ON b.BM_CODE = o.BM_CODE
            WHERE o.OPERATOR = :op
            GROUP BY b.BM_CODE, b.BRANCH_NAME, b.REGION
            ORDER BY cnt DESC
            LIMIT 20
        """),
        {"op": operator},
    ).fetchall()

    # Daily trend (last 30 days)
    trend_rows = db.execute(
        text("""
            SELECT OTP_DATE, COUNT(*) AS cnt
            FROM otp_report
            WHERE OPERATOR = :op
              AND OTP_DATE >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY OTP_DATE
            ORDER BY OTP_DATE
        """),
        {"op": operator},
    ).fetchall()

    return {
        "operator": operator,
        "stats": {
            "otp": int(stats[0]),
            "branches": int(stats[1]),
            "purposes": int(stats[2]),
            "activeDays": int(stats[3]),
            "firstActivity": stats[4].strftime("%Y-%m-%d") if stats[4] else "—",
            "lastActivity": stats[5].strftime("%Y-%m-%d") if stats[5] else "—",
            "avgPerBranch": round(stats[0] / stats[1], 2) if stats[1] else 0,
        },
        "byPurpose": {
            "labels": [r[0] for r in purpose_rows],
            "data": [int(r[1]) for r in purpose_rows],
            "colors": ["#06b6d4", "#10b981", "#f59e0b", "#8b5cf6", "#64748b", "#ec4899"][:len(purpose_rows)],
        },
        "byBranch": [
            {
                "bm": r[0],
                "name": r[1],
                "region": r[2],
                "otp": int(r[3]),
            }
            for r in branch_rows
        ],
        "trend": {
            "labels": [r[0].strftime("%b %d") for r in trend_rows],
            "data": [int(r[1]) for r in trend_rows],
        },
    }