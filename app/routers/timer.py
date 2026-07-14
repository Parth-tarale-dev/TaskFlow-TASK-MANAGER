"""Time tracking API endpoints."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Task, TimeEntry
from app.schemas import TimeEntryCreate, TimeEntryUpdate, TimeEntryResponse

router = APIRouter(prefix="/api/timer", tags=["Time Tracking"])


@router.get("/entries", response_model=list[TimeEntryResponse])
def list_entries(
    task_id: Optional[int] = Query(None),
    timer_type: Optional[str] = Query(None, pattern="^(pomodoro|stopwatch)$"),
    db: Session = Depends(get_db),
):
    """List time entries with optional filtering."""
    query = db.query(TimeEntry)

    if task_id:
        query = query.filter(TimeEntry.task_id == task_id)
    if timer_type:
        query = query.filter(TimeEntry.timer_type == timer_type)

    return query.order_by(TimeEntry.started_at.desc()).all()


@router.get("/entries/{entry_id}", response_model=TimeEntryResponse)
def get_entry(entry_id: int, db: Session = Depends(get_db)):
    """Get a single time entry by ID."""
    entry = db.query(TimeEntry).filter(TimeEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Time entry not found")
    return entry


@router.post("/start", response_model=TimeEntryResponse, status_code=201)
def start_timer(data: TimeEntryCreate, db: Session = Depends(get_db)):
    """Start a new timer for a task."""
    # Verify task exists
    task = db.query(Task).filter(Task.id == data.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    entry = TimeEntry(
        task_id=data.task_id,
        timer_type=data.timer_type,
        duration_seconds=0,
        started_at=data.started_at or datetime.utcnow(),
        notes=data.notes,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.put("/stop/{entry_id}", response_model=TimeEntryResponse)
def stop_timer(entry_id: int, data: TimeEntryUpdate, db: Session = Depends(get_db)):
    """Stop a running timer and record the duration."""
    entry = db.query(TimeEntry).filter(TimeEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Time entry not found")

    now = datetime.utcnow()
    entry.ended_at = data.ended_at or now
    entry.duration_seconds = data.duration_seconds or int(
        (entry.ended_at - entry.started_at).total_seconds()
    )
    if data.notes is not None:
        entry.notes = data.notes

    db.commit()
    db.refresh(entry)
    return entry


@router.post("/log", response_model=TimeEntryResponse, status_code=201)
def log_time(data: TimeEntryCreate, db: Session = Depends(get_db)):
    """Manually log time spent on a task (no live timer)."""
    task = db.query(Task).filter(Task.id == data.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    now = datetime.utcnow()
    entry = TimeEntry(
        task_id=data.task_id,
        timer_type=data.timer_type,
        duration_seconds=data.duration_seconds,
        started_at=data.started_at or now,
        ended_at=data.ended_at or now,
        notes=data.notes,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/entries/{entry_id}", status_code=204)
def delete_entry(entry_id: int, db: Session = Depends(get_db)):
    """Delete a time entry."""
    entry = db.query(TimeEntry).filter(TimeEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Time entry not found")
    db.delete(entry)
    db.commit()


@router.get("/task/{task_id}/total")
def task_total_time(task_id: int, db: Session = Depends(get_db)):
    """Get total tracked time for a specific task."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    entries = db.query(TimeEntry).filter(TimeEntry.task_id == task_id).all()
    total = sum(e.duration_seconds for e in entries if e.duration_seconds)

    return {
        "task_id": task_id,
        "task_title": task.title,
        "total_seconds": total,
        "total_formatted": _format_duration(total),
        "entry_count": len(entries),
    }


def _format_duration(seconds: int) -> str:
    """Format seconds into HH:MM:SS string."""
    hours, remainder = divmod(seconds, 3600)
    minutes, secs = divmod(remainder, 60)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"
