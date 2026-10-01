"""
ETL runner — CSV to MySQL loader.
Handles both headered and headerless CSVs.

Public functions:
  - run_etl_for_file(session, file_path)          # auto-detect dataset
  - run_etl_with_mapping(session, file_path, ...) # custom column mapping
"""

import sys
from datetime import datetime, date
from pathlib import Path

import pandas as pd
from sqlalchemy import text

# ─── Paths ───
ROOT = Path(__file__).resolve().parent.parent.parent
LANDING_DIR = ROOT / "data" / "landing"


# ═══════════════════════════════════════════════════════════════
# CLEANING HELPERS
# ═══════════════════════════════════════════════════════════════

def clean_str(v, max_len=None):
    """Safely convert value to trimmed string, or None if NaN."""
    if pd.isna(v):
        return None
    s = str(v).strip()
    if max_len:
        s = s[:max_len]
    return s if s else None


def clean_bm(v):
    """Normalize BM_CODE: strip + uppercase."""
    if pd.isna(v):
        return None
    return str(v).strip().upper()


def parse_date(v):
    """Try multiple date formats. Return date object or None."""
    if pd.isna(v):
        return None
    if isinstance(v, (date, datetime)):
        return v.date() if isinstance(v, datetime) else v
    s = str(v).strip()
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d", "%m/%d/%Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def parse_time(v):
    """Try multiple time formats. Return time object or None."""
    if pd.isna(v):
        return None
    if isinstance(v, datetime):
        return v.time()
    s = str(v).strip()
    for fmt in ("%H:%M:%S", "%H:%M", "%I:%M:%S %p", "%I:%M %p"):
        try:
            return datetime.strptime(s, fmt).time()
        except ValueError:
            continue
    return None


def to_py_none(v):
    """Convert NaN / NaT to None."""
    return None if pd.isna(v) else v


def safe_int(v, default=0):
    """Safely convert to int."""
    if pd.isna(v):
        return default
    try:
        return int(float(v))
    except (ValueError, TypeError):
        return default


def safe_float(v, default=0.0):
    """Safely convert to float."""
    if pd.isna(v):
        return default
    try:
        return float(v)
    except (ValueError, TypeError):
        return default


# ═══════════════════════════════════════════════════════════════
# HEADERLESS CSV DETECTION
# ═══════════════════════════════════════════════════════════════

def _looks_like_data_row(values):
    """
    Decide if a CSV's first line is DATA (no header) or COLUMN NAMES.
    """
    for v in values:
        s = str(v).strip()
        if not s:
            continue
        # Date: 2026-09-21
        if len(s) == 10 and s[4] == "-" and s[7] == "-":
            return True
        # Time: 12:34:36
        if ":" in s and len(s) <= 8 and s.count(":") >= 1:
            return True
        # BM code: BM10034
        if s.upper().startswith("BM") and len(s) > 4:
            return True
        # Long number: 9556834447
        if s.isdigit() and len(s) >= 8:
            return True
        # Very long text
        if len(s) > 40:
            return True
    return False


def _detect_dataset(filename, columns):
    """
    Detect dataset type from column names (preferred) or filename (fallback).
    Returns: "otp_report", "alerts", "branch", "branch_employee", "etl_runs", or None.
    """
    cols = {str(c).upper().strip() for c in (columns or [])}

    # ── Column-based detection (specific first) ──
    if {"PURPOSE", "OTP_DATE", "OTP_TIME"}.issubset(cols):
        return "otp_report"
    if {"FILE_NAME", "ROWS_IN", "ROWS_LOADED"}.issubset(cols):
        return "etl_runs"
    if {"EMPLOYEE_NAME", "EMPLOYEE_NUMBER"}.issubset(cols):
        return "branch_employee"

    # Alerts (9-col headerless layout)
    if {"ALERT_TYPE", "ALERT_DATE_RAW", "STATUS"}.issubset(cols):
        return "alerts"
    # Alerts (headered)
    if {"ALERT_TYPE", "ALERT_DATE"}.issubset(cols):
        return "alerts"

    if {"BRANCH_NAME", "REGION"}.issubset(cols):
        return "branch"

    # ── Filename-based fallback ──
    if filename:
        lower = filename.lower()
        if "panic" in lower or "smoke" in lower or "alert" in lower:
            return "alerts"
        if "branch" in lower and "employee" in lower:
            return "branch_employee"
        if "employee" in lower:
            return "branch_employee"
        if "otp" in lower:
            return "otp_report"
        if "etl" in lower:
            return "etl_runs"
        if "branch" in lower:
            return "branch"

    return None


# ═══════════════════════════════════════════════════════════════
# ALERTS LOADER (shared by run_etl_for_file / run_etl_with_mapping)
# ═══════════════════════════════════════════════════════════════

def _load_alerts(session, df):
    """
    Route alert rows to panic_alerts or smoke_alerts based on ALERT_TYPE.
    Returns number of rows inserted.
    """
    required = ["BM_CODE", "ALERT_TYPE", "ALERT_DATE_RAW", "ALERT_TIME"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Missing columns: {missing}")

    df["BM_CODE"] = df["BM_CODE"].apply(clean_bm)
    df["BRANCH_NAME"] = (
        df["BRANCH_NAME"].apply(lambda v: clean_str(v, 150))
        if "BRANCH_NAME" in df.columns else None
    )
    df["ALERT_TYPE"] = df["ALERT_TYPE"].apply(lambda v: clean_str(v, 100))
    df["OPERATOR"] = (
        df["OPERATOR"].apply(lambda v: clean_str(v, 150))
        if "OPERATOR" in df.columns else None
    )
    df["COMMENTS"] = (
        df["COMMENTS"].apply(lambda v: clean_str(v))
        if "COMMENTS" in df.columns else None
    )
    df["STATUS"] = (
        df["STATUS"].apply(lambda v: clean_str(v, 30))
        if "STATUS" in df.columns else "CLOSED"
    )
    df["ALERT_DATE"] = df["ALERT_DATE_RAW"].apply(parse_date)
    df["ALERT_TIME"] = df["ALERT_TIME"].apply(parse_time)

    df = df.dropna(subset=["BM_CODE", "ALERT_TYPE", "ALERT_DATE", "ALERT_TIME"])

    rows_loaded = 0
    for _, row in df.iterrows():
        atype = (row["ALERT_TYPE"] or "").lower()
        status = row["STATUS"] if pd.notna(row["STATUS"]) and row["STATUS"] else "CLOSED"

        params = {
            "bm": row["BM_CODE"],
            "br": to_py_none(row["BRANCH_NAME"]),
            "at": row["ALERT_TYPE"],
            "ad": row["ALERT_DATE"],
            "atime": row["ALERT_TIME"],
            "op": to_py_none(row["OPERATOR"]),
            "cm": to_py_none(row["COMMENTS"]),
            "st": status,
        }

        if "smoke" in atype:
            session.execute(text("""
                INSERT INTO smoke_alerts
                  (BM_CODE, BRANCH_NAME, ALERT_TYPE, ALERT_DATE, ALERT_TIME,
                   OPERATOR, COMMENTS, STATUS)
                VALUES (:bm, :br, :at, :ad, :atime, :op, :cm, :st)
            """), params)
        else:
            session.execute(text("""
                INSERT INTO panic_alerts
                  (BM_CODE, BRANCH_NAME, ALERT_TYPE, ALERT_DATE, ALERT_TIME,
                   OPERATOR, COMMENTS, STATUS)
                VALUES (:bm, :br, :at, :ad, :atime, :op, :cm, :st)
            """), params)
        rows_loaded += 1

    return rows_loaded


# ═══════════════════════════════════════════════════════════════
# MAIN ETL FUNCTION — AUTO-DETECT
# ═══════════════════════════════════════════════════════════════

def run_etl_for_file(session, file_path):
    """
    Process a single uploaded file and load it into the correct table.
    Auto-detects dataset type and handles headerless CSVs.
    """
    filename = file_path.name
    started = datetime.now()

    # ─── 1. Read CSV ───
    try:
        df_with_header = pd.read_csv(file_path)
        first_row_values = df_with_header.columns.tolist()

        if _looks_like_data_row(first_row_values):
            # Headerless CSV
            df = pd.read_csv(file_path, header=None)
            n_cols = len(df.columns)
            LAYOUTS = {
                6: ["BM_CODE", "PURPOSE", "OPERATOR", "OTP_DATE", "OTP_TIME", "MOBILE_NUMBER"],
                7: ["ID", "BM_CODE", "PURPOSE", "OPERATOR", "OTP_DATE", "OTP_TIME", "MOBILE_NUMBER"],
                4: ["BM_CODE", "BRANCH_NAME", "REGION", "CREATED_AT"],
                5: ["BM_CODE", "EMPLOYEE_NAME", "EMPLOYEE_NUMBER", "REGION", "CREATED_AT"],
                9: ["BM_CODE", "BRANCH_NAME", "ALERT_TYPE", "ALERT_DATE_RAW",
                    "ALERT_TIME", "OPERATOR", "SOURCE_LABEL", "COMMENTS", "STATUS"],
            }
            if n_cols in LAYOUTS:
                df.columns = LAYOUTS[n_cols]
            else:
                df.columns = [f"COL_{i}" for i in range(n_cols)]
        else:
            df = df_with_header
            df.columns = [str(c).strip().upper() for c in df.columns]

        rows_in = len(df)
    except Exception as e:
        return {
            "file": filename,
            "status": "FAILED",
            "message": f"CSV parse error: {e}",
            "rows_in": 0, "rows_loaded": 0, "rows_dropped": 0,
        }

    # ─── 2. Detect dataset ───
    dataset = _detect_dataset(filename, df.columns.tolist())

    if not dataset:
        return {
            "file": filename,
            "status": "SKIPPED",
            "message": f"Unknown dataset. Columns: {', '.join(str(c) for c in df.columns.tolist())}",
            "rows_in": rows_in, "rows_loaded": 0, "rows_dropped": 0,
        }

    rows_loaded = 0

    # ─── 3. Load ───
    try:
        # ── BRANCH ──
        if dataset == "branch":
            df["BM_CODE"] = df["BM_CODE"].apply(clean_bm)
            df = df.dropna(subset=["BM_CODE"]).drop_duplicates(subset=["BM_CODE"], keep="first")
            for _, row in df.iterrows():
                session.execute(text("""
                    INSERT INTO branch (BM_CODE, BRANCH_NAME, REGION)
                    VALUES (:bm, :name, :region)
                    ON DUPLICATE KEY UPDATE
                      BRANCH_NAME = VALUES(BRANCH_NAME),
                      REGION = VALUES(REGION)
                """), {
                    "bm": row["BM_CODE"],
                    "name": clean_str(row.get("BRANCH_NAME"), 150) or "Unknown",
                    "region": clean_str(row.get("REGION"), 50) or "Unknown",
                })
                rows_loaded += 1

        # ── BRANCH EMPLOYEE ──
        elif dataset == "branch_employee":
            df["BM_CODE"] = df["BM_CODE"].apply(clean_bm)
            df["EMPLOYEE_NAME"] = df["EMPLOYEE_NAME"].apply(lambda v: clean_str(v, 150))
            df["EMPLOYEE_NUMBER"] = df["EMPLOYEE_NUMBER"].apply(lambda v: clean_str(v, 20))
            df = df.dropna(subset=["BM_CODE", "EMPLOYEE_NAME", "EMPLOYEE_NUMBER"])
            existing = {r[0] for r in session.execute(text("SELECT BM_CODE FROM branch")).fetchall()}
            df = df[df["BM_CODE"].isin(existing)]
            for _, row in df.iterrows():
                session.execute(text("""
                    INSERT INTO branch_employee (BM_CODE, EMPLOYEE_NAME, EMPLOYEE_NUMBER)
                    VALUES (:bm, :name, :num)
                """), {
                    "bm": row["BM_CODE"],
                    "name": row["EMPLOYEE_NAME"],
                    "num": row["EMPLOYEE_NUMBER"],
                })
                rows_loaded += 1

        # ── OTP REPORT ──
        elif dataset == "otp_report":
            df["BM_CODE"] = df["BM_CODE"].apply(clean_bm)
            df["PURPOSE"] = df["PURPOSE"].apply(lambda v: clean_str(v, 100))
            df["OPERATOR"] = df["OPERATOR"].apply(lambda v: clean_str(v, 150))
            df["MOBILE_NUMBER"] = df["MOBILE_NUMBER"].apply(lambda v: clean_str(v, 20))
            df["OTP_DATE"] = df["OTP_DATE"].apply(parse_date)
            df["OTP_TIME"] = df["OTP_TIME"].apply(parse_time)
            df = df.dropna(subset=["BM_CODE", "PURPOSE", "OTP_DATE", "OTP_TIME"])
            existing = {r[0] for r in session.execute(text("SELECT BM_CODE FROM branch")).fetchall()}
            df = df[df["BM_CODE"].isin(existing)]
            for _, row in df.iterrows():
                session.execute(text("""
                    INSERT INTO otp_report
                      (BM_CODE, PURPOSE, OPERATOR, OTP_DATE, OTP_TIME, MOBILE_NUMBER)
                    VALUES (:bm, :p, :op, :od, :ot, :mn)
                """), {
                    "bm": row["BM_CODE"],
                    "p": row["PURPOSE"],
                    "op": to_py_none(row["OPERATOR"]),
                    "od": row["OTP_DATE"],
                    "ot": row["OTP_TIME"],
                    "mn": to_py_none(row["MOBILE_NUMBER"]),
                })
                rows_loaded += 1

        # ── ETL RUNS ──
        elif dataset == "etl_runs":
            for _, row in df.iterrows():
                session.execute(text("""
                    INSERT INTO etl_runs
                      (RUN_DATE, FILE_NAME, STARTED_AT, FINISHED_AT,
                       DURATION_SEC, ROWS_IN, ROWS_LOADED, ROWS_DROPPED,
                       DROP_PCT, STATUS, ERROR_MSG)
                    VALUES
                      (:rd, :fn, :st, :fi, :du, :ri, :rl, :dr, :dp, :stt, :em)
                """), {
                    "rd": parse_date(row.get("RUN_DATE")),
                    "fn": clean_str(row.get("FILE_NAME"), 255) or "unknown",
                    "st": to_py_none(row.get("STARTED_AT")),
                    "fi": to_py_none(row.get("FINISHED_AT")),
                    "du": safe_int(row.get("DURATION_SEC")),
                    "ri": safe_int(row.get("ROWS_IN")),
                    "rl": safe_int(row.get("ROWS_LOADED")),
                    "dr": safe_int(row.get("ROWS_DROPPED")),
                    "dp": safe_float(row.get("DROP_PCT")),
                    "stt": clean_str(row.get("STATUS"), 20) or "SUCCESS",
                    "em": clean_str(row.get("ERROR_MSG")),
                })
                rows_loaded += 1

        # ── ALERTS (panic + smoke routed by ALERT_TYPE) ──
        elif dataset == "alerts":
            rows_loaded = _load_alerts(session, df)

        session.commit()

        finished = datetime.now()
        duration = int((finished - started).total_seconds())
        rows_dropped = rows_in - rows_loaded

        return {
            "file": filename,
            "status": "SUCCESS",
            "dataset": dataset,
            "message": f"Loaded {rows_loaded:,} rows into {dataset} in {duration}s",
            "rows_in": rows_in,
            "rows_loaded": rows_loaded,
            "rows_dropped": rows_dropped,
            "duration_sec": duration,
        }

    except Exception as e:
        session.rollback()
        return {
            "file": filename,
            "status": "FAILED",
            "dataset": dataset,
            "message": str(e),
            "rows_in": rows_in,
            "rows_loaded": rows_loaded,
            "rows_dropped": rows_in - rows_loaded,
        }


# ═══════════════════════════════════════════════════════════════
# CUSTOM MAPPING SUPPORT
# ═══════════════════════════════════════════════════════════════

def run_etl_with_mapping(session, file_path, target_table: str, mapping: list):
    """
    Process a CSV using a user-provided column mapping.
    mapping: [{ csvColumn: "...", targetColumn: "..." }, ...]
    """
    filename = file_path.name
    started = datetime.now()

    try:
        df = pd.read_csv(file_path)
        rows_in = len(df)
    except Exception as e:
        return {
            "file": filename,
            "status": "FAILED",
            "message": f"CSV parse error: {e}",
            "rows_in": 0, "rows_loaded": 0, "rows_dropped": 0,
        }

    rename = {}
    for m in mapping:
        csv_col = m.get("csvColumn")
        target_col = m.get("targetColumn")
        if csv_col and target_col and target_col != "__skip__":
            rename[csv_col] = target_col

    df = df.rename(columns=rename)
    df.columns = [str(c).strip().upper() for c in df.columns]

    required_map = {
        "branch": ["BM_CODE"],
        "branch_employee": ["BM_CODE", "EMPLOYEE_NAME", "EMPLOYEE_NUMBER"],
        "otp_report": ["BM_CODE", "PURPOSE", "OTP_DATE", "OTP_TIME"],
        "etl_runs": ["RUN_DATE", "FILE_NAME"],
        "alerts": ["BM_CODE", "ALERT_TYPE", "ALERT_DATE_RAW", "ALERT_TIME"],
    }
    for col in required_map.get(target_table, []):
        if col not in df.columns:
            df[col] = None

    rows_loaded = 0

    try:
        if target_table == "branch":
            df["BM_CODE"] = df["BM_CODE"].apply(clean_bm)
            df = df.dropna(subset=["BM_CODE"]).drop_duplicates(subset=["BM_CODE"], keep="first")
            for _, row in df.iterrows():
                session.execute(text("""
                    INSERT INTO branch (BM_CODE, BRANCH_NAME, REGION)
                    VALUES (:bm, :name, :region)
                    ON DUPLICATE KEY UPDATE
                      BRANCH_NAME = VALUES(BRANCH_NAME),
                      REGION = VALUES(REGION)
                """), {
                    "bm": row["BM_CODE"],
                    "name": clean_str(row.get("BRANCH_NAME"), 150) or "Unknown",
                    "region": clean_str(row.get("REGION"), 50) or "Unknown",
                })
                rows_loaded += 1

        elif target_table == "branch_employee":
            df["BM_CODE"] = df["BM_CODE"].apply(clean_bm)
            df["EMPLOYEE_NAME"] = df["EMPLOYEE_NAME"].apply(lambda v: clean_str(v, 150))
            df["EMPLOYEE_NUMBER"] = df["EMPLOYEE_NUMBER"].apply(lambda v: clean_str(v, 20))
            df = df.dropna(subset=["BM_CODE", "EMPLOYEE_NAME", "EMPLOYEE_NUMBER"])
            existing = {r[0] for r in session.execute(text("SELECT BM_CODE FROM branch")).fetchall()}
            df = df[df["BM_CODE"].isin(existing)]
            for _, row in df.iterrows():
                session.execute(text("""
                    INSERT INTO branch_employee (BM_CODE, EMPLOYEE_NAME, EMPLOYEE_NUMBER)
                    VALUES (:bm, :name, :num)
                """), {
                    "bm": row["BM_CODE"],
                    "name": row["EMPLOYEE_NAME"],
                    "num": row["EMPLOYEE_NUMBER"],
                })
                rows_loaded += 1

        elif target_table == "otp_report":
            df["BM_CODE"] = df["BM_CODE"].apply(clean_bm)
            df["PURPOSE"] = df["PURPOSE"].apply(lambda v: clean_str(v, 100))
            df["OPERATOR"] = df["OPERATOR"].apply(lambda v: clean_str(v, 150))
            df["MOBILE_NUMBER"] = df["MOBILE_NUMBER"].apply(lambda v: clean_str(v, 20))
            df["OTP_DATE"] = df["OTP_DATE"].apply(parse_date)
            df["OTP_TIME"] = df["OTP_TIME"].apply(parse_time)
            df = df.dropna(subset=["BM_CODE", "PURPOSE", "OTP_DATE", "OTP_TIME"])
            existing = {r[0] for r in session.execute(text("SELECT BM_CODE FROM branch")).fetchall()}
            df = df[df["BM_CODE"].isin(existing)]
            for _, row in df.iterrows():
                session.execute(text("""
                    INSERT INTO otp_report
                      (BM_CODE, PURPOSE, OPERATOR, OTP_DATE, OTP_TIME, MOBILE_NUMBER)
                    VALUES (:bm, :p, :op, :od, :ot, :mn)
                """), {
                    "bm": row["BM_CODE"],
                    "p": row["PURPOSE"],
                    "op": to_py_none(row["OPERATOR"]),
                    "od": row["OTP_DATE"],
                    "ot": row["OTP_TIME"],
                    "mn": to_py_none(row["MOBILE_NUMBER"]),
                })
                rows_loaded += 1

        elif target_table == "etl_runs":
            for _, row in df.iterrows():
                session.execute(text("""
                    INSERT INTO etl_runs
                      (RUN_DATE, FILE_NAME, STARTED_AT, FINISHED_AT,
                       DURATION_SEC, ROWS_IN, ROWS_LOADED, ROWS_DROPPED,
                       DROP_PCT, STATUS, ERROR_MSG)
                    VALUES
                      (:rd, :fn, :st, :fi, :du, :ri, :rl, :dr, :dp, :stt, :em)
                """), {
                    "rd": parse_date(row.get("RUN_DATE")),
                    "fn": clean_str(row.get("FILE_NAME"), 255) or "unknown",
                    "st": to_py_none(row.get("STARTED_AT")),
                    "fi": to_py_none(row.get("FINISHED_AT")),
                    "du": safe_int(row.get("DURATION_SEC")),
                    "ri": safe_int(row.get("ROWS_IN")),
                    "rl": safe_int(row.get("ROWS_LOADED")),
                    "dr": safe_int(row.get("ROWS_DROPPED")),
                    "dp": safe_float(row.get("DROP_PCT")),
                    "stt": clean_str(row.get("STATUS"), 20) or "SUCCESS",
                    "em": clean_str(row.get("ERROR_MSG")),
                })
                rows_loaded += 1

        elif target_table == "alerts":
            rows_loaded = _load_alerts(session, df)

        else:
            session.rollback()
            return {
                "file": filename,
                "status": "FAILED",
                "message": f"Unknown target table: {target_table}",
                "rows_in": rows_in, "rows_loaded": 0, "rows_dropped": rows_in,
            }

        session.commit()

        finished = datetime.now()
        duration = int((finished - started).total_seconds())
        rows_dropped = rows_in - rows_loaded

        return {
            "file": filename,
            "status": "SUCCESS",
            "dataset": target_table,
            "message": f"Loaded {rows_loaded:,} rows into {target_table} in {duration}s",
            "rows_in": rows_in,
            "rows_loaded": rows_loaded,
            "rows_dropped": rows_dropped,
            "duration_sec": duration,
        }

    except Exception as e:
        session.rollback()
        return {
            "file": filename,
            "status": "FAILED",
            "dataset": target_table,
            "message": str(e),
            "rows_in": rows_in,
            "rows_loaded": rows_loaded,
            "rows_dropped": rows_in - rows_loaded,
        }