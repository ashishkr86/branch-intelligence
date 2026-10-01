"""
GET /api/workforce — employee analytics.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from db import get_db

router = APIRouter()


@router.get("")
def get_workforce(
    region: str | None = Query(None),
    search: str | None = Query(None),
    limit: int = Query(200, le=2000),
    db: Session = Depends(get_db),
):
    where = []
    params = {"limit": limit}

    if region and region != "all":
        where.append("b.REGION = :region")
        params["region"] = region

    if search:
        where.append("(e.EMPLOYEE_NAME LIKE :q OR e.EMPLOYEE_NUMBER LIKE :q OR b.BRANCH_NAME LIKE :q)")
        params["q"] = f"%{search}%"

    where_sql = "WHERE " + " AND ".join(where) if where else ""

    sql = f"""
        SELECT e.EMPLOYEE_NAME, e.EMPLOYEE_NUMBER, e.BM_CODE,
               b.BRANCH_NAME, b.REGION, e.CREATED_AT
        FROM branch_employee e
        JOIN branch b ON b.BM_CODE = e.BM_CODE
        {where_sql}
        ORDER BY e.ID
        LIMIT :limit
    """

    rows = db.execute(text(sql), params).fetchall()

    employees = [
        {
            "name": r[0],
            "number": r[1],
            "bm": r[2],
            "branch": r[3],
            "region": r[4],
            "createdAt": r[5].strftime("%Y-%m-%d") if r[5] else "—",
        }
        for r in rows
    ]

    # Regional distribution
    region_rows = db.execute(text("""
        SELECT b.REGION, COUNT(*) AS cnt
        FROM branch_employee e
        JOIN branch b ON b.BM_CODE = e.BM_CODE
        GROUP BY b.REGION
        ORDER BY cnt DESC
    """)).fetchall()

    # Top branches by headcount
    branch_rows = db.execute(text("""
        SELECT b.BRANCH_NAME, COUNT(*) AS cnt
        FROM branch_employee e
        JOIN branch b ON b.BM_CODE = e.BM_CODE
        GROUP BY b.BM_CODE, b.BRANCH_NAME
        ORDER BY cnt DESC
        LIMIT 5
    """)).fetchall()

    return {
        "employees": employees,
        "total": len(employees),
        "byRegion": {
            "labels": [r[0] for r in region_rows],
            "data": [int(r[1]) for r in region_rows],
        },
        "byBranch": {
            "labels": [r[0] for r in branch_rows],
            "data": [int(r[1]) for r in branch_rows],
        },
    }