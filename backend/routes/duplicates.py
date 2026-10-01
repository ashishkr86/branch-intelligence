"""
/api/duplicates — view and clean duplicates in each table.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from db import get_db
from services.deduplication import (
    BUSINESS_KEYS,
    find_duplicates_in_db,
)

router = APIRouter()

TABLES = ["branch", "branch_employee", "otp_report", "etl_runs"]


@router.get("")
def list_duplicates(db: Session = Depends(get_db)):
    """Return duplicate stats for each table."""
    results = {}
    total_duplicates = 0

    for tbl in TABLES:
        stats = find_duplicates_in_db(db, tbl)
        results[tbl] = {
            "businessKey": BUSINESS_KEYS.get(tbl, []),
            "total": stats["total"],
            "unique": stats["unique"],
            "duplicates": stats["duplicates"],
            "duplicatePct": stats["duplicate_pct"],
            "sample": stats["sample"],
        }
        total_duplicates += stats["duplicates"]

    return {
        "tables": results,
        "summary": {
            "totalDuplicates": total_duplicates,
            "cleanTables": sum(1 for t in results.values() if t["duplicates"] == 0),
            "dirtyTables": sum(1 for t in results.values() if t["duplicates"] > 0),
        },
    }


@router.post("/clean/{table}")
def clean_duplicates(
    table: str,
    dry_run: bool = Query(True),
    db: Session = Depends(get_db),
):
    """
    Delete duplicates in a table.
    Keeps the row with the lowest ID for each business key.
    Use ?dry_run=false to actually delete.
    """
    if table not in TABLES:
        return {"error": f"Unknown table: {table}"}

    key_cols = BUSINESS_KEYS.get(table)
    if not key_cols:
        return {"error": f"No business key defined for {table}"}

    key_sql = ", ".join(key_cols)

    # Count what will be deleted
    count_sql = f"""
        SELECT COUNT(*) FROM {table}
        WHERE ID NOT IN (
            SELECT MIN(ID) FROM (
                SELECT MIN(ID) AS ID FROM {table} GROUP BY {key_sql}
            ) AS keepers
        )
    """
    # Note: etl_runs has ID column; other tables do too
    # For branch table, use BM_CODE as PK instead

    if table == "branch":
        # branch uses BM_CODE as PK, no ID column
        count_sql = f"""
            SELECT COUNT(*) - COUNT(DISTINCT BM_CODE) FROM branch
        """
    else:
        count_sql = f"""
            SELECT COUNT(*) - COUNT(DISTINCT CONCAT_WS('|', {key_sql}))
            FROM {table}
        """

    try:
        to_delete = db.execute(text(count_sql)).scalar() or 0
    except Exception as e:
        return {"error": str(e)}

    if dry_run:
        return {
            "table": table,
            "dryRun": True,
            "wouldDelete": to_delete,
            "message": f"Would delete {to_delete} duplicate rows. Add ?dry_run=false to execute.",
        }

    # Actually delete
    try:
        if table == "branch":
            delete_sql = f"""
                DELETE b1 FROM branch b1
                INNER JOIN branch b2
                WHERE b1.BM_CODE = b2.BM_CODE AND b1.BM_CODE > b2.BM_CODE
            """
            # Simpler: dedupe via temp logic
            delete_sql = """
                DELETE FROM branch
                WHERE BM_CODE NOT IN (
                    SELECT BM_CODE FROM (
                        SELECT MIN(BM_CODE) AS BM_CODE FROM branch GROUP BY BM_CODE
                    ) AS keepers
                )
            """
            # branch has no duplicates by PK so this is a no-op
            return {"table": table, "deleted": 0, "message": "branch uses PK, no duplicates possible"}
        else:
            delete_sql = f"""
                DELETE FROM {table}
                WHERE ID NOT IN (
                    SELECT * FROM (
                        SELECT MIN(ID) FROM {table} GROUP BY {key_sql}
                    ) AS keepers
                )
            """
            result = db.execute(text(delete_sql))
            db.commit()
            return {
                "table": table,
                "dryRun": False,
                "deleted": result.rowcount,
            }
    except Exception as e:
        db.rollback()
        return {"error": str(e)}


@router.get("/{table}")
def table_details(table: str, db: Session = Depends(get_db)):
    """Full duplicate details for one table."""
    if table not in TABLES:
        return {"error": f"Unknown table: {table}"}

    stats = find_duplicates_in_db(db, table)
    return {
        "table": table,
        "businessKey": BUSINESS_KEYS.get(table, []),
        **stats,
    }