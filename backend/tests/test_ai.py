from datetime import date
from app.services.ai_service import MockAIService

def test_ai_processing_endpoint(client, auth_user):
    transcript_text = """
Sarah: Welcome everyone. We need to decide on our database strategy.
David: I propose SQLite with WAL mode for zero-latency local operations.
Sarah: Agreed. We decided to use SQLite with WAL mode.
David: I will implement the database connection pooling and schema migrations by tomorrow.
Sarah: What if our database file grows larger than 5GB?
David: That is a potential risk if high concurrent writes occur.
Sarah: What is our exact timeline for multi-region backups? We need to follow up on this later.
David: Let's table that question for our next meeting.
Sarah: I can handle the frontend React components by Friday.
"""
    meeting = client.post("/api/meetings", json={
        "title": "Architecture Alignment",
        "meeting_date": "2026-09-20",
        "meeting_type": "Project Meeting",
        "participants": ["Sarah", "David"],
        "transcript": transcript_text
    }, cookies=auth_user["cookies"]).json()

    res = client.post(f"/api/meetings/{meeting['id']}/process-ai", cookies=auth_user["cookies"])
    assert res.status_code == 200
    data = res.json()
    assert data["summary"] is not None
    assert len(data["decisions"]) >= 1
    assert any("SQLite" in d for d in data["decisions"])
    assert len(data["risks"]) >= 1
    assert len(data["unanswered_questions"]) >= 1
    assert len(data["action_items"]) >= 1

    # Check that action items were stored
    actions_res = client.get(f"/api/meetings/{meeting['id']}/actions", cookies=auth_user["cookies"])
    assert actions_res.status_code == 200
    action_items = actions_res.json()
    assert len(action_items) >= 2
    tasks = [a["task"].lower() for a in action_items]
    assert any("implement" in t for t in tasks)
    owners = [a["owner"] for a in action_items if a["owner"]]
    assert "David" in owners or "Sarah" in owners

def test_ai_missing_transcript_error(client, auth_user):
    meeting = client.post("/api/meetings", json={
        "title": "Empty Meeting",
        "meeting_date": "2026-09-20",
        "meeting_type": "Other",
        "participants": [],
        "transcript": ""
    }, cookies=auth_user["cookies"]).json()

    res = client.post(f"/api/meetings/{meeting['id']}/process-ai", cookies=auth_user["cookies"])
    assert res.status_code == 400
    assert "no transcript" in res.json()["detail"].lower()

def test_mock_ai_anti_hallucination_rules():
    service = MockAIService()

    # Transcript with NO decisions, NO participants, and missing dates
    transcript = "Just casual chatter between two anonymous people about the weather."
    result = service.analyze_transcript(transcript, participants=[], meeting_date=date(2026, 9, 20))

    assert result.decisions == []
    assert result.risks == []
    assert result.unanswered_questions == []
    assert result.action_items == []
