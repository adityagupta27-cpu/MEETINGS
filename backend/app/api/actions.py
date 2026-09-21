from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.meeting import Meeting
from app.models.action_item import ActionItem
from app.schemas.action_item import (
    ActionItemCreate,
    ActionItemUpdate,
    ActionItemResponse
)

router = APIRouter(prefix="/actions", tags=["Action Items"])

@router.get("", response_model=List[ActionItemResponse])
def list_actions(
    search: Optional[str] = Query(None, description="Search term for task, owner, or meeting title"),
    status: Optional[str] = Query(None, description="Filter by status (open, in_progress, blocked, completed)"),
    priority: Optional[str] = Query(None, description="Filter by priority (low, medium, high)"),
    owner: Optional[str] = Query(None, description="Filter by owner"),
    meeting_id: Optional[str] = Query(None, description="Filter by meeting ID"),
    is_overdue: Optional[bool] = Query(None, description="Filter for overdue tasks"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Join with Meeting to enforce user ownership
    query = db.query(ActionItem, Meeting.title.label("meeting_title")).join(
        Meeting, ActionItem.meeting_id == Meeting.id
    ).filter(Meeting.user_id == current_user.id)

    if meeting_id and meeting_id.strip():
        query = query.filter(ActionItem.meeting_id == meeting_id.strip())

    if status and status.strip():
        query = query.filter(ActionItem.status == status.strip().lower())

    if priority and priority.strip():
        query = query.filter(ActionItem.priority == priority.strip().lower())

    if owner and owner.strip():
        if owner.strip().lower() == "unassigned":
            query = query.filter(or_(ActionItem.owner == None, ActionItem.owner == "", ActionItem.owner.ilike("unassigned")))
        else:
            query = query.filter(ActionItem.owner.ilike(f"%{owner.strip()}%"))

    if is_overdue is not None:
        today = date.today()
        if is_overdue:
            query = query.filter(ActionItem.due_date < today, ActionItem.status != "completed")
        else:
            query = query.filter(or_(ActionItem.due_date >= today, ActionItem.due_date == None, ActionItem.status == "completed"))

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                ActionItem.task.ilike(term),
                ActionItem.owner.ilike(term),
                Meeting.title.ilike(term)
            )
        )

    results = query.order_by(ActionItem.due_date.asc().nullslast(), ActionItem.created_at.desc()).offset(skip).limit(limit).all()

    response_items = []
    for action, m_title in results:
        response_items.append(
            ActionItemResponse(
                id=action.id,
                meeting_id=action.meeting_id,
                meeting_title=m_title,
                task=action.task,
                owner=action.owner,
                due_date=action.due_date,
                priority=action.priority,
                status=action.status,
                is_overdue=action.is_overdue,
                created_at=action.created_at,
                updated_at=action.updated_at
            )
        )
    return response_items

@router.post("", response_model=ActionItemResponse, status_code=status.HTTP_201_CREATED)
def create_action(
    payload: ActionItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify meeting belongs to current user
    meeting = db.query(Meeting).filter(Meeting.id == payload.meeting_id, Meeting.user_id == current_user.id).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referenced meeting not found or access denied."
        )

    action = ActionItem(
        meeting_id=payload.meeting_id,
        task=payload.task.strip(),
        owner=payload.owner.strip() if payload.owner and payload.owner.strip() else None,
        due_date=payload.due_date,
        priority=payload.priority,
        status=payload.status
    )
    db.add(action)
    db.commit()
    db.refresh(action)

    return ActionItemResponse(
        id=action.id,
        meeting_id=action.meeting_id,
        meeting_title=meeting.title,
        task=action.task,
        owner=action.owner,
        due_date=action.due_date,
        priority=action.priority,
        status=action.status,
        is_overdue=action.is_overdue,
        created_at=action.created_at,
        updated_at=action.updated_at
    )

@router.put("/{id}", response_model=ActionItemResponse)
def update_action(
    id: str,
    payload: ActionItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    action_query = db.query(ActionItem, Meeting.title.label("meeting_title")).join(
        Meeting, ActionItem.meeting_id == Meeting.id
    ).filter(ActionItem.id == id, Meeting.user_id == current_user.id)

    item = action_query.first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Action item not found or access denied."
        )

    action, m_title = item

    if payload.task is not None:
        action.task = payload.task.strip()
    if payload.owner is not None:
        action.owner = payload.owner.strip() if payload.owner.strip() else None
    if payload.due_date is not None:
        action.due_date = payload.due_date
    if payload.priority is not None:
        action.priority = payload.priority
    if payload.status is not None:
        action.status = payload.status

    db.commit()
    db.refresh(action)

    return ActionItemResponse(
        id=action.id,
        meeting_id=action.meeting_id,
        meeting_title=m_title,
        task=action.task,
        owner=action.owner,
        due_date=action.due_date,
        priority=action.priority,
        status=action.status,
        is_overdue=action.is_overdue,
        created_at=action.created_at,
        updated_at=action.updated_at
    )

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_action(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    action = db.query(ActionItem).join(
        Meeting, ActionItem.meeting_id == Meeting.id
    ).filter(ActionItem.id == id, Meeting.user_id == current_user.id).first()

    if not action:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Action item not found or access denied."
        )

    db.delete(action)
    db.commit()
    return None
