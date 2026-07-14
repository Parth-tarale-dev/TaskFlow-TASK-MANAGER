"""SQLAlchemy ORM models for the Task Manager."""

import json
from datetime import datetime, date

from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Date, Float, ForeignKey, event
)
from sqlalchemy.orm import relationship

from app.database import Base


class Task(Base):
    """A task with priority, status, tags, and time tracking."""

    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, default="")
    priority = Column(String(10), nullable=False, default="medium")   # high, medium, low
    status = Column(String(15), nullable=False, default="todo")       # todo, in_progress, done
    tags = Column(Text, default="[]")                                 # JSON array of strings
    due_date = Column(DateTime, nullable=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    time_entries = relationship(
        "TimeEntry", back_populates="task", cascade="all, delete-orphan"
    )

    @property
    def tags_list(self) -> list[str]:
        """Deserialize tags JSON string to a Python list."""
        try:
            return json.loads(self.tags) if self.tags else []
        except (json.JSONDecodeError, TypeError):
            return []

    @tags_list.setter
    def tags_list(self, value: list[str]):
        """Serialize a Python list to tags JSON string."""
        self.tags = json.dumps(value)

    @property
    def total_time_seconds(self) -> int:
        """Calculate total tracked time across all time entries."""
        return sum(entry.duration_seconds for entry in self.time_entries if entry.duration_seconds)

    def __repr__(self):
        return f"<Task(id={self.id}, title='{self.title}', status='{self.status}')>"


# Auto-set completed_at when status changes to 'done'
@event.listens_for(Task.status, "set")
def _task_status_set(target, value, oldvalue, initiator):
    if value == "done" and oldvalue != "done":
        target.completed_at = datetime.utcnow()
    elif value != "done" and oldvalue == "done":
        target.completed_at = None


class TimeEntry(Base):
    """A time tracking entry linked to a specific task."""

    __tablename__ = "time_entries"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    timer_type = Column(String(10), nullable=False, default="stopwatch")  # pomodoro, stopwatch
    duration_seconds = Column(Integer, default=0)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    notes = Column(Text, default="")

    # Relationships
    task = relationship("Task", back_populates="time_entries")

    def __repr__(self):
        return f"<TimeEntry(id={self.id}, task_id={self.task_id}, duration={self.duration_seconds}s)>"


class DailyReview(Base):
    """End-of-day summary capturing productivity metrics."""

    __tablename__ = "daily_reviews"

    id = Column(Integer, primary_key=True, index=True)
    review_date = Column(Date, unique=True, nullable=False, default=date.today)
    summary = Column(Text, default="")
    tasks_completed = Column(Integer, default=0)
    tasks_pending = Column(Integer, default=0)
    total_time_seconds = Column(Integer, default=0)
    productivity_score = Column(Float, default=0.0)
    wins = Column(Text, default="[]")             # JSON array of win strings
    incomplete = Column(Text, default="[]")       # JSON array of incomplete task titles
    created_at = Column(DateTime, default=datetime.utcnow)

    @property
    def wins_list(self) -> list[str]:
        try:
            return json.loads(self.wins) if self.wins else []
        except (json.JSONDecodeError, TypeError):
            return []

    @property
    def incomplete_list(self) -> list[str]:
        try:
            return json.loads(self.incomplete) if self.incomplete else []
        except (json.JSONDecodeError, TypeError):
            return []

    def __repr__(self):
        return f"<DailyReview(date={self.review_date}, score={self.productivity_score})>"
