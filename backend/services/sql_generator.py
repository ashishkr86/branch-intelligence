"""
SQL generation and validation.
Builds schema context, calls LLM, validates the SQL is safe.
"""

import re
from typing import Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from services.llm_service import generate_sql


# ═══════════════════════════════════════════════════════════════
# SCHEMA CONTEXT — injected into the prompt
# ═══════════════════════════════════════════════════════════════

SCHEMA = """
Tables in MySQL database `gentech_db`:

1. branch
   - BM_CODE VARCHAR(50) PRIMARY KEY
   - BRANCH_NAME VARCHAR(150)
   - REGION VARCHAR(50)
   - CREATED_AT DATETIME

2. branch_employee
   - ID INT PRIMARY KEY
   - BM_CODE VARCHAR(50) FK → branch.BM_CODE
   - EMPLOYEE_NAME VARCHAR(150)
   - EMPLOYEE_NUMBER VARCHAR(20)
   - CREATED_AT DATETIME

3. otp_report
   - ID INT PRIMARY KEY
   - BM_CODE VARCHAR(50) FK → branch.BM_CODE
   - PURPOSE VARCHAR(100)
   - OPERATOR VARCHAR(150)
   - OTP_DATE DATE
   - OTP_TIME TIME
   - MOBILE_NUMBER VARCHAR(20)
   - CREATED_AT DATETIME

4. etl_runs
   - ID INT PRIMARY KEY
   - RUN_DATE DATE
   - FILE_NAME VARCHAR(255)
   - STARTED_AT DATETIME
   - FINISHED_AT DATETIME
   - DURATION_SEC INT
   - ROWS_IN INT
   - ROWS_LOADED INT
   - ROWS_DROPPED INT
   - DROP_PCT DECIMAL
   - STATUS VARCHAR(20)
   - ERROR_MSG TEXT

Views (read-only, pre-aggregated):
   - v_branch_summary, v_daily_otp, v_otp_by_purpose,
     v_operator_performance, v_regional_rollup, v_etl_health, v_hourly_otp

Example purposes: 'Customer Purpose', 'Final Vault Closing',
'Audit Purpose', 'Packet Counting', 'Other Purpose'
Example regions: 'NORTH 1', 'SOUTH 1', 'EAST', 'WEST 1', 'CENTRAL'
"""

SYSTEM_PROMPT = f"""You are a MySQL expert. Convert the user's question into a single safe SELECT query.

{SCHEMA}

RULES:
- Output ONLY the SQL query, nothing else. No explanation, no markdown fences.
- Only SELECT statements are allowed. Never use INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE, GRANT, REVOKE.
- Always add LIMIT 500 unless the query already returns a single row (like COUNT).
- Use proper JOINs when combining tables.
- Use MySQL functions: DATE_SUB, CURDATE(), COUNT, SUM, ROUND, GROUP BY, HAVING.
- If the question is ambiguous or unsafe, return: SELECT 'Cannot answer safely' AS error
"""


# ═══════════════════════════════════════════════════════════════
# SQL VALIDATION
# ═══════════════════════════════════════════════════════════════

BLOCKED_KEYWORDS = [
    "DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "TRUNCATE",
    "CREATE", "GRANT", "REVOKE", "EXEC", "EXECUTE", "SHUTDOWN",
    "LOAD_FILE", "OUTFILE", "DUMPFILE", "INTO OUTFILE",
    "INTO DUMPFILE", "SET ", "COMMIT", "ROLLBACK", "BEGIN",
]

ALLOWED_TABLES = [
    "branch", "branch_employee", "otp_report", "etl_runs",
    "v_branch_summary", "v_daily_otp", "v_otp_by_purpose",
    "v_operator_performance", "v_regional_rollup",
    "v_etl_health", "v_hourly_otp",
]


def validate_sql(sql: str) -> dict:
    """Return { valid: bool, reason: str, sanitized: str } ."""
    if not sql or not sql.strip():
        return {"valid": False, "reason": "Empty SQL"}

    s = sql.strip().rstrip(";")

    # Must start with SELECT (or WITH for CTEs)
    if not re.match(r"^\s*(SELECT|WITH)\b", s, re.IGNORECASE):
        return {"valid": False, "reason": "Only SELECT queries are allowed"}

    # No multiple statements
    if ";" in s:
        return {"valid": False, "reason": "Multiple statements not allowed"}

    # Blocked keywords
    upper = s.upper()
    for kw in BLOCKED_KEYWORDS:
        if re.search(rf"\b{re.escape(kw)}\b", upper):
            return {"valid": False, "reason": f"Blocked keyword: {kw.strip()}"}

    # Table whitelist (extract FROM / JOIN targets)
    table_refs = re.findall(r"(?:FROM|JOIN)\s+([a-z_][a-z0-9_]*)", s, re.IGNORECASE)
    for tbl in table_refs:
        if tbl.lower() not in [t.lower() for t in ALLOWED_TABLES]:
            return {"valid": False, "reason": f"Table not allowed: {tbl}"}

    # Auto-add LIMIT if missing and not an aggregate-only query
    if not re.search(r"\bLIMIT\b", upper) and not re.search(r"\bCOUNT\s*\(", upper):
        s = s + " LIMIT 500"

    return {"valid": True, "reason": "OK", "sanitized": s}


# ═══════════════════════════════════════════════════════════════
# MAIN FLOW
# ═══════════════════════════════════════════════════════════════

def question_to_sql(question: str) -> dict:
    """Generate SQL from question via LLM."""
    prompt = f"Question: {question}\n\nSQL:"
    result = generate_sql(prompt, system=SYSTEM_PROMPT)
    return result


def execute_safe_sql(db: Session, sql: str) -> dict:
    """Run validated SQL and return rows."""
    validation = validate_sql(sql)
    if not validation["valid"]:
        return {"error": validation["reason"]}

    safe_sql = validation["sanitized"]
    try:
        result = db.execute(text(safe_sql))
        rows = [dict(r._mapping) for r in result]
        return {
            "sql": safe_sql,
            "row_count": len(rows),
            "rows": rows,
        }
    except Exception as e:
        return {"error": str(e), "sql": safe_sql}


def ask(db: Session, question: str) -> dict:
    """Full pipeline: question → SQL → validate → execute → return."""
    llm = question_to_sql(question)

    if llm.get("error"):
        return {
            "question": question,
            "error": llm["error"],
            "provider": llm.get("provider"),
        }

    sql = llm.get("sql")
    if not sql:
        return {
            "question": question,
            "error": "LLM did not return SQL",
            "raw": llm.get("raw"),
        }

    executed = execute_safe_sql(db, sql)

    return {
        "question": question,
        "provider": llm.get("provider"),
        "sql": executed.get("sql", sql),
        "row_count": executed.get("row_count", 0),
        "rows": executed.get("rows", []),
        "error": executed.get("error"),
    }