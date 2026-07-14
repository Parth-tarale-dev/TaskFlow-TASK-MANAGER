"""Daily review API endpoints."""

import json
from datetime import datetime, date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Task, TimeEntry, DailyReview
from app.schemas import DailyReviewCreate, DailyReviewResponse

router = APIRouter(prefix="/api/reviews", tags=["Daily Reviews"])


@router.get("/", response_model=list[DailyReviewResponse])
def list_reviews(db: Session = Depends(get_db)):
    reviews = db.query(DailyReview).order_by(DailyReview.review_date.desc()).all()
    return [_review_to_response(r) for r in reviews]


@router.get("/today", response_model=DailyReviewResponse)
def get_today_review(db: Session = Depends(get_db)):
    today = date.today()
    review = db.query(DailyReview).filter(DailyReview.review_date == today).first()
    if not review:
        review = _generate_review(db, today)
    return _review_to_response(review)


@router.get("/{review_date}", response_model=DailyReviewResponse)
def get_review(review_date: date, db: Session = Depends(get_db)):
    review = db.query(DailyReview).filter(DailyReview.review_date == review_date).first()
    if not review:
        raise HTTPException(status_code=404, detail="No review found for this date")
    return _review_to_response(review)


@router.post("/generate", response_model=DailyReviewResponse)
def generate_review(data: DailyReviewCreate, db: Session = Depends(get_db)):
    review_date = data.review_date or date.today()
    existing = db.query(DailyReview).filter(DailyReview.review_date == review_date).first()
    if existing:
        db.delete(existing)
        db.commit()
    review = _generate_review(db, review_date, summary_override=data.summary or None)
    return _review_to_response(review)


def _generate_review(db, review_date, summary_override=None):
    day_start = datetime.combine(review_date, datetime.min.time())
    day_end = datetime.combine(review_date, datetime.max.time())

    completed_tasks = db.query(Task).filter(
        Task.completed_at >= day_start, Task.completed_at <= day_end
    ).all()

    pending_tasks = db.query(Task).filter(
        Task.status != "done", Task.created_at <= day_end
    ).all()

    total_time = sum(
        e.duration_seconds or 0
        for e in db.query(TimeEntry).filter(
            TimeEntry.started_at >= day_start, TimeEntry.started_at <= day_end
        ).all()
    )

    weights = {"high": 3, "medium": 2, "low": 1}
    weighted_sum = sum(weights.get(t.priority, 1) for t in completed_tasks)
    productivity_score = min(100.0, round(weighted_sum * 15, 1))

    wins = [f"Completed: {t.title} ({t.priority} priority)" for t in completed_tasks]
    if total_time > 0:
        h, m = total_time // 3600, (total_time % 3600) // 60
        wins.append(f"Tracked {h}h {m}m of focused work" if h else f"Tracked {m}m of focused work")

    incomplete = [
        f"{t.title} ({t.priority}, {t.status.replace('_', ' ')})"
        for t in pending_tasks[:10]
    ]

    if summary_override:
        summary = summary_override
    else:
        parts = []
        if completed_tasks:
            parts.append(f"Completed {len(completed_tasks)} task(s)")
        if pending_tasks:
            parts.append(f"{len(pending_tasks)} task(s) still pending")
        summary = ". ".join(parts) + "." if parts else "No activity recorded."

    review = DailyReview(
        review_date=review_date, summary=summary,
        tasks_completed=len(completed_tasks), tasks_pending=len(pending_tasks),
        total_time_seconds=total_time, productivity_score=productivity_score,
        wins=json.dumps(wins), incomplete=json.dumps(incomplete),
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


def _review_to_response(review):
    return {
        "id": review.id, "review_date": review.review_date,
        "summary": review.summary, "tasks_completed": review.tasks_completed,
        "tasks_pending": review.tasks_pending, "total_time_seconds": review.total_time_seconds,
        "productivity_score": review.productivity_score,
        "wins": review.wins_list, "incomplete": review.incomplete_list,
        "created_at": review.created_at,
    }
