from datetime import date, timedelta

def test_dashboard_stats(client, auth_user):
    # Initial empty state
    stats = client.get("/api/dashboard/stats", cookies=auth_user["cookies"]).json()
    assert stats["total_meetings"] == 0
    assert stats["total_actions"] == 0
    assert stats["open_actions"] == 0
    assert stats["completed_actions"] == 0
    assert stats["overdue_actions"] == 0
    assert stats["recent_meetings"] == []

    # Create 2 meetings
    m1 = client.post("/api/meetings", json={
        "title": "Roadmap Session",
        "meeting_date": "2026-09-18",
        "meeting_type": "Project Meeting",
        "participants": ["Alice"],
        "transcript": "Content"
    }, cookies=auth_user["cookies"]).json()

    m2 = client.post("/api/meetings", json={
        "title": "Customer Review",
        "meeting_date": "2026-09-19",
        "meeting_type": "Client Meeting",
        "participants": ["Bob"],
        "transcript": "Content"
    }, cookies=auth_user["cookies"]).json()

    # Add 1 open action (not overdue)
    client.post("/api/actions", json={
        "meeting_id": m1["id"],
        "task": "Active task",
        "due_date": (date.today() + timedelta(days=5)).isoformat(),
        "status": "open"
    }, cookies=auth_user["cookies"])

    # Add 1 completed action
    client.post("/api/actions", json={
        "meeting_id": m1["id"],
        "task": "Done task",
        "due_date": (date.today() - timedelta(days=1)).isoformat(),
        "status": "completed"
    }, cookies=auth_user["cookies"])

    # Add 1 overdue action
    client.post("/api/actions", json={
        "meeting_id": m2["id"],
        "task": "Overdue task",
        "due_date": (date.today() - timedelta(days=2)).isoformat(),
        "status": "open"
    }, cookies=auth_user["cookies"])

    # Query dashboard stats
    stats_updated = client.get("/api/dashboard/stats", cookies=auth_user["cookies"]).json()
    assert stats_updated["total_meetings"] == 2
    assert stats_updated["total_actions"] == 3
    assert stats_updated["open_actions"] == 2
    assert stats_updated["completed_actions"] == 1
    assert stats_updated["overdue_actions"] == 1
    assert len(stats_updated["recent_meetings"]) == 2
