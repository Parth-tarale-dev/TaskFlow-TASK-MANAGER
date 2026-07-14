"""Task CRUD API endpoints."""

import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import asc, desc

from app.database import get_db
from app.models import Task
from app.schemas import TaskCreate, TaskUpdate, TaskResponse, BulkReorder

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])


@router.get("/", response_model=list[TaskResponse])
def list_tasks(
    status: Optional[str] = Query(None, pattern="^(todo|in_progress|done)$"),
    priority: Optional[str] = Query(None, pattern="^(high|medium|low)$"),
    tag: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: str = Query("sort_order", pattern="^(sort_order|created_at|due_date|priority|title)$"),
    sort_dir: str = Query("asc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
):
    """List all tasks with optional filtering and sorting."""
    query = db.query(Task)

    # Filters
    if status:
        query = query.filter(Task.status == status)
    if priority:
        query = query.filter(Task.priority == priority)
    if tag:
        # Search within JSON tags array
        query = query.filter(Task.tags.contains(f'"{tag}"'))
    if search:
        query = query.filter(
            Task.title.ilike(f"%{search}%") | Task.description.ilike(f"%{search}%")
        )

    # Sorting
    sort_column = getattr(Task, sort_by, Task.sort_order)
    order_func = asc if sort_dir == "asc" else desc
    query = query.order_by(order_func(sort_column))

    tasks = query.all()

    # Convert each task to response format with tags deserialized
    return [_task_to_response(t) for t in tasks]


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: int, db: Session = Depends(get_db)):
    """Get a single task by ID."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return _task_to_response(task)


@router.post("/", response_model=TaskResponse, status_code=201)
def create_task(data: TaskCreate, db: Session = Depends(get_db)):
    """Create a new task."""
    task = Task(
        title=data.title,
        description=data.description,
        priority=data.priority,
        status=data.status,
        tags=json.dumps(data.tags),
        due_date=data.due_date,
        sort_order=data.sort_order,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return _task_to_response(task)


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, data: TaskUpdate, db: Session = Depends(get_db)):
    """Update an existing task (partial update)."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = data.model_dump(exclude_unset=True)

    # Handle tags serialization
    if "tags" in update_data:
        update_data["tags"] = json.dumps(update_data["tags"])

    for field, value in update_data.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return _task_to_response(task)


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    """Delete a task and all associated time entries."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()


@router.put("/reorder/bulk", response_model=list[TaskResponse])
def bulk_reorder(data: BulkReorder, db: Session = Depends(get_db)):
    """Bulk update task positions and statuses (for Kanban drag-and-drop)."""
    updated_tasks = []
    for item in data.tasks:
        task = db.query(Task).filter(Task.id == item.task_id).first()
        if task:
            task.status = item.new_status
            task.sort_order = item.new_sort_order
            updated_tasks.append(task)

    db.commit()
    for t in updated_tasks:
        db.refresh(t)

    return [_task_to_response(t) for t in updated_tasks]


@router.get("/stats/counts")
def task_counts(db: Session = Depends(get_db)):
    """Get task counts by status."""
    todo = db.query(Task).filter(Task.status == "todo").count()
    in_progress = db.query(Task).filter(Task.status == "in_progress").count()
    done = db.query(Task).filter(Task.status == "done").count()

    return {
        "todo": todo,
        "in_progress": in_progress,
        "done": done,
        "total": todo + in_progress + done,
    }


def _task_to_response(task: Task) -> dict:
    """Convert a Task ORM object to a response dict with deserialized fields."""
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "priority": task.priority,
        "status": task.status,
        "tags": task.tags_list,
        "due_date": task.due_date,
        "sort_order": task.sort_order,
        "total_time_seconds": task.total_time_seconds,
        "created_at": task.created_at,
        "updated_at": task.updated_at,
        "completed_at": task.completed_at,
    }
