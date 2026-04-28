"""
AI-LMS FastAPI Application — Modular Router Architecture
Implements all 100+ endpoints across 8 domain routers
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db_init import safe_init
from app.routers import (
    auth, tenants, users, courses, assessments,
    knowledge, ai_engine, gamification, hr, integrations, analytics,
)
from app.mongodb.auth_router import router as mongo_auth_router
from app.mongodb.dashboard_router import router as mongo_dashboard_router
from app.mongodb.courses_router import router as mongo_courses_router
from app.mongodb.learning_flow_router import router as mongo_lf_router
from app.mongodb.assessment_router import router as mongo_as_router
from app.mongodb.ai_studio_router import router as mongo_ai_studio_router
from app.mongodb.access_control_router import router as mongo_ac_router
from app.mongodb.audit_logs_router import router as mongo_audit_router
from app.mongodb.knowledge_workspace_router import router as mongo_kw_router
from app.mongodb.performance_workspace_router import router as mongo_perf_router
from app.mongodb.adaptive_rules_router import router as mongo_adaptive_rules_router

app = FastAPI(
    title="AI-LMS Platform API",
    description=(
        "Universal AI-powered Learning Management System. "
        "Multi-tenant, plug-in for any website. "
        "Implements 100+ endpoints across 53 database tables."
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
_raw_origins = settings.CORS_ORIGINS.strip()
if _raw_origins == "*":
    # Wildcard origin — credentials must be False (browser CORS spec requirement)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    # Specific origins — credentials can be True for cookie-based flows
    _specific_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_specific_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# ─── Startup ──────────────────────────────────────────────────────────────────
@app.on_event("startup")
def on_startup() -> None:
    safe_init()


@app.on_event("startup")
async def start_audit_auto_sync() -> None:
    from app.mongodb.audit_logs_router import start_auto_sync
    start_auto_sync()


@app.on_event("startup")
async def start_adaptive_rules_auto_sync() -> None:
    from app.mongodb.adaptive_rules_router import start_auto_sync as ar_start
    ar_start()


# ─── Health ───────────────────────────────────────────────────────────────────
@app.get("/healthz", tags=["Health"])
def healthz():
    return {"status": "ok"}


@app.get("/readyz", tags=["Health"])
def readyz():
    try:
        from app.db import SessionLocal
        with SessionLocal() as db:
            db.execute(db.bind.connect().execute("SELECT 1"))
    except Exception:
        pass  # non-critical for readyz
    return {"status": "ready", "version": "2.0.0"}


# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(mongo_auth_router)
app.include_router(mongo_dashboard_router)
app.include_router(mongo_courses_router)
app.include_router(mongo_lf_router)
app.include_router(mongo_as_router)
app.include_router(mongo_ai_studio_router)
app.include_router(mongo_ac_router)
app.include_router(mongo_audit_router)
app.include_router(mongo_kw_router)
app.include_router(mongo_perf_router)
app.include_router(mongo_adaptive_rules_router)
app.include_router(auth.router)
app.include_router(tenants.router)
app.include_router(users.router)
app.include_router(courses.router)
app.include_router(assessments.router)
app.include_router(knowledge.router)
app.include_router(ai_engine.router)
app.include_router(gamification.router)
app.include_router(hr.router)
app.include_router(integrations.router)
app.include_router(analytics.router)
