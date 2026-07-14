"""Analytics and dashboard API endpoints."""

import json
from datetime import datetime, timedelta, date
from collections import defaultdict

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Task, TimeEntry, DailyReview
from app.schemas import (
    CompletionRateResponse,
    TimePerCategoryResponse,
    ProductivityScoreResponse,
    DashboardSummary,
)

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/summary", response_model=DashboardSummary)
def dashboard_summary(db: Session = Depends(get_db)):
    """Get quick stats for the dashboard header."""
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_end = datetime.combine(date.today(), datetime.max.time())

    total_tasks = db.query(Task).count()
    completed_today = (
        db.query(Task)
        .filter(Task.status == "done", Task.completed_at >= today_start, Task.completed_at <= today_end)
        .count()
    )
    in_progress = db.query(Task).filter(Task.status == "in_progress").count()
    pending = db.query(Task).filter(Task.status == "todo").count()

    # Total time tracked today
    today_entries = (
        db.query(func.coalesce(func.sum(TimeEntry.duration_seconds), 0))
        .filter(TimeEntry.started_at >= today_start)
        .scalar()
    )

    # Streak: consecutive days with at least 1 completed task
    streak = _calculate_streak(db)

    # Average productivity score from daily reviews
    avg_score = (
        db.query(func.coalesce(func.avg(DailyReview.productivity_score), 0.0)).scalar()
    )

    return DashboardSummary(
        total_tasks=total_tasks,
        completed_today=completed_today,
        in_progress=in_progress,
        pending=pending,
        total_time_today_seconds=today_entries or 0,
        streak_days=streak,
        avg_productivity_score=round(avg_score, 1),
    )


@router.get("/completion-rate", response_model=CompletionRateResponse)
def completion_rate(
    period: str = Query("daily", pattern="^(daily|weekly|monthly)$"),
    days: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
):
    """Task completion rate over time."""
    end_date = date.today()
    start_date = end_date - timedelta(days=days)

    tasks = (
        db.query(Task)
        .filter(Task.created_at >= datetime.combine(start_date, datetime.min.time()))
        .all()
    )

    # Group by period
    buckets = _create_buckets(start_date, end_date, period)
    labels = list(buckets.keys())
    completed = []
    total = []
    rates = []

    for label in labels:
        bucket_start, bucket_end = buckets[label]
        bucket_tasks = [
            t for t in tasks
            if bucket_start <= t.created_at.date() <= bucket_end
        ]
        bucket_completed = [t for t in bucket_tasks if t.status == "done"]

        total_count = len(bucket_tasks)
        completed_count = len(bucket_completed)
        rate = round((completed_count / total_count * 100), 1) if total_count > 0 else 0.0

        completed.append(completed_count)
        total.append(total_count)
        rates.append(rate)

    return CompletionRateResponse(
        period=period,
        labels=labels,
        completed=completed,
        total=total,
        rate=rates,
    )


@router.get("/time-per-category", response_model=TimePerCategoryResponse)
def time_per_category(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
):
    """Time spent breakdown by tag/category."""
    since = datetime.utcnow() - timedelta(days=days)

    entries = (
        db.query(TimeEntry)
        .join(Task)
        .filter(TimeEntry.started_at >= since)
        .all()
    )

    category_time: dict[str, int] = defaultdict(int)

    for entry in entries:
        task = entry.task
        tags = task.tags_list if task.tags_list else ["Uncategorized"]
        duration_per_tag = (entry.duration_seconds or 0) // max(len(tags), 1)
        for tag in tags:
            category_time[tag] += duration_per_tag

    # Sort by duration descending
    sorted_categories = sorted(category_time.items(), key=lambda x: x[1], reverse=True)

    return TimePerCategoryResponse(
        labels=[c[0] for c in sorted_categories],
        durations=[c[1] for c in sorted_categories],
    )


@router.get("/productivity-scores", response_model=ProductivityScoreResponse)
def productivity_scores(
    days: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
):
    """Productivity scores over time, calculated from task completions."""
    end_date = date.today()
    start_date = end_date - timedelta(days=days)

    labels = []
    scores = []

    current = start_date
    while current <= end_date:
        day_start = datetime.combine(current, datetime.min.time())
        day_end = datetime.combine(current, datetime.max.time())

        # Calculate score for this day
        score = _calculate_day_score(db, day_start, day_end)
        labels.append(current.strftime("%b %d"))
        scores.append(score)
        current += timedelta(days=1)

    avg = round(sum(scores) / len(scores), 1) if scores else 0.0

    return ProductivityScoreResponse(
        labels=labels,
        scores=scores,
        average=avg,
    )


@router.get("/tags")
def all_tags(db: Session = Depends(get_db)):
    """Get all unique tags used across tasks."""
    tasks = db.query(Task.tags).all()
    tag_set = set()
    for (tags_json,) in tasks:
        try:
            tag_list = json.loads(tags_json) if tags_json else []
            tag_set.update(tag_list)
        except (json.JSONDecodeError, TypeError):
            continue
    return sorted(tag_set)


# ──────────────────────────────────────────────
# Helper Functions
# ──────────────────────────────────────────────

def _calculate_day_score(db: Session, day_start: datetime, day_end: datetime) -> float:
    """
    Calculate productivity score for a single day (0-100).
    Weighted by priority: high=3, medium=2, low=1.
    """
    completed = (
        db.query(Task)
        .filter(Task.completed_at >= day_start, Task.completed_at <= day_end)
        .all()
    )

    if not completed:
        return 0.0

    weights = {"high": 3, "medium": 2, "low": 1}
    weighted_sum = sum(weights.get(t.priority, 1) for t in completed)

    # Cap at 100, scale: 1 high-priority task = ~15 points
    score = min(100.0, round(weighted_sum * 15, 1))
    return score


def _calculate_streak(db: Session) -> int:
    """Calculate consecutive days with at least 1 task completed."""
    streak = 0
    current = date.today()

    while True:
        day_start = datetime.combine(current, datetime.min.time())
        day_end = datetime.combine(current, datetime.max.time())

        count = (
            db.query(Task)
            .filter(Task.completed_at >= day_start, Task.completed_at <= day_end)
            .count()
        )

        if count == 0:
            break

        streak += 1
        current -= timedelta(days=1)

    return streak


def _create_buckets(start_date: date, end_date: date, period: str) -> dict:
    """Create time buckets for grouping data."""
    buckets = {}

    if period == "daily":
        current = start_date
        while current <= end_date:
            label = current.strftime("%b %d")
            buckets[label] = (current, current)
            current += timedelta(days=1)

    elif period == "weekly":
        current = start_date - timedelta(days=start_date.weekday())  # Start of week
        while current <= end_date:
            week_end = current + timedelta(days=6)
            label = f"{current.strftime('%b %d')} - {week_end.strftime('%b %d')}"
            buckets[label] = (current, week_end)
            current += timedelta(days=7)

    elif period == "monthly":
        current = start_date.replace(day=1)
        while current <= end_date:
            next_month = (current.replace(day=28) + timedelta(days=4)).replace(day=1)
            month_end = next_month - timedelta(days=1)
            label = current.strftime("%b %Y")
            buckets[label] = (current, month_end)
            current = next_month

    return buckets
