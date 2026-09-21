from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.action_item import ActionItemResponse

class MeetingCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    meeting_date: date
    meeting_type: str = Field("Project Meeting", max_length=50)
    participants: List[str] = Field(default_factory=list)
    transcript: str = Field("", description="Raw meeting transcript")

class MeetingUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    meeting_date: Optional[date] = None
    meeting_type: Optional[str] = None
    participants: Optional[List[str]] = None
    transcript: Optional[str] = None
    summary: Optional[str] = None
    discussion_points: Optional[List[str]] = None
    decisions: Optional[List[str]] = None
    risks: Optional[List[str]] = None
    unanswered_questions: Optional[List[str]] = None

class MeetingResponse(BaseModel):
    id: str
    user_id: str
    title: str
    meeting_date: date
    meeting_type: str
    participants: List[str]
    transcript: str
    summary: Optional[str] = None
    discussion_points: Optional[List[str]] = None
    decisions: Optional[List[str]] = None
    risks: Optional[List[str]] = None
    unanswered_questions: Optional[List[str]] = None
    created_at: datetime
    updated_at: datetime
    action_items: List[ActionItemResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

class MeetingListItem(BaseModel):
    id: str
    title: str
    meeting_date: date
    meeting_type: str
    participants: List[str]
    summary: Optional[str] = None
    action_item_count: int = 0
    open_action_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TranscriptInput(BaseModel):
    transcript: str = Field(..., min_length=1)
