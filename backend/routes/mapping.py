"""
/api/mapping — Column mapping wizard endpoints.
"""

import io
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db import get_db
from services import mapping_service

router = APIRouter()


# ═══════════════════════════════════════════════════════════════
# DETECT — analyze uploaded CSV
# ═══════════════════════════════════════════════════════════════

@router.post("/detect")
async def detect(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Upload a CSV, get back:
      - detected headers
      - suggested target table
      - suggested column mapping
      - saved template if one matches
    """
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(400, "Only .csv files accepted")

    contents = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(contents), nrows=5)
    except Exception as e:
        raise HTTPException(400, f"Could not parse CSV: {e}")

    headers = df.columns.tolist()

    # 1. Detect target table
    detection = mapping_service.detect_target_table(headers)

    # 2. Check for saved template
    template = mapping_service.find_template_by_headers(db, headers)

    # 3. If no template, generate suggestions
    if template:
        suggestions = template["mapping"].get("suggestions", [])
    else:
        suggestions = mapping_service.suggest_mapping(headers, detection["table"])

    # 4. Preview first 3 rows
    preview = df.head(3).fillna("").astype(str).to_dict(orient="records")

    return {
        "filename": file.filename,
        "headers": headers,
        "detected": detection,
        "template": template,
        "suggestions": suggestions,
        "preview": preview,
        "schema": mapping_service.TARGET_SCHEMAS.get(detection["table"], {}),
    }


# ═══════════════════════════════════════════════════════════════
# PREVIEW — apply user mapping, show mapped rows
# ═══════════════════════════════════════════════════════════════

class PreviewRequest(BaseModel):
    filename: str
    targetTable: str
    mapping: list[dict]  # [{ csvColumn, targetColumn }, ...]


@router.post("/preview")
async def preview(
    request: PreviewRequest,
    file: UploadFile = File(...),
):
    """Apply user's mapping to first 5 rows, return preview."""
    contents = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(contents), nrows=5)
    except Exception as e:
        raise HTTPException(400, f"Could not parse CSV: {e}")

    # Build rename map: { csvCol: targetCol }
    rename = {}
    for m in request.mapping:
        csv_col = m.get("csvColumn")
        target_col = m.get("targetColumn")
        if csv_col and target_col:
            rename[csv_col] = target_col

    df = df.rename(columns=rename)

    # Keep only mapped columns
    mapped_targets = [m["targetColumn"] for m in request.mapping if m.get("targetColumn")]
    df = df[[c for c in mapped_targets if c in df.columns]]

    return {
        "headers": df.columns.tolist(),
        "rows": df.fillna("").astype(str).to_dict(orient="records"),
    }


# ═══════════════════════════════════════════════════════════════
# TEMPLATES
# ═══════════════════════════════════════════════════════════════

class SaveTemplateRequest(BaseModel):
    name: str
    targetTable: str
    headers: list[str]
    mapping: list[dict]


@router.post("/templates")
def save_template(
    request: SaveTemplateRequest,
    db: Session = Depends(get_db),
):
    mapping_obj = {"suggestions": request.mapping}
    return mapping_service.save_template(
        db,
        name=request.name,
        target_table=request.targetTable,
        headers=request.headers,
        mapping=mapping_obj,
    )


@router.get("/templates")
def list_templates(db: Session = Depends(get_db)):
    return {"templates": mapping_service.list_templates(db)}


@router.delete("/templates/{template_id}")
def delete_template(template_id: int, db: Session = Depends(get_db)):
    ok = mapping_service.delete_template(db, template_id)
    if not ok:
        raise HTTPException(404, "Template not found")
    return {"deleted": True, "id": template_id}


# ═══════════════════════════════════════════════════════════════
# SCHEMA INFO
# ═══════════════════════════════════════════════════════════════

@router.get("/schemas")
def get_schemas():
    """Return all target schemas for the mapping UI."""
    return {
        "schemas": mapping_service.TARGET_SCHEMAS,
        "aliases": mapping_service.ALIASES,
    }