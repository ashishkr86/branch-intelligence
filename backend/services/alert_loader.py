"""
Alert loader — processes panic_alerts and smoke_alerts CSVs.
Prevents duplicates via INSERT IGNORE + unique keys.
"""

import re
from datetime import datetime, date

import pandas as pd
from sqlalchemy import text


# ═══════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════

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


def to_none(v):
    if v is None:
        return None
    try:
        if pd.isna(v):
            return None
    except (TypeError, ValueError):
        pass
    return v


def extract_mobile_from_comment(comment):
    """Extract first valid 10-digit Indian mobile from a comment."""
    if comment is None:
        return None
    try:
        if pd.isna(comment):
            return None
    except (TypeError, ValueError):
        pass
    pattern = re.compile(r"(?<![0-9])(?:\+?91[\s\-]?)?(?:0[\s\-]?)?([6-9][0-9]{9})(?![0-9])")
    matches = pattern.findall(str(comment))
    for m in matches:
        if len(m) == 10 and m[0] in "6789":
            return m
    return None


# ═══════════════════════════════════════════════════════════════
# PANIC ALERTS LOADER
# ═══════════════════════════════════════════════════════════════

def load_panic_alerts(session, file_path):
    """Load panic_alerts CSV into MySQL."""
    try:
        df = pd.read_csv(file_path)
        rows_in = len(df)
    except Exception as e:
        return {"status": "FAILED", "message": f"CSV parse error: {e}", "rows_loaded": 0, "rows_in": 0}

    df.columns = [str(c).strip().upper() for c in df.columns]

    if "BM_CODE" not in df.columns:
        return {"status": "FAILED", "message": "Missing BM_CODE column", "rows_loaded": 0, "rows_in": rows_in}

    df["BM_CODE"] = df["BM_CODE"].apply(clean_bm)

    # Fill optional columns
    for col in ["BRANCH_NAME", "REGION", "ALERT_TYPE", "EMPLOYEE_NAME",
                "EMPLOYEE_NUMBER", "MOBILE_NUMBER", "DESCRIPTION", "COMMENTS"]:
        if col not in df.columns:
            df[col] = None

    # Parse date/time
    if "ALERT_DATE" in df.columns:
        df["ALERT_DATE"] = df["ALERT_DATE"].apply(parse_date)
    if "ALERT_TIME" in df.columns:
        df["ALERT_TIME"] = df["ALERT_TIME"].apply(parse_time)

    # Extract mobile from comments if empty
    if "COMMENTS" in df.columns:
        mask = df["MOBILE_NUMBER"].isna() | (df["MOBILE_NUMBER"] == "")
        df.loc[mask, "MOBILE_NUMBER"] = df.loc[mask, "COMMENTS"].apply(extract_mobile_from_comment)
        df = df.drop(columns=["COMMENTS"])

    # Filter: branch must exist
    existing = {r[0] for r in session.execute(text("SELECT BM_CODE FROM branch")).fetchall()}
    df = df[df["BM_CODE"].isin(existing)]

    # Drop rows missing critical fields
    df = df.dropna(subset=["BM_CODE", "ALERT_DATE", "ALERT_TIME"])

    rows_loaded = 0
    for _, row in df.iterrows():
        try:
            session.execute(text("""
                INSERT IGNORE INTO panic_alerts
                  (BM_CODE, BRANCH_NAME, REGION, ALERT_TYPE, ALERT_DATE, ALERT_TIME,
                   EMPLOYEE_NAME, EMPLOYEE_NUMBER, MOBILE_NUMBER, DESCRIPTION, STATUS)
                VALUES
                  (:bm, :bn, :rg, :at, :ad, :atm, :en, :enum, :mn, :desc, 'OPEN')
            """), {
                "bm": row["BM_CODE"],
                "bn": clean_str(row.get("BRANCH_NAME"), 150),
                "rg": clean_str(row.get("REGION"), 50),
                "at": clean_str(row.get("ALERT_TYPE"), 50) or "PANIC",
                "ad": row["ALERT_DATE"],
                "atm": row["ALERT_TIME"],
                "en": clean_str(row.get("EMPLOYEE_NAME"), 150),
                "enum": clean_str(row.get("EMPLOYEE_NUMBER"), 20),
                "mn": to_none(row.get("MOBILE_NUMBER")),
                "desc": clean_str(row.get("DESCRIPTION")),
            })
            rows_loaded += 1
        except Exception:
            continue

    session.commit()

    return {
        "status": "SUCCESS",
        "rows_in": rows_in,
        "rows_loaded": rows_loaded,
        "rows_dropped": rows_in - rows_loaded,
    }


# ═══════════════════════════════════════════════════════════════
# SMOKE ALERTS LOADER
# ═══════════════════════════════════════════════════════════════

def load_smoke_alerts(session, file_path):
    """Load smoke_alerts CSV into MySQL."""
    try:
        df = pd.read_csv(file_path)
        rows_in = len(df)
    except Exception as e:
        return {"status": "FAILED", "message": f"CSV parse error: {e}", "rows_loaded": 0, "rows_in": 0}

    df.columns = [str(c).strip().upper() for c in df.columns]

    if "BM_CODE" not in df.columns:
        return {"status": "FAILED", "message": "Missing BM_CODE column", "rows_loaded": 0, "rows_in": rows_in}

    df["BM_CODE"] = df["BM_CODE"].apply(clean_bm)

    for col in ["BRANCH_NAME", "REGION", "SENSOR_TYPE", "SENSOR_ID",
                "SEVERITY", "DESCRIPTION", "COMMENTS"]:
        if col not in df.columns:
            df[col] = None

    if "ALERT_DATE" in df.columns:
        df["ALERT_DATE"] = df["ALERT_DATE"].apply(parse_date)
    if "ALERT_TIME" in df.columns:
        df["ALERT_TIME"] = df["ALERT_TIME"].apply(parse_time)

    if "COMMENTS" in df.columns:
        df = df.drop(columns=["COMMENTS"])

    existing = {r[0] for r in session.execute(text("SELECT BM_CODE FROM branch")).fetchall()}
    df = df[df["BM_CODE"].isin(existing)]

    df = df.dropna(subset=["BM_CODE", "ALERT_DATE", "ALERT_TIME"])

    rows_loaded = 0
    for _, row in df.iterrows():
        try:
            session.execute(text("""
                INSERT IGNORE INTO smoke_alerts
                  (BM_CODE, BRANCH_NAME, REGION, SENSOR_TYPE, SENSOR_ID,
                   ALERT_DATE, ALERT_TIME, SEVERITY, DESCRIPTION, STATUS)
                VALUES
                  (:bm, :bn, :rg, :st, :sid, :ad, :atm, :sv, :desc, 'OPEN')
            """), {
                "bm": row["BM_CODE"],
                "bn": clean_str(row.get("BRANCH_NAME"), 150),
                "rg": clean_str(row.get("REGION"), 50),
                "st": clean_str(row.get("SENSOR_TYPE"), 50) or "SMOKE",
                "sid": clean_str(row.get("SENSOR_ID"), 50),
                "ad": row["ALERT_DATE"],
                "atm": row["ALERT_TIME"],
                "sv": clean_str(row.get("SEVERITY"), 20) or "MEDIUM",
                "desc": clean_str(row.get("DESCRIPTION")),
            })
            rows_loaded += 1
        except Exception:
            continue

    session.commit()

    return {
        "status": "SUCCESS",
        "rows_in": rows_in,
        "rows_loaded": rows_loaded,
        "rows_dropped": rows_in - rows_loaded,
    }