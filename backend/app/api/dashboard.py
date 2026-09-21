from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.meeting import Meeting
from app.models.action_item import ActionItem
from app.schemas.dashboard import DashboardStatsResponse
from app.schemas.meeting import MeetingListItem

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    today = date.today()

    # 1. Total meetings for current user
    total_meetings = db.query(Meeting).filter(Meeting.user_id == current_user.id).count()

    # 2. Total action items belonging to current user's meetings
    actions_query = db.query(ActionItem).join(Meeting, ActionItem.meeting_id == Meeting.id).filter(Meeting.user_id == current_user.id)
    all_actions = actions_query.all()

    total_actions = len(all_actions)
    open_actions = sum(1 for a in all_actions if a.status != "completed")
    completed_actions = sum(1 for a in all_actions if a.status == "completed")
    overdue_actions = sum(1 for a in all_actions if a.due_date and a.due_date < today and a.status != "completed")

    # 3. Recent 5 meetings
    recent_db_meetings = db.query(Meeting).filter(
        Meeting.user_id == current_user.id
    ).order_by(Meeting.meeting_date.desc(), Meeting.created_at.desc()).limit(5).all()

    recent_meetings = []
    for m in recent_db_meetings:
        recent_meetings.append(
            MeetingListItem(
                id=m.id,
                title=m.title,
                meeting_date=m.meeting_date,
                meeting_type=m.meeting_type,
                participants=m.participants or [],
                summary=m.summary,
                action_item_count=len(m.action_items),
                open_action_count=sum(1 for a in m.action_items if a.status != "completed"),
                created_at=m.created_at,
                updated_at=m.updated_at
            )
        )

    return DashboardStatsResponse(
        total_meetings=total_meetings,
        total_actions=total_actions,
        open_actions=open_actions,
        completed_actions=completed_actions,
        overdue_actions=overdue_actions,
        recent_meetings=recent_meetings
    )
