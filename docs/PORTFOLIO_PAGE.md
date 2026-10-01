# Branch Intelligence — Full-Stack Data Platform

**A production-grade data engineering and analytics platform that ingests operational CSVs, cleans and validates them, loads into MySQL, and exposes live dashboards, BI reports, and an AI assistant.**

---

## 🎯 What It Is

Branch Intelligence is a self-contained data platform built to solve a real operational problem: banks and financial institutions generate massive amounts of branch-level data (OTP activity, employee records, transaction logs) but rarely have a unified way to visualize, monitor, and query it.

This platform:

- **Ingests** raw operational CSVs via drag-and-drop or API
- **Validates** them with a rule-based data quality engine
- **Cleans** duplicates and enforces referential integrity
- **Loads** them into a structured MySQL warehouse
- **Exposes** 15+ REST endpoints for analytics
- **Visualizes** live dashboards with charts, tables, and filters
- **Monitors** the ETL pipeline with live logs and error tracking
- **Answers** natural-language questions by generating SQL via LLM
- **Exports** data to Power BI, Tableau, or any BI tool

Everything runs locally on a laptop — no cloud account required.

---

## 🏗️ Architecture
┌─────────────────┐
│ React Frontend │ (Vite + Tailwind + Chart.js)
│ localhost:5173 │
└────────┬────────┘
│ HTTP/JSON
▼
┌─────────────────┐
│ FastAPI │ (Python + SQLAlchemy + JWT)
│ localhost:8000 │
└────────┬────────┘
│ SQL
▼
┌─────────────────┐
│ MySQL 8.0 │ (4 tables + 7 analytics views)
│ gentech_db │
└─────────────────┘


**Three-tier architecture** — frontend, backend, database — with a full ETL pipeline connecting them.

---

## 💡 Key Features

### 📊 Data Engineering
- **Multi-format ingestion** — CSV upload via UI, API, or folder watcher
- **Headerless CSV detection** — auto-detects missing headers and assigns column names
- **Duplicate detection** — hash-based dedup before insert
- **Data quality engine** — validates 10+ rules (nulls, duplicates, invalid dates, orphan keys)
- **ETL pipeline** — extract → validate → clean → transform → quality check → load
- **Live log streaming** — watch ETL stages progress in real time
- **Run history** — every ETL run logged with metrics

### 🔐 Authentication & Security
- **JWT-based auth** — 24-hour sessions, revocable tokens
- **Password hashing** — bcrypt with salt rounds
- **Role-based access** — admin / analyst / viewer
- **Audit logging** — every action tracked (who, what, when)
- **Safe SQL execution** — AI-generated SQL validated against whitelist

### 📈 Analytics & Visualization
- **15 pages** — Overview, Ingestion, ETL, Quality, Duplicates, Branches, Workforce, OTP, Operators, Analytics, BI Dashboard, AI Assistant, Monitoring, Errors, Cloud, Settings
- **Real-time dashboards** — live KPIs, trends, distributions, heatmaps
- **Cross-filtering** — BI Dashboard slicers update all charts
- **Operator drill-down** — click any operator → full activity breakdown
- **Power BI export** — 7 pre-built views + CSV/JSON API

### 🤖 AI Assistant
- **Natural language → SQL** — ask "Which branch has the highest OTP activity?" and get live results
- **Multi-provider** — Claude, GPT, Groq, Gemini, Ollama, or rule-based mock
- **Safe execution** — SQL validated (SELECT-only, table whitelist, auto-LIMIT)
- **Full transparency** — SQL shown below every answer
- **Audit trail** — every AI query logged

### 🛠️ Engineering
- **Live error tracking** — captures HTTP 4xx/5xx, exceptions, ETL failures
- **Duplicate cleanup** — one-click dedupe per table
- **Scheduler** — auto-runs ETL on configured intervals
- **Backup scripts** — MySQL dumps + restore
- **Health checks** — `/api/health`, `/api/monitoring`

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Chart.js, Lucide Icons |
| **Backend** | Python 3.11, FastAPI, SQLAlchemy, Pydantic, Uvicorn |
| **Database** | MySQL 8.0 (InnoDB, utf8mb4) |
| **Auth** | JWT (python-jose), bcrypt (passlib) |
| **ETL** | Pandas, custom pipeline engine |
| **AI** | Groq / Gemini / Claude / Ollama (pluggable) |
| **BI** | SQL views, CSV/JSON export API, Power BI compatible |
| **DevOps** | Docker, Docker Compose, shell scripts |

---

## 📊 By The Numbers

- **~12,000 lines of code** across frontend, backend, and SQL
- **15 frontend pages** built with reusable UI primitives
- **17 REST API routes** (auth, overview, branches, workforce, OTP, operators, analytics, BI, ETL, quality, ingestion, duplicates, errors, export, AI, monitoring)
- **4 core tables** + **3 auth tables** + **7 analytics views**
- **~40,000 rows** of real data processed (branches, employees, OTP records)
- **100% local** — no cloud dependencies, runs on any laptop

---

## 🎓 What This Project Demonstrates

### Data Engineering
- Schema design with proper keys, indexes, and foreign keys
- ETL pipeline architecture (extract → transform → load)
- Data quality validation with rule engine
- Duplicate detection via business-key hashing
- Idempotent loads (upsert semantics)
- Referential integrity handling (orphan row filtering)

### Backend Engineering
- RESTful API design with FastAPI
- SQLAlchemy ORM + raw SQL for analytics
- JWT authentication + session management
- Middleware for error tracking and request timing
- Pydantic schema validation
- CORS handling
- Audit logging

### Frontend Engineering
- React 18 with hooks (useState, useEffect, useMemo)
- Context API for global auth state
- Custom hooks (`useApi`, `usePolling`)
- Reusable component design
- Chart.js integration
- Dark theme design system
- Responsive layouts

### DevOps & Cloud
- Docker + Docker Compose (self-contained stack)
- Environment variable management (.env)
- Database backup scripts
- Cross-platform setup (Windows/Linux/macOS)
- Future roadmap: AWS (S3, RDS, ECS), Terraform, Kubernetes

### AI Integration
- Multi-provider LLM abstraction
- Prompt engineering for SQL generation
- SQL safety validation (no DDL/DML)
- Natural language interface design

---

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/yourusername/branch-intelligence
cd branch-intelligence

# Backend
python -m venv venv
venv\Scripts\activate          # Windows
source venv/bin/activate       # Linux/macOS
pip install -r requirements.txt

# Database
mysql -u root -p -e "CREATE DATABASE gentech_db;"
mysql -u root -p gentech_db < sql/schema.sql

# Config
cp .env.example .env
# Edit .env with your MySQL password

# Run
uvicorn backend.main:app --reload --port 8000   # Terminal 1
npm run dev                                     # Terminal 2