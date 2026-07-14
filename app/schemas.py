"""Pydantic schemas for request/response validation."""

from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field


# ──────────────────────────────────────────────
# Task Schemas
# ──────────────────────────────────────────────

class TaskCreate(BaseModel):
    """Schema for creating a new task."""
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(default="")
    priority: str = Field(default="medium", pattern="^(high|medium|low)$")
    status: str = Field(default="todo", pattern="^(todo|in_progress|done)$")
    tags: list[str] = Field(default_factory=list)
    due_date: Optional[datetime] = None
    sort_order: int = Field(default=0)


class TaskUpdate(BaseModel):
    """Schema for updating a task. All fields are optional."""
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    priority: Optional[str] = Field(default=None, pattern="^(high|medium|low)$")
    status: Optional[str] = Field(default=None, pattern="^(todo|in_progress|done)$")
    tags: Optional[list[str]] = None
    due_date: Optional[datetime] = None
    sort_order: Optional[int] = None


class TaskResponse(BaseModel):
    """Schema for task responses."""
    id: int
    title: str
    description: str
    priority: str
    status: str
    tags: list[str]
    due_date: Optional[datetime]
    sort_order: int
    total_time_seconds: int
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]

    model_config = {"from_attributes": True}


class TaskReorder(BaseModel):
    """Schema for reordering tasks (Kanban drag-and-drop)."""
    task_id: int
    new_status: str = Field(..., pattern="^(todo|in_progress|done)$")
    new_sort_order: int


class BulkReorder(BaseModel):
    """Schema for bulk reordering multiple tasks."""
    tasks: list[TaskReorder]


# ──────────────────────────────────────────────
# Time Entry Schemas
# ──────────────────────────────────────────────

class TimeEntryCreate(BaseModel):
    """Schema for creating a time entry."""
    task_id: int
    timer_type: str = Field(default="stopwatch", pattern="^(pomodoro|stopwatch)$")
    duration_seconds: int = Field(default=0, ge=0)
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    notes: str = Field(default="")


class TimeEntryUpdate(BaseModel):
    """Schema for updating a time entry."""
    duration_seconds: Optional[int] = Field(default=None, ge=0)
    ended_at: Optional[datetime] = None
    notes: Optional[str] = None


class TimeEntryResponse(BaseModel):
    """Schema for time entry responses."""
    id: int
    task_id: int
    timer_type: str
    duration_seconds: int
    started_at: datetime
    ended_at: Optional[datetime]
    notes: str

    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────
# Daily Review Schemas
# ──────────────────────────────────────────────

class DailyReviewCreate(BaseModel):
    """Schema for creating/updating a daily review."""
    review_date: Optional[date] = None
    summary: str = Field(default="")


class DailyReviewResponse(BaseModel):
    """Schema for daily review responses."""
    id: int
    review_date: date
    summary: str
    tasks_completed: int
    tasks_pending: int
    total_time_seconds: int
    productivity_score: float
    wins: list[str]
    incomplete: list[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────
# Analytics Schemas
# ──────────────────────────────────────────────

class CompletionRateResponse(BaseModel):
    """Task completion rates over a period."""
    period: str               # "daily", "weekly", "monthly"
    labels: list[str]         # Date labels
    completed: list[int]      # Completed tasks per period
    total: list[int]          # Total tasks per period
    rate: list[float]         # Completion rate (%)


class TimePerCategoryResponse(BaseModel):
    """Time spent breakdown by tag/category."""
    labels: list[str]         # Category names
    durations: list[int]      # Duration in seconds per category


class ProductivityScoreResponse(BaseModel):
    """Productivity scores over time."""
    labels: list[str]         # Date labels
    scores: list[float]       # Score per day (0-100)
    average: float            # Overall average


class DashboardSummary(BaseModel):
    """Quick summary stats for the dashboard header."""
    total_tasks: int
    completed_today: int
    in_progress: int
    pending: int
    total_time_today_seconds: int
    streak_days: int
    avg_productivity_score: float
