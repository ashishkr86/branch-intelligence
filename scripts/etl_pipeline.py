"""
ETL Pipeline — CSV to MySQL loader.

Features:
  - Auto-detects dataset type (branch, employee, otp, etl)
  - Extracts mobile numbers from OTP COMMENTS column
  - Filters only valid OTP purposes (5 allowed)
  - Prevents duplicates via INSERT IGNORE
  - Handles headerless CSVs
  - Logs every run to etl_runs

Usage:
  python scripts/etl_pipeline.py                    # bulk mode
  python scripts/etl_pipeline.py --file X.csv       # single file
  python scripts/etl_pipeline.py --file X.csv --table otp_report
"""

import sys
import re
import time
import argparse
from datetime import datetime, date
from pathlib import Path

import pandas as pd
from sqlalchemy import text

# ─── Path setup ───
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))

from db import engine, SessionLocal  # noqa: E402

LANDING_DIR = ROOT / "data" / "landing"


# ═══════════════════════════════════════════════════════════════════
# VALID OTP PURPOSES — only these will be inserted
# ═══════════════════════════════════════════════════════════════════

VALID_PURPOSES = {
    "customer purpose",
    "final vault closing",
    "other purpose",
    "audit purpose",
    "packet counting",
}


def is_valid_purpose(purpose):
    """Check if purpose is in the allowed list (case-insensitive)."""
    if purpose is None:
        return False
    try:
        if pd.isna(purpose):
            return False
    except (TypeError, ValueError):
        pass
    normalized = str(purpose).strip().lower()
    return normalized in VALID_PURPOSES


# ═══════════════════════════════════════════════════════════════════
# MOBILE EXTRACTION — ROBUST VERSION
# ═══════════════════════════════════════════════════════════════════

# Pattern:
#   - Word boundary BEFORE (prevents mid-number match)
#   - Optional +91 / 91 / 0 prefix
#   - Exactly 10 digits starting 6-9
#   - Word boundary AFTER (prevents grabbing extra digits)
MOBILE_PATTERN = re.compile(
    r"""
    (?<![0-9])                 # no digit before
    (?:\+?91[\s\-]?)?          # optional +91 or 91
    (?:0[\s\-]?)?              # optional leading 0
    ([6-9][0-9]{9})            # exactly 10 digits
    (?![0-9])                  # no digit after
    """,
    re.VERBOSE
)


def extract_mobile_from_comment(comment):
    """
    Extract the FIRST valid Indian mobile from a comment.
    Returns exactly 10 digits or None.
    """
    if comment is None:
        return None
    try:
        if pd.isna(comment):
            return None
    except (TypeError, ValueError):
        pass

    s = str(comment)
    matches = MOBILE_PATTERN.findall(s)

    if not matches:
        return None

    # Validate: take first that is exactly 10 digits starting 6-9
    for m in matches:
        if len(m) == 10 and m[0] in "6789":
            return m

    return None


# ═══════════════════════════════════════════════════════════════════
# LOGGING
# ═══════════════════════════════════════════════════════════════════

def log(msg, level="INFO"):
    ts = datetime.now().strftime("%H:%M:%S")
    icons = {"INFO": "i", "OK": "+", "WARN": "!", "ERR": "x"}
    print(f"[{ts}] {icons.get(level, '.')} {msg}")


# ═══════════════════════════════════════════════════════════════════
# CLEANING HELPERS
# ═══════════════════════════════════════════════════════════════════

def to_none(v):
    if v is None:
        return None
    try:
        if pd.isna(v):
            return None
    except (TypeError, ValueError):
        pass
    return v


def clean_str(v, max_len=None):
    if v is None:
        return None
    try:
        if pd.isna(v):
            return None
    except (TypeError, ValueError):
        pass
    s = str(v).strip()
    if max_len:
        s = s[:max_len]
    return s if s else None


def clean_bm(v):
    if v is None:
        return None
    try:
        if pd.isna(v):
            return None
    except (TypeError, ValueError):
        pass
    return str(v).strip().upper()


def parse_date(v):
    if v is None:
        return None
    try:
        if pd.isna(v):
            return None
    except (TypeError, ValueError):
        pass
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
    if v is None:
        return None
    try:
        if pd.isna(v):
            return None
    except (TypeError, ValueError):
        pass
    if isinstance(v, datetime):
        return v.time()
    s = str(v).strip()
    for fmt in ("%H:%M:%S", "%H:%M", "%I:%M:%S %p", "%I:%M %p"):
        try:
            return datetime.strptime(s, fmt).time()
        except ValueError:
            continue
    return None


def safe_int(v, default=0):
    if v is None:
        return default
    try:
        if pd.isna(v):
            return default
        return int(float(v))
    except (TypeError, ValueError):
        return default


def safe_float(v, default=0.0):
    if v is None:
        return default
    try:
        if pd.isna(v):
            return default
        return float(v)
    except (TypeError, ValueError):
        return default


# ═══════════════════════════════════════════════════════════════════
# DATASET DETECTION
# ═══════════════════════════════════════════════════════════════════

def looks_like_data_row(values):
    for v in values:
        s = str(v).strip()
        if not s:
            continue
        if len(s) == 10 and s[4] == "-" and s[7] == "-":
            return True
        if ":" in s and len(s) <= 8:
            return True
        if s.upper().startswith("BM") and len(s) > 4:
            return True
        if s.isdigit() and len(s) >= 8:
            return True
        if len(s) > 40:
            return True
    return False


def detect_dataset(filename, columns):
    if columns:
        cols = {str(c).upper().strip() for c in columns}
        if {"PURPOSE", "OTP_DATE", "OTP_TIME"}.issubset(cols):
            return "otp_report"
        if {"PURPOSE", "DATE", "TIME"}.issubset(cols):
            return "otp_report"
        if {"FILE_NAME", "ROWS_IN", "ROWS_LOADED"}.issubset(cols):
            return "etl_runs"
        if {"EMPLOYEE_NAME", "EMPLOYEE_NUMBER"}.issubset(cols):
            return "branch_employee"
        if {"BRANCH_NAME", "REGION"}.issubset(cols):
            return "branch"

    if filename:
        lower = filename.lower()
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


# ═══════════════════════════════════════════════════════════════════
# LOADERS
# ═══════════════════════════════════════════════════════════════════

def load_branch(session, df, filename):
    df = df.copy()
    df.columns = [str(c).strip().upper() for c in df.columns]
    df["BM_CODE"] = df["BM_CODE"].apply(clean_bm)
    df = df.dropna(subset=["BM_CODE"]).drop_duplicates(subset=["BM_CODE"], keep="first")

    rows_loaded = 0
    for _, row in df.iterrows():
        session.execute(
            text("""
                INSERT INTO branch (BM_CODE, BRANCH_NAME, REGION)
                VALUES (:bm, :name, :region)
                ON DUPLICATE KEY UPDATE
                  BRANCH_NAME = VALUES(BRANCH_NAME),
                  REGION = VALUES(REGION)
            """),
            {
                "bm": row["BM_CODE"],
                "name": clean_str(row.get("BRANCH_NAME"), 150) or "Unknown",
                "region": clean_str(row.get("REGION"), 50) or "Unknown",
            },
        )
        rows_loaded += 1
    session.commit()
    return rows_loaded


def load_branch_employee(session, df, filename):
    df = df.copy()
    df.columns = [str(c).strip().upper() for c in df.columns]
    df["BM_CODE"] = df["BM_CODE"].apply(clean_bm)
    df["EMPLOYEE_NAME"] = df["EMPLOYEE_NAME"].apply(lambda v: clean_str(v, 150))
    df["EMPLOYEE_NUMBER"] = df["EMPLOYEE_NUMBER"].apply(lambda v: clean_str(v, 20))
    df = df.dropna(subset=["BM_CODE", "EMPLOYEE_NAME", "EMPLOYEE_NUMBER"])

    existing = {r[0] for r in session.execute(text("SELECT BM_CODE FROM branch")).fetchall()}
    df = df[df["BM_CODE"].isin(existing)]

    rows_loaded = 0
    for _, row in df.iterrows():
        session.execute(
            text("""
                INSERT IGNORE INTO branch_employee
                  (BM_CODE, EMPLOYEE_NAME, EMPLOYEE_NUMBER)
                VALUES (:bm, :name, :num)
            """),
            {
                "bm": row["BM_CODE"],
                "name": row["EMPLOYEE_NAME"],
                "num": row["EMPLOYEE_NUMBER"],
            },
        )
        rows_loaded += 1
    session.commit()
    return rows_loaded


def load_otp_report(session, df, filename):
    """
    Load otp_report with:
      - Mobile extraction from COMMENTS
      - Only 5 valid purposes
      - COMMENTS column dropped (never stored)
    """
    df = df.copy()
    df.columns = [str(c).strip().upper() for c in df.columns]

    # Normalize DATE/TIME if the CSV uses those names
    if "DATE" in df.columns and "OTP_DATE" not in df.columns:
        df = df.rename(columns={"DATE": "OTP_DATE"})
    if "TIME" in df.columns and "OTP_TIME" not in df.columns:
        df = df.rename(columns={"TIME": "OTP_TIME"})

    # Verify required columns
    for col in ["BM_CODE", "PURPOSE", "OTP_DATE", "OTP_TIME"]:
        if col not in df.columns:
            raise ValueError(f"Missing required column: {col}")

    # ─── Clean fields ───
    df["BM_CODE"] = df["BM_CODE"].apply(clean_bm)
    df["PURPOSE"] = df["PURPOSE"].apply(lambda v: clean_str(v, 100))

    # ═══════════════════════════════════════════════════════════════
    # FILTER: only VALID_PURPOSES
    # ═══════════════════════════════════════════════════════════════
    before_filter = len(df)
    df = df[df["PURPOSE"].apply(is_valid_purpose)]
    filtered_out = before_filter - len(df)
    if filtered_out > 0:
        log(f"  Filtered out {filtered_out} rows with invalid purpose", "WARN")

    if "OPERATOR" in df.columns:
        df["OPERATOR"] = df["OPERATOR"].apply(lambda v: clean_str(v, 150))
    else:
        df["OPERATOR"] = None

    if "MOBILE_NUMBER" in df.columns:
        df["MOBILE_NUMBER"] = df["MOBILE_NUMBER"].apply(lambda v: clean_str(v, 20))
    else:
        df["MOBILE_NUMBER"] = None

    # ═══════════════════════════════════════════════════════════════
    # EXTRACT MOBILE FROM COMMENTS → MOBILE_NUMBER
    # ═══════════════════════════════════════════════════════════════
    if "COMMENTS" in df.columns:
        mask_empty = df["MOBILE_NUMBER"].isna() | (df["MOBILE_NUMBER"] == "")
        df.loc[mask_empty, "MOBILE_NUMBER"] = df.loc[mask_empty, "COMMENTS"].apply(
            extract_mobile_from_comment
        )
        # Drop COMMENTS — never stored in MySQL
        df = df.drop(columns=["COMMENTS"])

    # ─── Parse dates/times ───
    df["OTP_DATE"] = df["OTP_DATE"].apply(parse_date)
    df["OTP_TIME"] = df["OTP_TIME"].apply(parse_time)

    # Drop rows missing critical fields
    df = df.dropna(subset=["BM_CODE", "PURPOSE", "OTP_DATE", "OTP_TIME"])

    # Filter orphans
    existing = {r[0] for r in session.execute(text("SELECT BM_CODE FROM branch")).fetchall()}
    df = df[df["BM_CODE"].isin(existing)]

    rows_loaded = 0
    for _, row in df.iterrows():
        session.execute(
            text("""
                INSERT IGNORE INTO otp_report
                  (BM_CODE, PURPOSE, OPERATOR, OTP_DATE, OTP_TIME, MOBILE_NUMBER)
                VALUES (:bm, :p, :op, :od, :ot, :mn)
            """),
            {
                "bm": row["BM_CODE"],
                "p": row["PURPOSE"],
                "op": to_none(row.get("OPERATOR")),
                "od": row["OTP_DATE"],
                "ot": row["OTP_TIME"],
                "mn": to_none(row.get("MOBILE_NUMBER")),
            },
        )
        rows_loaded += 1
    session.commit()
    return rows_loaded


def load_etl_runs(session, df, filename):
    df = df.copy()
    df.columns = [str(c).strip().upper() for c in df.columns]

    rows_loaded = 0
    for _, row in df.iterrows():
        session.execute(
            text("""
                INSERT INTO etl_runs
                  (RUN_DATE, FILE_NAME, STARTED_AT, FINISHED_AT,
                   DURATION_SEC, ROWS_IN, ROWS_LOADED, ROWS_DROPPED,
                   DROP_PCT, STATUS, ERROR_MSG)
                VALUES
                  (:rd, :fn, :st, :fi, :du, :ri, :rl, :dr, :dp, :stt, :em)
            """),
            {
                "rd": parse_date(row.get("RUN_DATE")),
                "fn": clean_str(row.get("FILE_NAME"), 255) or "unknown",
                "st": to_none(row.get("STARTED_AT")),
                "fi": to_none(row.get("FINISHED_AT")),
                "du": safe_int(row.get("DURATION_SEC")),
                "ri": safe_int(row.get("ROWS_IN")),
                "rl": safe_int(row.get("ROWS_LOADED")),
                "dr": safe_int(row.get("ROWS_DROPPED")),
                "dp": safe_float(row.get("DROP_PCT")),
                "stt": clean_str(row.get("STATUS"), 20) or "SUCCESS",
                "em": clean_str(row.get("ERROR_MSG")),
            },
        )
        rows_loaded += 1
    session.commit()
    return rows_loaded


LOADERS = {
    "branch": load_branch,
    "branch_employee": load_branch_employee,
    "otp_report": load_otp_report,
    "etl_runs": load_etl_runs,
}


# ═══════════════════════════════════════════════════════════════════
# MAIN ETL FUNCTION — used by upload endpoints
# ═══════════════════════════════════════════════════════════════════

def process_uploaded_file(file_path, target_table=None):
    file_path = Path(file_path)
    filename = file_path.name
    started = datetime.now()

    # ─── Read CSV ───
    try:
        df_with_header = pd.read_csv(file_path)
        first_row_values = df_with_header.columns.tolist()

        if looks_like_data_row(first_row_values):
            df = pd.read_csv(file_path, header=None)
            n_cols = len(df.columns)
            LAYOUTS = {
                6: ["BM_CODE", "PURPOSE", "OPERATOR", "OTP_DATE", "OTP_TIME", "MOBILE_NUMBER"],
                7: ["ID", "BM_CODE", "PURPOSE", "OPERATOR", "OTP_DATE", "OTP_TIME", "MOBILE_NUMBER"],
                8: ["ID", "BM_CODE", "PURPOSE", "OPERATOR", "OTP_DATE", "OTP_TIME", "MOBILE_NUMBER", "COMMENTS"],
                4: ["BM_CODE", "BRANCH_NAME", "REGION", "CREATED_AT"],
                5: ["BM_CODE", "EMPLOYEE_NAME", "EMPLOYEE_NUMBER", "REGION", "CREATED_AT"],
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
            "rows_in": 0, "rows_loaded": 0, "rows_dropped": 0, "duration_sec": 0,
        }

    # ─── Detect dataset ───
    dataset = target_table or detect_dataset(filename, df.columns.tolist())

    if not dataset or dataset not in LOADERS:
        return {
            "file": filename,
            "status": "SKIPPED",
            "message": f"Unknown dataset. Columns: {', '.join(str(c) for c in df.columns.tolist())}",
            "rows_in": rows_in, "rows_loaded": 0, "rows_dropped": rows_in, "duration_sec": 0,
        }

    # ─── Execute loader ───
    session = SessionLocal()
    try:
        loader = LOADERS[dataset]
        rows_loaded = loader(session, df, filename)
    except Exception as e:
        session.rollback()
        session.close()
        return {
            "file": filename,
            "status": "FAILED",
            "dataset": dataset,
            "message": str(e),
            "rows_in": rows_in, "rows_loaded": 0, "rows_dropped": rows_in,
            "duration_sec": int((datetime.now() - started).total_seconds()),
        }

    # ─── Log to etl_runs ───
    finished = datetime.now()
    duration = int((finished - started).total_seconds())
    rows_dropped = rows_in - rows_loaded

    if dataset != "etl_runs":
        try:
            session.execute(
                text("""
                    INSERT INTO etl_runs
                      (RUN_DATE, FILE_NAME, STARTED_AT, FINISHED_AT, DURATION_SEC,
                       ROWS_IN, ROWS_LOADED, ROWS_DROPPED, DROP_PCT, STATUS)
                    VALUES
                      (:rd, :fn, :st, :fi, :du, :ri, :rl, :dr, :dp, :stt)
                """),
                {
                    "rd": started.date(),
                    "fn": filename,
                    "st": started,
                    "fi": finished,
                    "du": duration,
                    "ri": rows_in,
                    "rl": rows_loaded,
                    "dr": rows_dropped,
                    "dp": round((rows_dropped / rows_in * 100) if rows_in else 0, 2),
                    "stt": "SUCCESS",
                },
            )
            session.commit()
        except Exception as e:
            session.rollback()
            log(f"Could not record ETL run: {e}", "WARN")

    session.close()

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


# ═══════════════════════════════════════════════════════════════════
# CUSTOM MAPPING SUPPORT
# ═══════════════════════════════════════════════════════════════════

def run_etl_with_mapping(session, file_path, target_table: str, mapping: list):
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
                    INSERT IGNORE INTO branch_employee (BM_CODE, EMPLOYEE_NAME, EMPLOYEE_NUMBER)
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

            # Filter valid purposes
            df = df[df["PURPOSE"].apply(is_valid_purpose)]

            if "OPERATOR" in df.columns:
                df["OPERATOR"] = df["OPERATOR"].apply(lambda v: clean_str(v, 150))
            else:
                df["OPERATOR"] = None
            if "MOBILE_NUMBER" in df.columns:
                df["MOBILE_NUMBER"] = df["MOBILE_NUMBER"].apply(lambda v: clean_str(v, 20))
            else:
                df["MOBILE_NUMBER"] = None
            df["OTP_DATE"] = df["OTP_DATE"].apply(parse_date)
            df["OTP_TIME"] = df["OTP_TIME"].apply(parse_time)

            # Extract mobile from COMMENTS
            if "COMMENTS" in df.columns:
                mask_empty = df["MOBILE_NUMBER"].isna() | (df["MOBILE_NUMBER"] == "")
                df.loc[mask_empty, "MOBILE_NUMBER"] = df.loc[mask_empty, "COMMENTS"].apply(
                    extract_mobile_from_comment
                )
                df = df.drop(columns=["COMMENTS"])

            df = df.dropna(subset=["BM_CODE", "PURPOSE", "OTP_DATE", "OTP_TIME"])
            existing = {r[0] for r in session.execute(text("SELECT BM_CODE FROM branch")).fetchall()}
            df = df[df["BM_CODE"].isin(existing)]
            for _, row in df.iterrows():
                session.execute(text("""
                    INSERT IGNORE INTO otp_report
                      (BM_CODE, PURPOSE, OPERATOR, OTP_DATE, OTP_TIME, MOBILE_NUMBER)
                    VALUES (:bm, :p, :op, :od, :ot, :mn)
                """), {
                    "bm": row["BM_CODE"], "p": row["PURPOSE"],
                    "op": to_none(row.get("OPERATOR")),
                    "od": row["OTP_DATE"], "ot": row["OTP_TIME"],
                    "mn": to_none(row.get("MOBILE_NUMBER")),
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
                    "st": to_none(row.get("STARTED_AT")),
                    "fi": to_none(row.get("FINISHED_AT")),
                    "du": safe_int(row.get("DURATION_SEC")),
                    "ri": safe_int(row.get("ROWS_IN")),
                    "rl": safe_int(row.get("ROWS_LOADED")),
                    "dr": safe_int(row.get("ROWS_DROPPED")),
                    "dp": safe_float(row.get("DROP_PCT")),
                    "stt": clean_str(row.get("STATUS"), 20) or "SUCCESS",
                    "em": clean_str(row.get("ERROR_MSG")),
                })
                rows_loaded += 1

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


# ═══════════════════════════════════════════════════════════════════
# BULK MODE
# ═══════════════════════════════════════════════════════════════════

def run_bulk_mode():
    print()
    print("=" * 60)
    print("  BRANCH INTELLIGENCE - ETL PIPELINE (BULK MODE)")
    print("=" * 60)
    print()

    if not LANDING_DIR.exists():
        log(f"Landing directory not found: {LANDING_DIR}", "ERR")
        return

    csvs = sorted(LANDING_DIR.glob("*.csv"))
    if not csvs:
        log("No CSV files found in data/landing/", "WARN")
        return

    log(f"Found {len(csvs)} CSV file(s)")
    start = time.time()

    priority = ["BRANCH.csv", "BRANCH_EMPLOYEE.csv", "OTP_REPORT.csv", "ETL.csv"]
    ordered = []
    for name in priority:
        for f in csvs:
            if f.name == name:
                ordered.append(f)
    for f in csvs:
        if f not in ordered:
            ordered.append(f)

    for f in ordered:
        log(f"Loading {f.name}...")
        result = process_uploaded_file(f)
        if result["status"] == "SUCCESS":
            log(f"  -> {result['rows_loaded']} rows loaded ({result['rows_dropped']} dropped)", "OK")
        else:
            log(f"  -> {result['status']}: {result['message']}", "ERR" if result["status"] == "FAILED" else "WARN")

    elapsed = round(time.time() - start, 2)
    print()
    print("=" * 60)
    log(f"ETL pipeline complete in {elapsed}s", "OK")
    print("=" * 60)
    print()

    # Summary
    print("Row counts per table:")
    try:
        with engine.connect() as conn:
            for t in ["branch", "branch_employee", "otp_report", "etl_runs"]:
                try:
                    n = conn.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar()
                    print(f"  - {t:<20} {n:>8,} rows")
                except Exception as e:
                    print(f"  - {t:<20} (error: {e})")

            # Purpose breakdown
            try:
                print()
                print("OTP Purpose breakdown:")
                rows = conn.execute(text("""
                    SELECT PURPOSE, COUNT(*) AS cnt
                    FROM otp_report
                    GROUP BY PURPOSE
                    ORDER BY cnt DESC
                """)).fetchall()
                for r in rows:
                    print(f"  - {r[0]:<25} {r[1]:>8,} rows")
            except Exception:
                pass

            # Mobile coverage
            try:
                cov = conn.execute(text("""
                    SELECT
                        COUNT(*) AS total,
                        SUM(CASE WHEN MOBILE_NUMBER IS NOT NULL AND MOBILE_NUMBER != '' THEN 1 ELSE 0 END) AS with_mobile
                    FROM otp_report
                """)).fetchone()
                total, with_mobile = cov[0] or 0, cov[1] or 0
                pct = round((with_mobile / total * 100) if total else 0, 1)
                print()
                print(f"  OTP mobile coverage:  {with_mobile:,} / {total:,} ({pct}%)")
            except Exception:
                pass
    except Exception as e:
        print(f"  Could not connect to DB: {e}")
    print()


# ═══════════════════════════════════════════════════════════════════
# CLI ENTRY POINT
# ═══════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="Branch Intelligence ETL Pipeline")
    parser.add_argument("--file", help="Load a specific CSV file")
    parser.add_argument("--table", help="Target table")
    args = parser.parse_args()

    if args.file:
        file_path = Path(args.file)
        if not file_path.is_absolute():
            file_path = LANDING_DIR / args.file
        if not file_path.exists():
            log(f"File not found: {file_path}", "ERR")
            return
        log(f"Loading {file_path.name}...")
        result = process_uploaded_file(file_path, target_table=args.table)
        log(f"Result: {result['status']} - {result['message']}", "OK" if result["status"] == "SUCCESS" else "ERR")
    else:
        run_bulk_mode()


if __name__ == "__main__":
    main()