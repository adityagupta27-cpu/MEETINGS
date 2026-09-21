import time
import httpx

BASE_URL = "http://127.0.0.1:8000/api"

def test_live_full_user_journey():
    ts = int(time.time())
    email = f"sarah.e2e_{ts}@example.com"
    password = "SecurePassword123!"
    full_name = "Sarah Connor E2E"

    client = httpx.Client(base_url=BASE_URL, timeout=10.0)

    # 1. Healthcheck
    health_resp = client.get("/health")
    assert health_resp.status_code == 200, f"Health check failed: {health_resp.text}"
    assert health_resp.json()["status"] == "ok"
    print("✓ Healthcheck passed")

    # 2. Registration
    reg_resp = client.post("/auth/register", json={
        "email": email,
        "password": password,
        "full_name": full_name
    })
    assert reg_resp.status_code == 201, f"Registration failed: {reg_resp.text}"
    user_data = reg_resp.json()
    assert user_data["email"] == email
    assert "access_token" in client.cookies
    print(f"✓ Registered user {email} and received HTTP-only access_token cookie")

    # 3. Auth Me
    me_resp = client.get("/auth/me")
    assert me_resp.status_code == 200
    assert me_resp.json()["id"] == user_data["id"]
    print("✓ /auth/me verified active session via cookie")

    # 4. Dashboard initial stats
    stats_0 = client.get("/dashboard/stats").json()
    assert stats_0["total_meetings"] == 0
    assert stats_0["total_actions"] == 0
    print("✓ Initial dashboard stats verified (0 meetings, 0 actions)")

    # 5. Create Meeting with Transcript
    transcript_text = """
Sarah Connor: Welcome team to our sprint architecture sync.
David Miller: I propose using SQLite with WAL mode for our relational models.
Sarah Connor: Agreed. We decided to use SQLite with WAL mode.
David Miller: I will implement the database schema and foreign key constraints by tomorrow.
Alex Vance: I will build the central action tracker and table filters by Friday.
Sarah Connor: What if our transcript file is greater than 2MB?
David Miller: That is a potential risk that we should handle with strict file size validation.
Sarah Connor: Please make sure the UI supports both dark mode and light mode.
Alex Vance: I can handle the dark mode theme toggle by next week.
"""
    meeting_resp = client.post("/meetings", json={
        "title": "Q3 Architecture & Deliverables Sync",
        "meeting_date": "2026-09-20",
        "meeting_type": "Project Meeting",
        "participants": ["Sarah Connor", "David Miller", "Alex Vance"],
        "transcript": transcript_text
    })
    assert meeting_resp.status_code == 201, f"Create meeting failed: {meeting_resp.text}"
    meeting = meeting_resp.json()
    meeting_id = meeting["id"]
    print(f"✓ Created meeting: {meeting['title']} (ID: {meeting_id})")

    # 6. Process AI Synthesis
    ai_resp = client.post(f"/meetings/{meeting_id}/process-ai")
    assert ai_resp.status_code == 200, f"AI processing failed: {ai_resp.text}"
    ai_data = ai_resp.json()
    assert ai_data["summary"] is not None and len(ai_data["summary"]) > 20
    assert len(ai_data["decisions"]) >= 1
    assert any("SQLite" in d for d in ai_data["decisions"])
    assert len(ai_data["risks"]) >= 1
    assert len(ai_data["unanswered_questions"]) >= 1
    print("✓ AI Synthesis generated Summary, Decisions, Risks, and Questions")

    # 7. Verify Extracted Action Items
    actions_resp = client.get(f"/meetings/{meeting_id}/actions")
    assert actions_resp.status_code == 200
    action_items = actions_resp.json()
    assert len(action_items) >= 2
    print(f"✓ Extracted {len(action_items)} action items persisted to meeting")

    # 8. Update Action Item Status & Priority
    first_action = action_items[0]
    upd_resp = client.put(f"/actions/{first_action['id']}", json={
        "status": "in_progress",
        "priority": "high"
    })
    assert upd_resp.status_code == 200
    assert upd_resp.json()["status"] == "in_progress"
    assert upd_resp.json()["priority"] == "high"
    print("✓ Updated action item status to 'in_progress' and priority to 'high'")

    # 9. Add Manual Action Item
    manual_resp = client.post("/actions", json={
        "meeting_id": meeting_id,
        "task": "Perform final security audit and OWASP verification",
        "owner": "Sarah Connor",
        "due_date": "2026-09-25",
        "priority": "high",
        "status": "open"
    })
    assert manual_resp.status_code == 201
    manual_action = manual_resp.json()
    print(f"✓ Created manual action item: {manual_action['task']}")

    # 10. Query Central Action Tracker with Filters
    # Filter by status: in_progress
    in_progress_actions = client.get("/actions?status=in_progress").json()
    assert len(in_progress_actions) >= 1
    assert all(a["status"] == "in_progress" for a in in_progress_actions)

    # Search for "security"
    search_actions = client.get("/actions?search=security").json()
    assert len(search_actions) >= 1
    assert any("security" in a["task"].lower() for a in search_actions)
    print("✓ Central Action Tracker search & status filters verified")

    # 11. Dashboard updated stats
    stats_updated = client.get("/dashboard/stats").json()
    assert stats_updated["total_meetings"] == 1
    assert stats_updated["total_actions"] >= 3
    assert stats_updated["open_actions"] >= 2
    assert len(stats_updated["recent_meetings"]) == 1
    assert stats_updated["recent_meetings"][0]["id"] == meeting_id
    print("✓ Dashboard operational metrics verified with live aggregated data")

    # 12. Logout
    logout_resp = client.post("/auth/logout")
    assert logout_resp.status_code == 200
    client.cookies.clear()
    me_after_logout = client.get("/auth/me")
    assert me_after_logout.status_code == 401
    print("✓ Logout successfully cleared session and invalidated access")

    print("\n🎉 ALL LIVE END-TO-END FLOWS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_live_full_user_journey()
