from typing import List
from pydantic import BaseModel
from app.schemas.meeting import MeetingListItem

class DashboardStatsResponse(BaseModel):
    total_meetings: int
    total_actions: int
    open_actions: int
    completed_actions: int
    overdue_actions: int
    recent_meetings: List[MeetingListItem]
