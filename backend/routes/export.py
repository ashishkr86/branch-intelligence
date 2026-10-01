"""
/api/export — CSV/JSON export endpoints for Power BI, Tableau, etc.
"""

import csv
import io
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from db import get_db

router = APIRouter()

# Whitelisted views — prevents SQL injection
ALLOWED_VIEWS = {
    "branch_summary": "v_branch_summary",
    "daily_otp": "v_daily_otp",
    "otp_by_purpose": "v_otp_by_purpose",
    "operator_performance": "v_operator_performance",
    "regional_rollup": "v_regional_rollup",
    "etl_health": "v_etl_health",
    "hourly_otp": "v_hourly_otp",
}


@router.get("/views")
def list_views():
    """List available export views."""
    return {
        "views": [
            {"id": k, "table": v, "endpoint": f"/api/export/{k}"}
            for k, v in ALLOWED_VIEWS.items()
        ]
    }


@router.get("/{view_name}")
def export_view(
    view_name: str,
    format: str = Query("json", pattern="^(json|csv)$"),
    limit: int = Query(10000, le=100000),
    db: Session = Depends(get_db),
):
    """Export a whitelisted view as JSON or CSV."""
    if view_name not in ALLOWED_VIEWS:
        return {"error": f"View '{view_name}' not allowed"}

    table = ALLOWED_VIEWS[view_name]
    result = db.execute(text(f"SELECT * FROM {table} LIMIT :limit"), {"limit": limit})
    rows = [dict(r._mapping) for r in result]

    if format == "csv":
        output = io.StringIO()
        if rows:
            writer = csv.DictWriter(output, fieldnames=rows[0].keys())
            writer.writeheader()
            for r in rows:
                writer.writerow({k: ("" if v is None else str(v)) for k, v in r.items()})
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={view_name}.csv"},
        )

    return {"view": view_name, "row_count": len(rows), "rows": rows}