"""
Database connection module.

Connects FastAPI to Aiven MySQL using SSL.

Exposes:
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


# ─────────────────────────────────────────────
# Load .env
# ─────────────────────────────────────────────

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")


# ─────────────────────────────────────────────
# Database configuration
# ─────────────────────────────────────────────

DB_HOST = os.getenv(
    "MYSQL_HOST",
    "mysql-325b423d-ashishmw376-ceb4.e.aivencloud.com"
)

DB_PORT = os.getenv(
    "MYSQL_PORT",
    "21889"
)

DB_NAME = os.getenv(
    "MYSQL_DATABASE",
    "defaultdb"
)

DB_USER = os.getenv(
    "MYSQL_USER",
    "avnadmin"
)

DB_PASS = os.getenv(
    "AVNS_o-VLGKLj_R2_93P6UER",
    ""
)


# ─────────────────────────────────────────────
# SSL certificate
# ─────────────────────────────────────────────

CA_CERT = os.getenv(
    "MYSQL_SSL_CA",
    str(ROOT / "certs" / "ca.pem")
)


# ─────────────────────────────────────────────
# Build connection URL
# ─────────────────────────────────────────────

DB_URL = (
    f"mysql+pymysql://"
    f"{quote_plus(DB_USER)}:"
    f"{quote_plus(DB_PASS)}@"
    f"{DB_HOST}:"
    f"{DB_PORT}/"
    f"{DB_NAME}"
    f"?charset=utf8mb4"
)


# ─────────────────────────────────────────────
# SQLAlchemy Engine
# ─────────────────────────────────────────────

connect_args = {
    "ssl": {}
}

# Use CA certificate if it exists
if os.path.exists(CA_CERT):
    connect_args["ssl"] = {
        "ca": CA_CERT
    }


engine = create_engine(
    DB_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_recycle=3600,
    pool_size=5,
    max_overflow=10,
    echo=False,
    future=True,
)


# ─────────────────────────────────────────────
# Session factory
# ─────────────────────────────────────────────

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


# ─────────────────────────────────────────────
# Declarative base
# ─────────────────────────────────────────────

Base = declarative_base()


# ─────────────────────────────────────────────
# FastAPI dependency
# ─────────────────────────────────────────────

def get_db():
    """Yield a database session and close it after the request."""

    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# ─────────────────────────────────────────────
# Connection test
# ─────────────────────────────────────────────

if __name__ == "__main__":

    from sqlalchemy import text

    print("=" * 60)
    print("Testing Aiven MySQL connection")
    print("=" * 60)

    print(f"Host     : {DB_HOST}")
    print(f"Port     : {DB_PORT}")
    print(f"Database : {DB_NAME}")
    print(f"User     : {DB_USER}")
    print(f"SSL CA   : {CA_CERT}")
    print()

    try:

        with engine.connect() as conn:

            result = conn.execute(
                text("SELECT DATABASE(), VERSION()")
            )

            row = result.fetchone()

            print("✅ Database connection successful")
            print(f"✅ Database: {row[0]}")
            print(f"✅ MySQL: {row[1]}")

            print()
            print("Tables:")

            result = conn.execute(
                text("SHOW TABLES")
            )

            tables = [r[0] for r in result]

            for table in tables:
                print(f"  ✓ {table}")

            print()
            print("✅ Connection test completed successfully")

    except Exception as e:

        print()
        print("❌ Database connection failed")
        print()
        print(type(e).__name__)
        print(str(e))
