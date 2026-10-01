"""
Database connection module.

Reads MySQL credentials from .env and exposes:
  - engine: SQLAlchemy engine
  - SessionLocal: session factory
  - get_db(): FastAPI dependency
  - Base: declarative base for models
"""

import os
from pathlib import Path
from urllib.parse import quote_plus

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# ─── Load .env from project root ───
ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

# ─── Read credentials ───
DB_HOST = os.getenv("MYSQL_HOST", "localhost")
DB_PORT = os.getenv("MYSQL_PORT", "3306")
DB_NAME = os.getenv("MYSQL_DATABASE", "gentech_db")
DB_USER = os.getenv("MYSQL_USER", "root")
DB_PASS = os.getenv("MYSQL_PASSWORD", "")

# ─── Build connection URL ───
# quote_plus handles special characters in the password (e.g. @, #, %)
DB_URL = (
    f"mysql+pymysql://{DB_USER}:{quote_plus(DB_PASS)}"
    f"@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4"
)

# ─── Engine ───
engine = create_engine(
    DB_URL,
    pool_pre_ping=True,      # verify connections before use
    pool_recycle=3600,       # recycle connections every hour
    echo=False,              # set True for SQL debug logs
    future=True,
)

# ─── Session factory ───
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)

# ─── Declarative base ───
Base = declarative_base()


# ─── FastAPI dependency ───
def get_db():
    """Yield a DB session and close it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ─── Quick test ───
if __name__ == "__main__":
    from sqlalchemy import text

    print("Testing connection...")
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT DATABASE(), VERSION()"))
            row = result.fetchone()
            print(f"  ✅ Connected to: {row[0]}")
            print(f"  ✅ MySQL version: {row[1]}")

            result = conn.execute(text("SHOW TABLES"))
            tables = [r[0] for r in result]
            print(f"  ✅ Tables found: {', '.join(tables)}")
    except Exception as e:
        print(f"  ❌ Connection failed: {e}")