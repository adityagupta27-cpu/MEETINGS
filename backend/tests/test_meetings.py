import io

def test_create_and_get_meeting(client, auth_user):
    create_payload = {
        "title": "Sprint 14 Planning",
        "meeting_date": "2026-09-20",
        "meeting_type": "Project Meeting",
        "participants": ["Alice", "Bob", "Charlie"],
        "transcript": "Alice: Welcome team. We will plan sprint 14 today."
    }
    res = client.post("/api/meetings", json=create_payload, cookies=auth_user["cookies"])
    assert res.status_code == 201
    meeting_id = res.json()["id"]
    assert res.json()["title"] == "Sprint 14 Planning"
    assert res.json()["participants"] == ["Alice", "Bob", "Charlie"]

    # Retrieve meeting
    get_res = client.get(f"/api/meetings/{meeting_id}", cookies=auth_user["cookies"])
    assert get_res.status_code == 200
    assert get_res.json()["id"] == meeting_id

def test_meeting_ownership_isolation(client, auth_user, second_user):
    # User 1 creates meeting
    create_res = client.post("/api/meetings", json={
        "title": "Confidential Strategy Session",
        "meeting_date": "2026-09-20",
        "meeting_type": "Client Meeting",
        "participants": ["Alice"],
        "transcript": "Confidential transcript details"
    }, cookies=auth_user["cookies"])
    meeting_id = create_res.json()["id"]

    # User 2 attempts to read User 1's meeting -> 404
    read_res = client.get(f"/api/meetings/{meeting_id}", cookies=second_user["cookies"])
    assert read_res.status_code == 404

    # User 2 attempts to update User 1's meeting -> 404
    update_res = client.put(f"/api/meetings/{meeting_id}", json={
        "title": "Hacked Title"
    }, cookies=second_user["cookies"])
    assert update_res.status_code == 404

    # User 2 attempts to delete User 1's meeting -> 404
    del_res = client.delete(f"/api/meetings/{meeting_id}", cookies=second_user["cookies"])
    assert del_res.status_code == 404

def test_meeting_search_and_filter(client, auth_user):
    client.post("/api/meetings", json={
        "title": "Quarterly Sales Review",
        "meeting_date": "2026-09-18",
        "meeting_type": "Sales Meeting",
        "participants": ["Sarah", "Dan"],
        "transcript": "Sales figures grew by 20% this quarter."
    }, cookies=auth_user["cookies"])

    client.post("/api/meetings", json={
        "title": "Architecture Redesign",
        "meeting_date": "2026-09-19",
        "meeting_type": "Project Meeting",
        "participants": ["Sarah", "Sam"],
        "transcript": "Switching our microservices to a modular monolith."
    }, cookies=auth_user["cookies"])

    # Search for "Sales"
    search_res = client.get("/api/meetings?search=Sales", cookies=auth_user["cookies"])
    assert search_res.status_code == 200
    assert len(search_res.json()) == 1
    assert search_res.json()[0]["title"] == "Quarterly Sales Review"

    # Filter by meeting_type "Project Meeting"
    filter_res = client.get("/api/meetings?meeting_type=Project Meeting", cookies=auth_user["cookies"])
    assert filter_res.status_code == 200
    assert len(filter_res.json()) == 1
    assert filter_res.json()[0]["title"] == "Architecture Redesign"

def test_transcript_file_upload(client, auth_user):
    meeting = client.post("/api/meetings", json={
        "title": "Transcript Test Meeting",
        "meeting_date": "2026-09-20",
        "meeting_type": "Internal Meeting",
        "participants": ["Alice"],
        "transcript": ""
    }, cookies=auth_user["cookies"]).json()

    file_content = b"Alice: We agreed to launch the new billing feature on Friday."
    files = {"file": ("transcript.txt", io.BytesIO(file_content), "text/plain")}
    res = client.post(f"/api/meetings/{meeting['id']}/transcript", files=files, cookies=auth_user["cookies"])
    assert res.status_code == 200
    assert res.json()["transcript"] == "Alice: We agreed to launch the new billing feature on Friday."

def test_transcript_file_upload_invalid_extension(client, auth_user):
    meeting = client.post("/api/meetings", json={
        "title": "File Ext Test",
        "meeting_date": "2026-09-20",
        "meeting_type": "Internal Meeting",
        "participants": ["Alice"],
        "transcript": ""
    }, cookies=auth_user["cookies"]).json()

    files = {"file": ("script.py", io.BytesIO(b"print('hack')"), "text/x-python")}
    res = client.post(f"/api/meetings/{meeting['id']}/transcript", files=files, cookies=auth_user["cookies"])
    assert res.status_code == 400
    assert "Only plain-text (.txt)" in res.json()["detail"]
