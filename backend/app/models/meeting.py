import uuid
from datetime import datetime, timezone, date
from sqlalchemy import Column, String, Date, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False, index=True)
    meeting_date = Column(Date, default=date.today, nullable=False)
    meeting_type = Column(String(50), default="Project Meeting", nullable=False)
    participants = Column(JSON, default=list, nullable=False)
    transcript = Column(Text, default="", nullable=False)
    summary = Column(Text, nullable=True)
    discussion_points = Column(JSON, default=list, nullable=True)
    decisions = Column(JSON, default=list, nullable=True)
    risks = Column(JSON, default=list, nullable=True)
    unanswered_questions = Column(JSON, default=list, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    user = relationship("User", back_populates="meetings")
    action_items = relationship(
        "ActionItem",
        back_populates="meeting",
        cascade="all, delete-orphan",
        order_by="ActionItem.created_at.desc()"
    )
