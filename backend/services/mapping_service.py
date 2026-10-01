"""
Column mapping service.
- Detects target table from CSV headers
- Suggests column mappings via fuzzy matching
- Applies mapping to row data
- Saves and loads templates
"""

import hashlib
import json
from difflib import SequenceMatcher
from typing import Optional

from sqlalchemy import text
from sqlalchemy.orm import Session


# ═══════════════════════════════════════════════════════════════
# TARGET TABLE SCHEMAS — defines expected columns
# ═══════════════════════════════════════════════════════════════

TARGET_SCHEMAS = {
    "branch": {
        "label": "Branch",
        "columns": {
            "BM_CODE": {"required": True, "type": "string"},
            "BRANCH_NAME": {"required": False, "type": "string"},
            "REGION": {"required": False, "type": "string"},
        },
    },
    "branch_employee": {
        "label": "Branch Employees",
        "columns": {
            "BM_CODE": {"required": True, "type": "string"},
            "EMPLOYEE_NAME": {"required": True, "type": "string"},
            "EMPLOYEE_NUMBER": {"required": True, "type": "string"},
        },
    },
    "otp_report": {
        "label": "OTP Report",
        "columns": {
            "BM_CODE": {"required": True, "type": "string"},
            "PURPOSE": {"required": True, "type": "string"},
            "OPERATOR": {"required": False, "type": "string"},
            "OTP_DATE": {"required": True, "type": "date"},
            "OTP_TIME": {"required": True, "type": "time"},
            "MOBILE_NUMBER": {"required": False, "type": "string"},
        },
    },
    "etl_runs": {
        "label": "ETL Runs",
        "columns": {
            "RUN_DATE": {"required": True, "type": "date"},
            "FILE_NAME": {"required": True, "type": "string"},
            "STARTED_AT": {"required": False, "type": "datetime"},
            "FINISHED_AT": {"required": False, "type": "datetime"},
            "DURATION_SEC": {"required": False, "type": "int"},
            "ROWS_IN": {"required": False, "type": "int"},
            "ROWS_LOADED": {"required": False, "type": "int"},
            "ROWS_DROPPED": {"required": False, "type": "int"},
            "DROP_PCT": {"required": False, "type": "float"},
            "STATUS": {"required": False, "type": "string"},
            "ERROR_MSG": {"required": False, "type": "string"},
        },
    },
}


# ═══════════════════════════════════════════════════════════════
# ALIASES — common alternative column names
# ═══════════════════════════════════════════════════════════════

ALIASES = {
    "BM_CODE": ["bmcode", "bm code", "branch_code", "branchcode", "branch", "code", "bm"],
    "BRANCH_NAME": ["branchname", "name", "branch"],
    "REGION": ["region", "zone", "area", "territory"],
    "EMPLOYEE_NAME": ["empname", "employee_name", "name", "staff_name", "employee"],
    "EMPLOYEE_NUMBER": ["empnum", "emp_no", "employee_number", "emp_no", "emp_id", "empcode", "staff_id"],
    "PURPOSE": ["purpose", "type", "category", "reason"],
    "OPERATOR": ["operator", "user", "created_by", "gen", "agent", "login"],
    "OTP_DATE": ["date", "otpdate", "otp_date", "created_date"],
    "OTP_TIME": ["time", "otptime", "otp_time", "created_time"],
    "MOBILE_NUMBER": ["mobile", "mobileno", "phone", "mobilenumber", "contact", "mobile_number", "mob"],
    "RUN_DATE": ["rundate", "run_date", "date"],
    "FILE_NAME": ["filename", "file", "file_name", "source"],
    "STARTED_AT": ["started", "start", "startedat", "start_time"],
    "FINISHED_AT": ["finished", "end", "finishedat", "end_time"],
    "DURATION_SEC": ["duration", "duration_sec", "time_taken"],
    "ROWS_IN": ["rowsin", "rows_in", "input_rows"],
    "ROWS_LOADED": ["rowsloaded", "rows_loaded", "loaded"],
    "ROWS_DROPPED": ["rowsdropped", "rows_dropped", "dropped"],
    "DROP_PCT": ["droppct", "drop_pct", "drop_percent"],
    "STATUS": ["status", "state", "result"],
    "ERROR_MSG": ["error", "error_msg", "message", "err"],
}


def normalize(name: str) -> str:
    """Normalize a column name for comparison."""
    return name.strip().lower().replace(" ", "_").replace("-", "_")


def similarity(a: str, b: str) -> float:
    """Fuzzy match score 0..1."""
    return SequenceMatcher(None, normalize(a), normalize(b)).ratio()


def score_column_to_target(csv_col: str, target_col: str) -> float:
    """
    Score how well a CSV column matches a target DB column.
    Uses exact match, alias match, and fuzzy matching.
    """
    csv_norm = normalize(csv_col)
    target_norm = normalize(target_col)

    # Exact match
    if csv_norm == target_norm:
        return 1.0

    # Alias match
    aliases = ALIASES.get(target_col, [])
    if csv_norm in [normalize(a) for a in aliases]:
        return 0.95

    # Fuzzy match against target name
    score = similarity(csv_col, target_col)

    # Fuzzy match against aliases
    for alias in aliases:
        alias_score = similarity(csv_col, alias)
        if alias_score > score:
            score = alias_score

    return round(score, 3)


# ═══════════════════════════════════════════════════════════════
# DETECTION
# ═══════════════════════════════════════════════════════════════

def detect_target_table(headers: list[str]) -> dict:
    """
    Given CSV headers, determine the best-matching target table.
    Returns { table, confidence, scores }.
    """
    scores = {}

    for table, schema in TARGET_SCHEMAS.items():
        # For each target column, find the best-matching CSV column
        total_score = 0
        matches = 0

        for target_col, spec in schema["columns"].items():
            best = 0
            for csv_col in headers:
                s = score_column_to_target(csv_col, target_col)
                best = max(best, s)

            # Required columns weigh more
            weight = 2 if spec["required"] else 1
            total_score += best * weight
            matches += weight

        scores[table] = round(total_score / matches, 3) if matches else 0

    # Best match
    best_table = max(scores, key=scores.get)
    return {
        "table": best_table,
        "confidence": scores[best_table],
        "scores": scores,
    }


def suggest_mapping(headers: list[str], target_table: str) -> list[dict]:
    """
    For a given target table, suggest a mapping for each CSV column.
    Returns a list of { csvColumn, suggestedTarget, confidence }.
    """
    schema = TARGET_SCHEMAS.get(target_table, {})
    target_cols = list(schema.get("columns", {}).keys())

    # Track which target columns are already taken
    used_targets = set()
    suggestions = []

    # First pass: for each target column, find best CSV match
    best_for_target = {}
    for target_col in target_cols:
        best_score = 0
        best_csv = None
        for csv_col in headers:
            s = score_column_to_target(csv_col, target_col)
            if s > best_score:
                best_score = s
                best_csv = csv_col
        if best_csv and best_score >= 0.6:
            best_for_target[target_col] = (best_csv, best_score)

    # Build suggestion list per CSV column
    for csv_col in headers:
        best_target = None
        best_score = 0
        for target_col, (mapped_csv, score) in best_for_target.items():
            if mapped_csv == csv_col and target_col not in used_targets:
                if score > best_score:
                    best_score = score
                    best_target = target_col

        if best_target:
            used_targets.add(best_target)

        suggestions.append({
            "csvColumn": csv_col,
            "suggestedTarget": best_target,
            "confidence": best_score,
        })

    return suggestions


# ═══════════════════════════════════════════════════════════════
# TEMPLATES
# ═══════════════════════════════════════════════════════════════

def headers_signature(headers: list[str]) -> str:
    """Deterministic signature for a set of headers."""
    normalized = sorted([normalize(h) for h in headers])
    raw = "|".join(normalized)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


def save_template(
    db: Session,
    name: str,
    target_table: str,
    headers: list[str],
    mapping: dict,
    user_id: Optional[int] = None,
) -> dict:
    sig = headers_signature(headers)
    result = db.execute(
        text("""
            INSERT INTO column_mappings
              (NAME, TARGET_TABLE, HEADERS_SIGNATURE, MAPPING_JSON, CREATED_BY)
            VALUES (:n, :t, :s, :m, :u)
        """),
        {
            "n": name[:100],
            "t": target_table,
            "s": sig,
            "m": json.dumps(mapping),
            "u": user_id,
        },
    )
    db.commit()
    return {"id": result.lastrowid, "name": name, "targetTable": target_table}


def list_templates(db: Session) -> list[dict]:
    rows = db.execute(
        text("""
            SELECT ID, NAME, TARGET_TABLE, HEADERS_SIGNATURE, CREATED_AT
            FROM column_mappings
            ORDER BY ID DESC
        """)
    ).fetchall()
    return [
        {
            "id": r[0],
            "name": r[1],
            "targetTable": r[2],
            "signature": r[3],
            "createdAt": r[4].isoformat() if r[4] else None,
        }
        for r in rows
    ]


def find_template_by_headers(db: Session, headers: list[str]) -> Optional[dict]:
    sig = headers_signature(headers)
    row = db.execute(
        text("""
            SELECT ID, NAME, TARGET_TABLE, MAPPING_JSON
            FROM column_mappings
            WHERE HEADERS_SIGNATURE = :sig
            LIMIT 1
        """),
        {"sig": sig},
    ).fetchone()
    if not row:
        return None
    return {
        "id": row[0],
        "name": row[1],
        "targetTable": row[2],
        "mapping": json.loads(row[3]),
    }


def delete_template(db: Session, template_id: int) -> bool:
    result = db.execute(
        text("DELETE FROM column_mappings WHERE ID = :id"),
        {"id": template_id},
    )
    db.commit()
    return result.rowcount > 0