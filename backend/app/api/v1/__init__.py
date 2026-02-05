"""API v1 router"""

from fastapi import APIRouter

from app.api.v1 import (
    audit,
    auth,
    documents,
    email,
    graph,
    health,
    llm,
    requirements,
    risks,
    schedule,
    signatures,
    templates,
    tests,
    time_entries,
    workitems,
)

api_router = APIRouter()

# Include health check routes (no authentication required)
api_router.include_router(health.router, tags=["health"])

# Include authentication routes
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])

# Include audit routes
api_router.include_router(audit.router, tags=["audit"])

# Include document routes
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])

# Include email routes
api_router.include_router(email.router, tags=["email"])

# Include graph routes
api_router.include_router(graph.router, prefix="/graph", tags=["graph"])

# Include workitem routes
api_router.include_router(workitems.router, tags=["workitems"])

# Include requirements routes
api_router.include_router(requirements.router, tags=["requirements"])

# Include signature routes
api_router.include_router(signatures.router, tags=["signatures"])

# Include test routes
api_router.include_router(tests.router, prefix="/tests", tags=["tests"])

# Include risk routes
api_router.include_router(risks.router, prefix="/risks", tags=["risks"])

# Include LLM routes
api_router.include_router(llm.router, prefix="/llm", tags=["llm"])

# Include schedule routes
api_router.include_router(schedule.router, prefix="/schedule", tags=["schedule"])

# Include time entry routes
api_router.include_router(time_entries.router, tags=["time-entries"])

# Include template routes
api_router.include_router(templates.router, tags=["templates"])
