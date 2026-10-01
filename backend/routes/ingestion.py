"""
POST /api/ingestion/upload — receive files and run ETL.
GET  /api/ingestion/files  — list uploaded files.
GET  /api/ingestion/recent — recent ETL runs.
"""

import shutil
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from db import get_db
from services.etl_runner import run_etl_for_file

router = APIRouter()

ROOT = Path(__file__).resolve().parent.parent.parent
LANDING_DIR = ROOT / "data" / "landing"
LANDING_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".csv"}
MAX_FILE_SIZE_MB = 50


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    # ─── Validate extension ───
    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Only {', '.join(ALLOWED_EXTENSIONS)} files allowed",
        )

    # ─── Read + size check ───
    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({size_mb:.1f} MB > {MAX_FILE_SIZE_MB} MB)",
        )

    # ─── Save to landing dir ───
    dest = LANDING_DIR / file.filename
    dest.write_bytes(contents)

    # ─── Run ETL ───
    result = run_etl_for_file(db, dest)

    return {
        "filename": file.filename,
        "size_mb": round(size_mb, 2),
        "uploaded_at": datetime.now().isoformat(),
        "etl": result,
    }


@router.get("/files")
def list_files(db: Session = Depends(get_db)):
    files = []
    for f in LANDING_DIR.glob("*.csv"):
        stat = f.stat()
        # Rows currently in matching table
        rows = None
        name_lower = f.name.lower()

        if "branch" in name_lower and "employee" not in name_lower:
            rows = db.execute(text("SELECT COUNT(*) FROM branch")).scalar()
        elif "employee" in name_lower:
            rows = db.execute(text("SELECT COUNT(*) FROM branch_employee")).scalar()
        elif "otp" in name_lower:
            rows = db.execute(text("SELECT COUNT(*) FROM otp_report")).scalar()
        elif "panic" in name_lower:
            rows = db.execute(text("SELECT COUNT(*) FROM panic_alerts")).scalar()
        elif "smoke" in name_lower:
            rows = db.execute(text("SELECT COUNT(*) FROM smoke_alerts")).scalar()
        elif "alert" in name_lower:
            # Generic "alert" filenames — show combined count
            panic_n = db.execute(text("SELECT COUNT(*) FROM panic_alerts")).scalar() or 0
            smoke_n = db.execute(text("SELECT COUNT(*) FROM smoke_alerts")).scalar() or 0
            rows = int(panic_n) + int(smoke_n)
        elif "etl" in name_lower:
            rows = db.execute(text("SELECT COUNT(*) FROM etl_runs")).scalar()

        files.append({
            "file": f.name,
            "size_bytes": stat.st_size,
            "size_label": (
                f"{stat.st_size / 1024 / 1024:.1f} MB"
                if stat.st_size > 1024 * 1024
                else f"{stat.st_size / 1024:.0f} KB"
            ),
            "rows": rows,
            "modified": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M"),
        })

    return {"files": files, "total": len(files)}


@router.get("/recent")
def recent_runs(limit: int = 10, db: Session = Depends(get_db)):
    rows = db.execute(text(f"""
        SELECT FILE_NAME, STATUS, ROWS_IN, ROWS_LOADED, ROWS_DROPPED,
               DURATION_SEC, RUN_DATE
        FROM etl_runs
        ORDER BY ID DESC
        LIMIT :limit
    """), {"limit": limit}).fetchall()

    return {
        "runs": [
            {
                "file": r[0],
                "status": (r[1] or "unknown").lower(),
                "rowsIn": int(r[2] or 0),
                "rowsLoaded": int(r[3] or 0),
                "rowsDropped": int(r[4] or 0),
                "duration": int(r[5] or 0),
                "date": r[6].strftime("%Y-%m-%d") if r[6] else "—",
            }
            for r in rows
        ]
    }