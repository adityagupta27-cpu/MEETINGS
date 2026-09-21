from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class ActionItemBase(BaseModel):
    task: str = Field(..., min_length=1)
    owner: Optional[str] = None
    due_date: Optional[date] = None
    priority: str = Field("medium", pattern="^(low|medium|high)$")
    status: str = Field("open", pattern="^(open|in_progress|blocked|completed)$")

class ActionItemCreate(ActionItemBase):
    meeting_id: str

class ActionItemUpdate(BaseModel):
    task: Optional[str] = None
    owner: Optional[str] = None
    due_date: Optional[date] = None
    priority: Optional[str] = Field(None, pattern="^(low|medium|high)$")
    status: Optional[str] = Field(None, pattern="^(open|in_progress|blocked|completed)$")

class ActionItemResponse(BaseModel):
    id: str
    meeting_id: str
    meeting_title: Optional[str] = None
    task: str
    owner: Optional[str] = None
    due_date: Optional[date] = None
    priority: str
    status: str
    is_overdue: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
