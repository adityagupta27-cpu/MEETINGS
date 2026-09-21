from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.meeting import Meeting
from app.models.action_item import ActionItem
from app.schemas.meeting import (
    MeetingCreate,
    MeetingUpdate,
    MeetingResponse,
    MeetingListItem,
    TranscriptInput
)
from app.schemas.action_item import ActionItemResponse
from app.services.ai_service import get_ai_service

router = APIRouter(prefix="/meetings", tags=["Meetings"])

@router.get("", response_model=List[MeetingListItem])
def list_meetings(
    search: Optional[str] = Query(None, description="Search term for title or transcript"),
    meeting_type: Optional[str] = Query(None, description="Filter by meeting type"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Meeting).filter(Meeting.user_id == current_user.id)

    if meeting_type and meeting_type.strip():
        query = query.filter(Meeting.meeting_type == meeting_type.strip())

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Meeting.title.ilike(term),
                Meeting.transcript.ilike(term),
                Meeting.summary.ilike(term)
            )
        )

    meetings = query.order_by(Meeting.meeting_date.desc(), Meeting.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for m in meetings:
        total_actions = len(m.action_items)
        open_actions = sum(1 for a in m.action_items if a.status != "completed")
        result.append(
            MeetingListItem(
                id=m.id,
                title=m.title,
                meeting_date=m.meeting_date,
                meeting_type=m.meeting_type,
                participants=m.participants or [],
                summary=m.summary,
                action_item_count=total_actions,
                open_action_count=open_actions,
                created_at=m.created_at,
                updated_at=m.updated_at
            )
        )
    return result

@router.post("", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
def create_meeting(
    payload: MeetingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    meeting = Meeting(
        user_id=current_user.id,
        title=payload.title.strip(),
        meeting_date=payload.meeting_date,
        meeting_type=payload.meeting_type.strip(),
        participants=[p.strip() for p in payload.participants if p.strip()],
        transcript=payload.transcript.strip()
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting

@router.get("/{id}", response_model=MeetingResponse)
def get_meeting(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    meeting = db.query(Meeting).filter(Meeting.id == id, Meeting.user_id == current_user.id).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found."
        )
    return meeting

@router.put("/{id}", response_model=MeetingResponse)
def update_meeting(
    id: str,
    payload: MeetingUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    meeting = db.query(Meeting).filter(Meeting.id == id, Meeting.user_id == current_user.id).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found."
        )

    if payload.title is not None:
        meeting.title = payload.title.strip()
    if payload.meeting_date is not None:
        meeting.meeting_date = payload.meeting_date
    if payload.meeting_type is not None:
        meeting.meeting_type = payload.meeting_type.strip()
    if payload.participants is not None:
        meeting.participants = [p.strip() for p in payload.participants if p.strip()]
    if payload.transcript is not None:
        meeting.transcript = payload.transcript.strip()
    if payload.summary is not None:
        meeting.summary = payload.summary
    if payload.discussion_points is not None:
        meeting.discussion_points = payload.discussion_points
    if payload.decisions is not None:
        meeting.decisions = payload.decisions
    if payload.risks is not None:
        meeting.risks = payload.risks
    if payload.unanswered_questions is not None:
        meeting.unanswered_questions = payload.unanswered_questions

    db.commit()
    db.refresh(meeting)
    return meeting

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meeting(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    meeting = db.query(Meeting).filter(Meeting.id == id, Meeting.user_id == current_user.id).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found."
        )
    db.delete(meeting)
    db.commit()
    return None

@router.post("/{id}/transcript", response_model=MeetingResponse)
async def update_meeting_transcript(
    id: str,
    payload: Optional[TranscriptInput] = None,
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    meeting = db.query(Meeting).filter(Meeting.id == id, Meeting.user_id == current_user.id).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found."
        )

    transcript_text = ""
    if file:
        # Validate filename and extension
        if not file.filename or not file.filename.lower().endswith(".txt"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only plain-text (.txt) transcript files are supported."
            )
        
        # Read contents with max 2MB size limit
        content = await file.read()
        if len(content) > 2 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size exceeds the 2MB limit."
            )
        
        if not content or len(content.strip()) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded transcript file is empty."
            )

        try:
            transcript_text = content.decode("utf-8").strip()
        except UnicodeDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Transcript file must be valid UTF-8 encoded text."
            )
    elif payload and payload.transcript:
        transcript_text = payload.transcript.strip()
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No transcript text or file was provided."
        )

    if not transcript_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transcript cannot be empty."
        )

    meeting.transcript = transcript_text
    db.commit()
    db.refresh(meeting)
    return meeting

@router.post("/{id}/process-ai", response_model=MeetingResponse)
def process_ai(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    meeting = db.query(Meeting).filter(Meeting.id == id, Meeting.user_id == current_user.id).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found."
        )

    if not meeting.transcript or not meeting.transcript.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Meeting has no transcript to analyze. Please upload or paste a transcript first."
        )

    ai_service = get_ai_service()
    ai_result = ai_service.analyze_transcript(
        transcript=meeting.transcript,
        participants=meeting.participants,
        meeting_date=meeting.meeting_date
    )

    # Persist structured synthesis
    meeting.summary = ai_result.summary
    meeting.discussion_points = ai_result.discussion_points
    meeting.decisions = ai_result.decisions
    meeting.risks = ai_result.risks
    meeting.unanswered_questions = ai_result.unanswered_questions

    # Persist action items: avoid duplicating tasks if user regenerates
    # We add newly extracted action items that do not yet exist
    existing_tasks = {a.task.strip().lower() for a in meeting.action_items}
    for item in ai_result.action_items:
        if item.task.strip().lower() not in existing_tasks:
            action_item = ActionItem(
                meeting_id=meeting.id,
                task=item.task.strip(),
                owner=item.owner.strip() if item.owner else None,
                due_date=item.due_date,
                priority=item.priority,
                status=item.status
            )
            db.add(action_item)

    db.commit()
    db.refresh(meeting)
    return meeting

@router.get("/{id}/actions", response_model=List[ActionItemResponse])
def get_meeting_actions(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    meeting = db.query(Meeting).filter(Meeting.id == id, Meeting.user_id == current_user.id).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found."
        )
    
    actions = []
    for a in meeting.action_items:
        actions.append(
            ActionItemResponse(
                id=a.id,
                meeting_id=a.meeting_id,
                meeting_title=meeting.title,
                task=a.task,
                owner=a.owner,
                due_date=a.due_date,
                priority=a.priority,
                status=a.status,
                is_overdue=a.is_overdue,
                created_at=a.created_at,
                updated_at=a.updated_at
            )
        )
    return actions
