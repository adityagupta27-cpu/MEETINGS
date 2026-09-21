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
            clean = clean.strip()
            if len(clean) > 25 and clean not in decisions and clean not in risks and clean not in unanswered_questions:
                # Filter out raw conversational fillers
                if not clean.lower().startswith(("hello", "hi ", "bye", "thanks", "thank you", "okay", "alright", "yes", "no")):
                    discussion_points.append(clean)
            if len(discussion_points) >= 6:
                break

        # 6. Executive Summary Synthesis
        participants_str = ", ".join(known_participants[:4]) if known_participants else "The project team"
        key_theme = discussion_points[0] if discussion_points else "the core sprint deliverables"
        summary_paragraphs = [
            f"{participants_str} convened on {base_date.isoformat()} to review {key_theme} and align on operational priorities.",
            f"Key progress was made with {len(decisions)} strategic decision(s) reached and {len(action_items)} high-priority action item(s) committed across the team.",
            "Potential risks and pending technical questions were cataloged to ensure proactive unblocking in the next iteration." if (risks or unanswered_questions) else "All items proceeded according to schedule with no major impediments reported."
        ]
        summary = " ".join(summary_paragraphs)

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
    Uses gemini-2.5-flash as primary model with fallback to gemini-flash-latest and MockAIService.
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
        participants_list = [p.strip() for p in (participants or []) if p.strip()]
        base_date = meeting_date or date.today()

        system_instruction = (
            "You are an executive-level AI Meeting Intelligence Specialist. "
            "Your objective is to produce comprehensive, articulate, and actionable executive meeting analyses from transcripts.\n\n"
            "STRICT GROUNDING & ANTI-HALLUCINATION RULES:\n"
            "1. Grounding: Rely strictly on the explicit content of the transcript. Never invent facts, promises, or dates.\n"
            f"2. Owner Assignment: Allowed attendees are strictly: {participants_list}. Only assign an action item owner if they explicitly match or correspond to one of these attendees. Otherwise, set owner to null.\n"
            "3. Due Dates: Extract explicitly mentioned dates (format as YYYY-MM-DD). If relative terms like 'tomorrow', 'Friday', or 'next week' are used, compute the date relative to the Meeting Date. If no timeline is mentioned, set due_date to null.\n"
            "4. Decisions: If no consensus or decision was finalized, return decisions as an empty list [].\n"
            "5. Quality & Tone: Summary should be an executive-grade narrative (2-3 detailed paragraphs) capturing meeting purpose, key deliberation dynamics, and alignment outcomes. Discussion points must be clear, well-articulated bullet points."
        )

        prompt = f"""
Meeting Date: {base_date.isoformat()}
Known Attendees: {json.dumps(participants_list)}

Meeting Transcript:
\"\"\"
{transcript}
\"\"\"

Produce a comprehensive, polished JSON output matching this exact structure:
{{
  "summary": "Executive-level narrative summary (2-3 paragraphs) detailing the meeting objectives, substantive deliberations, consensus reached, and strategic next steps.",
  "discussion_points": [
    "Comprehensive summary of topic 1 discussed",
    "Comprehensive summary of topic 2 discussed"
  ],
  "decisions": [
    "Concrete, finalized decision or agreement 1",
    "Concrete, finalized decision or agreement 2"
  ],
  "action_items": [
    {{
      "task": "Specific, actionable deliverable with clear scope",
      "owner": "Exact attendee name or null",
      "due_date": "YYYY-MM-DD or null",
      "priority": "low | medium | high",
      "status": "open"
    }}
  ],
  "risks": [
    "Explicit technical, architectural, timeline, or operational risk discussed"
  ],
  "unanswered_questions": [
    "Unresolved inquiry or question raised that remains to be followed up"
  ]
}}
"""

        # Models to try in order of priority
        candidate_models = ["gemini-2.5-flash", "gemini-flash-latest"]
        
        for model in candidate_models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.api_key}"
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "systemInstruction": {"parts": [{"text": system_instruction}]},
                "generationConfig": {
                    "response_mime_type": "application/json",
                    "temperature": 0.1
                }
            }

            try:
                with httpx.Client(timeout=30.0) as client:
                    response = client.post(url, json=payload)
                    if response.status_code == 200:
                        data = response.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            raw_text = candidates[0]["content"]["parts"][0]["text"]
                            parsed_json = json.loads(raw_text)
                            logger.info(f"Successfully generated AI analysis using {model}")
                            return AIAnalysisResponse.model_validate(parsed_json)
                    else:
                        logger.warning(f"Gemini model {model} returned status {response.status_code}: {response.text[:200]}")
            except Exception as e:
                logger.warning(f"Error calling Gemini model {model}: {str(e)[:150]}")

        logger.warning("All Gemini API models failed or were unavailable; falling back to Heuristic AI")
        return self.fallback.analyze_transcript(transcript, participants, meeting_date)

def get_ai_service() -> BaseAIService:
    api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
    if api_key.strip():
        return GeminiAIService(api_key.strip())
    return MockAIService()
