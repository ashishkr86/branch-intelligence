"""
GET /api/quality — live data quality metrics from MySQL.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from db import get_db

router = APIRouter()


@router.get("")
def get_quality(db: Session = Depends(get_db)):
    # ─── Row counts ───
    total_otp = db.execute(text("SELECT COUNT(*) FROM otp_report")).scalar() or 0
    total_emp = db.execute(text("SELECT COUNT(*) FROM branch_employee")).scalar() or 0
    total_branch = db.execute(text("SELECT COUNT(*) FROM branch")).scalar() or 0

    # ─── Nulls & invalid counts (OTP) ───
    null_mobile = db.execute(text(
        "SELECT COUNT(*) FROM otp_report WHERE MOBILE_NUMBER IS NULL OR MOBILE_NUMBER = ''"
    )).scalar() or 0

    null_operator = db.execute(text(
        "SELECT COUNT(*) FROM otp_report WHERE OPERATOR IS NULL OR OPERATOR = ''"
    )).scalar() or 0

    invalid_mobile = db.execute(text("""
        SELECT COUNT(*) FROM otp_report
        WHERE MOBILE_NUMBER IS NOT NULL
          AND MOBILE_NUMBER != ''
          AND (CHAR_LENGTH(MOBILE_NUMBER) < 10 OR MOBILE_NUMBER NOT REGEXP '^[0-9]+$')
    """)).scalar() or 0

    # ─── Orphan FKs (should be 0 due to constraints) ───
    orphan_emp = db.execute(text("""
        SELECT COUNT(*) FROM branch_employee e
        LEFT JOIN branch b ON b.BM_CODE = e.BM_CODE
        WHERE b.BM_CODE IS NULL
    """)).scalar() or 0

    orphan_otp = db.execute(text("""
        SELECT COUNT(*) FROM otp_report o
        LEFT JOIN branch b ON b.BM_CODE = o.BM_CODE
        WHERE b.BM_CODE IS NULL
    """)).scalar() or 0

    # ─── Duplicates ───
    dup_emp = db.execute(text("""
        SELECT COUNT(*) FROM (
            SELECT EMPLOYEE_NUMBER FROM branch_employee
            GROUP BY EMPLOYEE_NUMBER HAVING COUNT(*) > 1
        ) AS t
    """)).scalar() or 0

    # ─── Missing required fields ───
    missing_purpose = db.execute(text(
        "SELECT COUNT(*) FROM otp_report WHERE PURPOSE IS NULL OR PURPOSE = ''"
    )).scalar() or 0

    missing_emp_name = db.execute(text(
        "SELECT COUNT(*) FROM branch_employee WHERE EMPLOYEE_NAME IS NULL OR EMPLOYEE_NAME = ''"
    )).scalar() or 0

    # ─── Metrics list with pass/warn thresholds ───
    metrics = [
        {"id": "missing_mobile", "label": "Missing Mobile", "value": null_mobile, "threshold": max(50, total_otp // 100), "status": "pass" if null_mobile < max(50, total_otp // 100) else "warn"},
        {"id": "missing_operator", "label": "Missing Operator", "value": null_operator, "threshold": 100, "status": "pass" if null_operator < 100 else "warn"},
        {"id": "invalid_mobile", "label": "Invalid Mobile", "value": invalid_mobile, "threshold": 25, "status": "pass" if invalid_mobile < 25 else "warn"},
        {"id": "missing_purpose", "label": "Missing Purpose", "value": missing_purpose, "threshold": 20, "status": "pass" if missing_purpose < 20 else "warn"},
        {"id": "missing_emp_name", "label": "Missing Employee Name", "value": missing_emp_name, "threshold": 10, "status": "pass" if missing_emp_name < 10 else "warn"},
        {"id": "dup_emp", "label": "Duplicate Employees", "value": dup_emp, "threshold": 5, "status": "pass" if dup_emp < 5 else "warn"},
        {"id": "orphan_emp", "label": "Orphan Employees", "value": orphan_emp, "threshold": 0, "status": "pass" if orphan_emp == 0 else "fail"},
        {"id": "orphan_otp", "label": "Orphan OTPs", "value": orphan_otp, "threshold": 0, "status": "pass" if orphan_otp == 0 else "fail"},
    ]

    # ─── Quality score = % of passing metrics ───
    passed = sum(1 for m in metrics if m["status"] == "pass")
    warnings = sum(1 for m in metrics if m["status"] == "warn")
    failed = sum(1 for m in metrics if m["status"] == "fail")
    score = round((passed / len(metrics)) * 100, 1) if metrics else 100

    # ─── Table-level quality ───
    tables = [
        {
            "table": "branch",
            "rows": total_branch,
            "valid": total_branch,
            "invalid": 0,
            "nulls": 0,
            "score": 100,
            "status": "pass",
        },
        {
            "table": "branch_employee",
            "rows": total_emp,
            "valid": total_emp - missing_emp_name,
            "invalid": 0,
            "nulls": missing_emp_name,
            "score": round(((total_emp - missing_emp_name) / total_emp) * 100, 1) if total_emp else 100,
            "status": "pass" if missing_emp_name < 10 else "warn",
        },
        {
            "table": "otp_report",
            "rows": total_otp,
            "valid": total_otp - (null_mobile + null_operator + invalid_mobile),
            "invalid": invalid_mobile,
            "nulls": null_mobile + null_operator,
            "score": round(
                ((total_otp - (null_mobile + null_operator + invalid_mobile)) / total_otp) * 100, 1
            ) if total_otp else 100,
            "status": "pass" if (null_mobile + null_operator + invalid_mobile) < 100 else "warn",
        },
        {
            "table": "etl_runs",
            "rows": db.execute(text("SELECT COUNT(*) FROM etl_runs")).scalar() or 0,
            "valid": db.execute(text("SELECT COUNT(*) FROM etl_runs")).scalar() or 0,
            "invalid": 0,
            "nulls": 0,
            "score": 100,
            "status": "pass",
        },
    ]

    # ─── Column-level quality (OTP) ───
    columns = [
        {
            "column": "MOBILE_NUMBER",
            "table": "otp_report",
            "total": total_otp,
            "nulls": null_mobile,
            "valid": total_otp - null_mobile,
            "invalid": invalid_mobile,
            "status": "warn" if (null_mobile + invalid_mobile) > 20 else "pass",
        },
        {
            "column": "OPERATOR",
            "table": "otp_report",
            "total": total_otp,
            "nulls": null_operator,
            "valid": total_otp - null_operator,
            "invalid": 0,
            "status": "pass" if null_operator < 50 else "warn",
        },
        {
            "column": "PURPOSE",
            "table": "otp_report",
            "total": total_otp,
            "nulls": missing_purpose,
            "valid": total_otp - missing_purpose,
            "invalid": 0,
            "status": "pass",
        },
        {
            "column": "EMPLOYEE_NAME",
            "table": "branch_employee",
            "total": total_emp,
            "nulls": missing_emp_name,
            "valid": total_emp - missing_emp_name,
            "invalid": 0,
            "status": "pass" if missing_emp_name < 10 else "warn",
        },
    ]

    return {
        "score": {
            "score": score,
            "delta": "Live from MySQL",
            "totalChecks": len(metrics),
            "passed": passed,
            "warnings": warnings,
            "failed": failed,
        },
        "metrics": metrics,
        "tables": tables,
        "columns": columns,
        "trend": {
            "labels": ["Current"],
            "data": [score],
        },
    }