"""
FastAPI backend for Branch Intelligence platform.
"""

import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from db import SessionLocal
from routes import (
    overview, branches, workforce, otp, etl, monitoring,
    analytics, ingestion, quality, export, ai, bi, operators,
    auth, duplicates, errors, mapping,  alerts,
)
from services import error_logger

app = FastAPI(
    title="Branch Intelligence API",
    description="Live operational data from MySQL",
    version="1.0.0",
)

# ═══════════════════════════════════════════════════════════════
# CORS
# ═══════════════════════════════════════════════════════════════
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)


# ═══════════════════════════════════════════════════════════════
# CORS PREFLIGHT
# ═══════════════════════════════════════════════════════════════
@app.options("/{rest_of_path:path}")
async def preflight(rest_of_path: str):
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════
# ERROR LOGGING MIDDLEWARE
# ═══════════════════════════════════════════════════════════════
@app.middleware("http")
async def catch_http_errors(request: Request, call_next):
    start = time.time()
    try:
        response = await call_next(request)
    except Exception as exc:
        db = SessionLocal()
        try:
            error_logger.capture_exception(
                db, source="http_middleware", exc=exc,
                endpoint=str(request.url.path),
                method=request.method,
            )
        finally:
            db.close()
        raise

    if response.status_code >= 400:
        db = SessionLocal()
        try:
            level = "CRITICAL" if response.status_code >= 500 else "WARNING"
            error_logger.log_error(
                db,
                level=level,
                source="http_response",
                message=f"{response.status_code} on {request.url.path}",
                endpoint=str(request.url.path),
                method=request.method,
                status_code=response.status_code,
            )
        finally:
            db.close()

    response.headers["X-Process-Time"] = f"{(time.time() - start) * 1000:.1f}ms"
    return response


# ═══════════════════════════════════════════════════════════════
# ROUTERS
# ═══════════════════════════════════════════════════════════════
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(overview.router, prefix="/api/overview", tags=["Overview"])
app.include_router(branches.router, prefix="/api/branches", tags=["Branches"])
app.include_router(workforce.router, prefix="/api/workforce", tags=["Workforce"])
app.include_router(otp.router, prefix="/api/otp", tags=["OTP"])
app.include_router(etl.router, prefix="/api/etl", tags=["ETL"])
app.include_router(monitoring.router, prefix="/api/monitoring", tags=["Monitoring"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(ingestion.router, prefix="/api/ingestion", tags=["Ingestion"])
app.include_router(quality.router, prefix="/api/quality", tags=["Quality"])
app.include_router(export.router, prefix="/api/export", tags=["Export"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI Assistant"])
app.include_router(bi.router, prefix="/api/bi", tags=["BI Dashboard"])
app.include_router(operators.router, prefix="/api/operators", tags=["Operators"])
app.include_router(duplicates.router, prefix="/api/duplicates", tags=["Duplicates"])
app.include_router(errors.router, prefix="/api/errors", tags=["Errors"])
app.include_router(mapping.router, prefix="/api/mapping", tags=["Mapping"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Alerts"])


@app.get("/")
def root():
    return {"platform": "Branch Intelligence", "status": "running", "version": "1.0.0"}


@app.get("/api/health")
def health():
    return {"status": "ok"}
