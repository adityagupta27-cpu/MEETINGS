import uuid
from datetime import datetime, timezone, date
from sqlalchemy import Column, String, Date, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class ActionItem(Base):
    __tablename__ = "action_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id = Column(String(36), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True)
    task = Column(Text, nullable=False)
    owner = Column(String(100), nullable=True)
    due_date = Column(Date, nullable=True)
    priority = Column(String(20), default="medium", nullable=False)  # low, medium, high
    status = Column(String(20), default="open", nullable=False)      # open, in_progress, blocked, completed
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    meeting = relationship("Meeting", back_populates="action_items")

    @property
    def is_overdue(self) -> bool:
        if self.due_date and self.status != "completed":
            return self.due_date < date.today()
        return False
