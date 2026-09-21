import os
import re
import json
import logging
from abc import ABC, abstractmethod
from datetime import date, timedelta
from typing import List, Optional
import httpx

from app.core.config import settings
from app.schemas.ai import AIAnalysisResponse, AIActionItemSchema

logger = logging.getLogger("ai_service")

class BaseAIService(ABC):
    @abstractmethod
    def analyze_transcript(
        self,
        transcript: str,
        participants: Optional[List[str]] = None,
        meeting_date: Optional[date] = None
    ) -> AIAnalysisResponse:
        pass

class MockAIService(BaseAIService):
    """
    High-fidelity heuristic AI provider that operates fully offline with 0 external API dependencies.
    Strictly follows anti-hallucination guardrails:
    - Never fabricates decisions, owners, or due dates.
    - Maps owners strictly to supplied participants list or leaves owner as None.
    - Extracts only dates explicitly mentioned or anchored to meeting_date.
    """
    def analyze_transcript(
        self,
        transcript: str,
        participants: Optional[List[str]] = None,
        meeting_date: Optional[date] = None
    ) -> AIAnalysisResponse:
        if not transcript or not transcript.strip():
            return AIAnalysisResponse(
                summary="No transcript content provided for analysis.",
                discussion_points=[],
                decisions=[],
                action_items=[],
                risks=[],
                unanswered_questions=[]
            )

        known_participants = [p.strip() for p in (participants or []) if p.strip()]
        base_date = meeting_date or date.today()

        lines = [line.strip() for line in transcript.split("\n") if line.strip()]

        # 1. Key Decisions extraction (explicit consensus/decision keywords)
        decisions: List[str] = []
        decision_keywords = [
            "decided to", "we decided", "decision:", "agreed on", "agreed to",
            "agreed that", "consensus was", "approved", "going with", "resolved to"
        ]
        for line in lines:
            clean = re.sub(r"^[A-Za-z0-9_\-\s]{1,30}:\s*", "", line)
            lower = clean.lower()
            if any(kw in lower for kw in decision_keywords):
                # Clean prefix
                statement = clean
                for kw in decision_keywords:
                    idx = statement.lower().find(kw)
                    if idx != -1:
                        statement = statement[idx:]
                        break
                decisions.append(statement[0].upper() + statement[1:])

        # 2. Risks / Concerns extraction
        risks: List[str] = []
        risk_keywords = [
            "risk", "concern", "worry", "bottleneck", "blocker", "latency issue",
            "security issue", "delay", "vulnerability", "failure point", "threat"
        ]
        for line in lines:
            clean = re.sub(r"^[A-Za-z0-9_\-\s]{1,30}:\s*", "", line)
            lower = clean.lower()
            if any(kw in lower for kw in risk_keywords):
                risks.append(clean[0].upper() + clean[1:] if clean else clean)

        # 3. Unanswered questions extraction
        unanswered_questions: List[str] = []
        for line in lines:
            clean = re.sub(r"^[A-Za-z0-9_\-\s]{1,30}:\s*", "", line)
            lower = clean.lower()
            if "?" in clean or lower.startswith(("how will", "what if", "who is going to", "when will", "why")):
                unanswered_questions.append(clean[0].upper() + clean[1:] if clean else clean)

        # 4. Action items extraction (Anti-hallucination: owner must match participants or be None)
        action_items: List[AIActionItemSchema] = []
        action_indicators = [
            "will", "action item:", "action:", "todo:", "task:", "implement",
            "assign", "follow up on", "needs to", "i'll", "i can"
        ]

        seen_tasks = set()
        for line in lines:
            speaker_match = re.match(r"^([A-Za-z0-9_\-\s]{1,30}):\s*(.*)", line)
            speaker = speaker_match.group(1).strip() if speaker_match else None
            content = speaker_match.group(2).strip() if speaker_match else line
            lower_content = content.lower()

            if any(trig in lower_content for trig in action_indicators):
                task_text = content
                if task_text.lower().startswith(("action item:", "todo:", "task:")):
                    task_text = re.sub(r"^(action item:|todo:|task:)\s*", "", task_text, flags=re.IGNORECASE)

                if task_text in seen_tasks:
                    continue
                seen_tasks.add(task_text)

                # Strict Owner Resolution: Must match known_participants or be None
                owner = None
                # Check for explicit participant name mentions in content
                for p in known_participants:
                    if re.search(rf"\b{re.escape(p)}\b", content, re.IGNORECASE):
                        owner = p
                        break

                # If first-person commitment ("I will", "I'll", "I can") and speaker is known
                if not owner and speaker and speaker in known_participants:
                    if any(fp in lower_content for fp in ["i will", "i'll", "i can", "i'm going to"]):
                        owner = speaker

                # Due Date Resolution: Only explicit or relative anchors
                due_date: Optional[date] = None
                date_match = re.search(r"\b(\d{4}-\d{2}-\d{2})\b", content)
                if date_match:
                    try:
                        due_date = date.fromisoformat(date_match.group(1))
                    except ValueError:
                        due_date = None
                elif "by tomorrow" in lower_content:
                    due_date = base_date + timedelta(days=1)
                elif "by friday" in lower_content:
                    days_ahead = (4 - base_date.weekday()) % 7
                    due_date = base_date + timedelta(days=days_ahead if days_ahead > 0 else 7)
                elif "by end of week" in lower_content or "end of this week" in lower_content:
                    days_ahead = (4 - base_date.weekday()) % 7
                    due_date = base_date + timedelta(days=days_ahead if days_ahead > 0 else 7)
                elif "by next week" in lower_content:
                    due_date = base_date + timedelta(days=7)
                elif "today" in lower_content:
                    due_date = base_date

                # Priority Resolution
                priority = "medium"
                if any(kw in lower_content for kw in ["urgent", "critical", "blocker", "asap", "high priority", "p0"]):
                    priority = "high"
                elif any(kw in lower_content for kw in ["low priority", "optional", "nice to have", "minor", "p2"]):
                    priority = "low"

                action_items.append(
                    AIActionItemSchema(
                        task=task_text,
                        owner=owner,
                        due_date=due_date,
                        priority=priority,
                        status="open"
                    )
                )

        # 5. Discussion Points
        discussion_points: List[str] = []
        for line in lines:
            clean = re.sub(r"^[A-Za-z0-9_\-\s]{1,30}:\s*", "", line)
            if len(clean) > 20 and clean not in decisions and clean not in risks and clean not in unanswered_questions:
                discussion_points.append(clean)
            if len(discussion_points) >= 6:
                break

        # 6. Executive Summary Synthesis
        participants_str = ", ".join(known_participants[:4]) if known_participants else "The team"
        topics_str = f"focusing on {discussion_points[0].lower()}" if discussion_points else "reviewing key project items"
        summary = (
            f"{participants_str} met on {base_date.isoformat()} {topics_str}. "
            f"The team finalized {len(decisions)} key decision(s) and assigned {len(action_items)} action item(s). "
            f"{'Identified risks and unanswered questions were flagged for team follow-up.' if (risks or unanswered_questions) else 'No major blockers were identified.'}"
        )

        return AIAnalysisResponse(
            summary=summary,
            discussion_points=discussion_points[:6],
            decisions=decisions[:5],
            action_items=action_items[:10],
            risks=risks[:5],
            unanswered_questions=unanswered_questions[:5]
        )

class GeminiAIService(BaseAIService):
    """
    Live AI service integration with Google Gemini REST API.
    Falls back gracefully to MockAIService if the API call encounters quota limits, network issues, or invalid keys.
    """
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.fallback = MockAIService()

    def analyze_transcript(
        self,
        transcript: str,
        participants: Optional[List[str]] = None,
        meeting_date: Optional[date] = None
    ) -> AIAnalysisResponse:
        participants_list = participants or []
        base_date = meeting_date or date.today()

        system_instruction = (
            "You are an expert AI meeting analyst. Analyze the provided meeting transcript strictly and faithfully.\n"
            "Guardrails:\n"
            "- Use ONLY facts stated in the transcript.\n"
            "- Do NOT invent decisions, owners, commitments, dates, or details.\n"
            f"- Allowed participants list: {participants_list}. If an owner is not clearly stated or not in this list, set owner to null.\n"
            "- If a due date is not explicitly mentioned or clearly anchored, set due_date to null.\n"
            "- If no decisions were made, return decisions as an empty list [].\n"
            "- Return a valid JSON object matching the exact schema."
        )

        prompt = f"""
Meeting Date: {base_date.isoformat()}
Known Participants: {json.dumps(participants_list)}

Transcript:
\"\"\"
{transcript}
\"\"\"

Return ONLY a JSON object matching this schema:
{{
  "summary": "Concise executive summary grounded in transcript",
  "discussion_points": ["point 1", "point 2"],
  "decisions": ["decision 1"],
  "action_items": [
    {{
      "task": "Specific actionable task",
      "owner": "Participant Name or null",
      "due_date": "YYYY-MM-DD or null",
      "priority": "low | medium | high",
      "status": "open"
    }}
  ],
  "risks": ["identified risk or concern"],
  "unanswered_questions": ["open unresolved question"]
}}
"""

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "systemInstruction": {"parts": [{"text": system_instruction}]},
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.1
            }
        }

        try:
            with httpx.Client(timeout=15.0) as client:
                response = client.post(url, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        raw_text = candidates[0]["content"]["parts"][0]["text"]
                        parsed_json = json.loads(raw_text)
                        return AIAnalysisResponse.model_validate(parsed_json)
                logger.warning(f"Gemini API returned status {response.status_code}, falling back to Heuristic AI")
        except Exception as e:
            logger.warning(f"Error calling Gemini API: {str(e)[:100]}, falling back to Heuristic AI")

        # Graceful fallback to heuristic mock
        return self.fallback.analyze_transcript(transcript, participants, meeting_date)

def get_ai_service() -> BaseAIService:
    api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
    if api_key.strip():
        return GeminiAIService(api_key.strip())
    return MockAIService()
