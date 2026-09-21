from datetime import date
from typing import List, Optional
from pydantic import BaseModel, Field

class AIActionItemSchema(BaseModel):
    task: str = Field(..., description="Actionable task statement grounded in transcript")
    owner: Optional[str] = Field(None, description="Responsible participant or null if unassigned")
    due_date: Optional[date] = Field(None, description="ISO-8601 target date or null if not explicitly stated")
    priority: str = Field("medium", pattern="^(low|medium|high)$")
    status: str = Field("open", pattern="^(open|in_progress|blocked|completed)$")

class AIAnalysisResponse(BaseModel):
    summary: str = Field(..., description="High-level meeting summary grounded strictly in transcript")
    discussion_points: List[str] = Field(default_factory=list, description="List of key discussion points")
    decisions: List[str] = Field(default_factory=list, description="Explicit decisions made during the meeting")
    action_items: List[AIActionItemSchema] = Field(default_factory=list, description="Extracted concrete action items")
    risks: List[str] = Field(default_factory=list, description="Identified risks, concerns, or potential bottlenecks")
    unanswered_questions: List[str] = Field(default_factory=list, description="Open questions left unanswered in the meeting")
