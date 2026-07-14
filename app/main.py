"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from app.config import APP_TITLE, APP_VERSION, APP_DESCRIPTION, STATIC_DIR
from app.database import init_db
from app.routers import tasks, timer, analytics, review

# Create FastAPI app
app = FastAPI(
    title=APP_TITLE,
    version=APP_VERSION,
    description=APP_DESCRIPTION,
)

# Include API routers
app.include_router(tasks.router)
app.include_router(timer.router)
app.include_router(analytics.router)
app.include_router(review.router)

# Mount static files
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.on_event("startup")
def on_startup():
    """Initialize database tables on application startup."""
    init_db()


@app.get("/", include_in_schema=False)
def serve_spa():
    """Serve the single-page application."""
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))
