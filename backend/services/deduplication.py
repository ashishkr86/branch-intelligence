"""
Duplicate detection for ETL — hash-based comparison.
Each table has a "business key" that defines uniqueness.
"""

import hashlib
from typing import Any


# ═══════════════════════════════════════════════════════════════
# BUSINESS KEYS — defines what makes a row unique per table
# ═══════════════════════════════════════════════════════════════

BUSINESS_KEYS = {
    "branch": ["BM_CODE"],
    "branch_employee": ["BM_CODE", "EMPLOYEE_NUMBER"],
    "otp_report": ["BM_CODE", "PURPOSE", "OPERATOR", "OTP_DATE", "OTP_TIME", "MOBILE_NUMBER"],
    "etl_runs": ["RUN_DATE", "FILE_NAME"],
}


# ═══════════════════════════════════════════════════════════════
# ROW HASHING
# ═══════════════════════════════════════════════════════════════

def normalize(value: Any) -> str:
    """Normalize a value for hashing: None → '', strip whitespace."""
    if value is None:
        return ""
    return str(value).strip().lower()


def row_hash(row: dict, table: str) -> str:
    """
    Compute a deterministic hash for a row given the table's business key.
    Returns a 16-char hex string.
    """
    key_cols = BUSINESS_KEYS.get(table)
    if not key_cols:
        # Fallback: hash the entire row (sorted keys)
        key_cols = sorted(row.keys())

    parts = [normalize(row.get(col)) for col in key_cols]
    raw = "|".join(parts)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


# ═══════════════════════════════════════════════════════════════
# DEDUP ENGINE
# ═══════════════════════════════════════════════════════════════

class Deduplicator:
    """
    Tracks seen hashes within a single ETL run and skips duplicates.

    Usage:
        dedup = Deduplicator("branch", existing_hashes)
        for row in rows:
            if dedup.is_duplicate(row):
                continue
            insert(row)
    """

    def __init__(self, table: str, existing_hashes: set | None = None):
        self.table = table
        self.seen: set = set(existing_hashes or [])
        self.total = 0
        self.duplicates = 0
        self.unique = 0

    def is_duplicate(self, row: dict) -> bool:
        """Check if a row is a duplicate. Adds to seen set if new."""
        self.total += 1
        h = row_hash(row, self.table)

        if h in self.seen:
            self.duplicates += 1
            return True

        self.seen.add(h)
        self.unique += 1
        return False

    def stats(self) -> dict:
        return {
            "total": self.total,
            "unique": self.unique,
            "duplicates": self.duplicates,
            "duplicate_pct": (
                round(self.duplicates / self.total * 100, 2) if self.total else 0
            ),
        }


# ═══════════════════════════════════════════════════════════════
# LOAD EXISTING HASHES FROM DB
# ═══════════════════════════════════════════════════════════════

def load_existing_hashes(session, table: str) -> set:
    """
    Load all existing rows from a table and return their hashes.
    Used to seed the Deduplicator.
    """
    from sqlalchemy import text

    key_cols = BUSINESS_KEYS.get(table)
    if not key_cols:
        return set()

    # Build SELECT of the key columns
    cols_sql = ", ".join(key_cols)

    try:
        rows = session.execute(text(f"SELECT {cols_sql} FROM {table}")).fetchall()
    except Exception:
        return set()

    hashes = set()
    for r in rows:
        row_dict = {key_cols[i]: r[i] for i in range(len(key_cols))}
        hashes.add(row_hash(row_dict, table))

    return hashes


# ═══════════════════════════════════════════════════════════════
# FIND DUPLICATES IN EXISTING DATA (for cleanup)
# ═══════════════════════════════════════════════════════════════

def find_duplicates_in_db(session, table: str) -> dict:
    """
    Find duplicate rows already in the DB.
    Returns { total, unique, duplicates, sample } .
    """
    from sqlalchemy import text

    key_cols = BUSINESS_KEYS.get(table)
    if not key_cols:
        return {"total": 0, "unique": 0, "duplicates": 0, "sample": []}

    # Count total vs distinct
    key_sql = ", ".join(key_cols)
    sql = f"""
        SELECT
            COUNT(*) AS total,
            COUNT(DISTINCT CONCAT_WS('|', {key_sql})) AS unique_rows
        FROM {table}
    """
    result = session.execute(text(sql)).fetchone()
    total = result[0] or 0
    unique_rows = result[1] or 0

    # Sample duplicates
    sample_sql = f"""
        SELECT {key_sql}, COUNT(*) AS cnt
        FROM {table}
        GROUP BY {key_sql}
        HAVING cnt > 1
        ORDER BY cnt DESC
        LIMIT 20
    """
    sample = []
    try:
        rows = session.execute(text(sample_sql)).fetchall()
        for r in rows:
            row_dict = {key_cols[i]: r[i] for i in range(len(key_cols))}
            row_dict["_count"] = r[len(key_cols)]
            sample.append(row_dict)
    except Exception:
        pass

    return {
        "total": total,
        "unique": unique_rows,
        "duplicates": total - unique_rows,
        "duplicate_pct": round((total - unique_rows) / total * 100, 2) if total else 0,
        "sample": sample,
    }