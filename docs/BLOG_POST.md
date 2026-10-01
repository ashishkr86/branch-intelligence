
---

## 📄 File 2 — `docs/BLOG_POST.md`

📍 **Location:** `D:\branch-intelligence\docs\BLOG_POST.md`

```markdown
# Building a Full-Stack Data Platform from Scratch: Branch Intelligence

*A 10-session engineering journey through MySQL, FastAPI, React, and local LLMs.*

---

## The Problem

I work with branch-level operational data every day — OTP records, employee rosters, transaction logs. Companies generate gigabytes of this, but most of it lives in spreadsheets and gets analyzed by manual Excel work.

I wanted to build something better: a single platform that ingests CSVs, validates them, loads into a real database, and gives analysts a live dashboard + natural-language query interface.

Not a tutorial project. A real one.

---

## What I Built

**Branch Intelligence** — a full-stack data platform with:

- **15 dashboard pages** (Overview, Ingestion, ETL, Quality, Duplicates, Branches, Workforce, OTP, Operators, Analytics, BI, AI, Monitoring, Errors, Cloud, Settings)
- **17 REST API routes** (auth, analytics, ingestion, ETL, AI, export, monitoring)
- **JWT authentication** with roles (admin / analyst / viewer)
- **AI Assistant** that converts natural language to SQL and runs it against MySQL
- **Power BI export** with 7 pre-built views
- **Full ETL pipeline** with duplicate detection and data quality scoring

Total: **~12,000 lines of production-grade code**, all running locally.

---

## The Architecture

I chose a **three-tier architecture**:
React (5173) → FastAPI (8000) → MySQL (3306)


**Why this stack?**

- **React + Vite** — fast dev experience, great ecosystem
- **FastAPI** — Python's best web framework, auto-generates OpenAPI docs
- **MySQL** — battle-tested, available everywhere, works with every BI tool
- **Tailwind CSS** — I can build a full design system without CSS files
- **Chart.js** — lightweight, no build complexity

No microservices. No Kubernetes. No cloud. Just three processes on localhost.

---

## Session-by-Session Breakdown

Here's how I actually built it, in order:

### Session 1 — MySQL Foundation

Started with the schema. Four tables:

- `branch` — master data (BM_CODE, branch name, region)
- `branch_employee` — workforce (foreign key to branch)
- `otp_report` — operational activity (OTP records)
- `etl_runs` — pipeline execution log

**Key decisions:**
- InnoDB with utf8mb4 (proper unicode)
- Foreign keys with `ON UPDATE CASCADE / ON DELETE RESTRICT`
- Indexes on all join columns and filter columns
- Timestamps with defaults

**Lesson:** Schema first. Everything else depends on it.

### Session 2 — The ETL Pipeline

Wrote `etl_pipeline.py` — reads CSVs, cleans them, loads into MySQL.

**Challenges:**
- Dates could be `2026-09-21`, `21-09-2026`, or `09/21/2026`
- Times could be `14:30:00` or `2:30 PM`
- Some CSVs had headers, some didn't
- Some rows referenced non-existent branches

**Solution:** A column-by-column cleaning function that tries multiple parse formats and falls back gracefully. Orphan rows are filtered before insert.

**Lesson:** Real data is messy. Budget 3x more time for cleaning than for loading.

### Session 3 — FastAPI Backend

Built 17 route modules. Each one queries MySQL and returns JSON.

```python
@router.get("/overview")
def get_overview(db: Session = Depends(get_db)):
    total_branches = db.execute(text("SELECT COUNT(*) FROM branch")).scalar()
    # ... 20 more queries
    return {"kpis": {...}, "otpTrend": {...}, ...}