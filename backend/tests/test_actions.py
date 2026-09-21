from datetime import date, timedelta

def test_action_item_lifecycle(client, auth_user):
    meeting = client.post("/api/meetings", json={
        "title": "Action Test Meeting",
        "meeting_date": "2026-09-20",
        "meeting_type": "Internal Meeting",
        "participants": ["Sarah", "Alex"],
        "transcript": "Meeting content"
    }, cookies=auth_user["cookies"]).json()

    # 1. Create action item manually
    create_res = client.post("/api/actions", json={
        "meeting_id": meeting["id"],
        "task": "Configure database indexes",
        "owner": "Alex",
        "due_date": (date.today() + timedelta(days=2)).isoformat(),
        "priority": "high",
        "status": "open"
    }, cookies=auth_user["cookies"])
    assert create_res.status_code == 201
    action_id = create_res.json()["id"]
    assert create_res.json()["task"] == "Configure database indexes"
    assert create_res.json()["priority"] == "high"
    assert create_res.json()["is_overdue"] is False

    # 2. Update action item status
    update_res = client.put(f"/api/actions/{action_id}", json={
        "status": "in_progress",
        "priority": "medium"
    }, cookies=auth_user["cookies"])
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "in_progress"
    assert update_res.json()["priority"] == "medium"

    # 3. Filter actions
    filter_res = client.get("/api/actions?status=in_progress", cookies=auth_user["cookies"])
    assert filter_res.status_code == 200
    assert len(filter_res.json()) == 1

    # 4. Delete action item
    del_res = client.delete(f"/api/actions/{action_id}", cookies=auth_user["cookies"])
    assert del_res.status_code == 204

    # 5. Verify deleted
    verify_res = client.get(f"/api/meetings/{meeting['id']}/actions", cookies=auth_user["cookies"])
    assert verify_res.status_code == 200
    assert len(verify_res.json()) == 0

def test_overdue_logic(client, auth_user):
    meeting = client.post("/api/meetings", json={
        "title": "Overdue Meeting Test",
        "meeting_date": "2026-09-10",
        "meeting_type": "Internal Meeting",
        "participants": ["Sarah"],
        "transcript": "Content"
    }, cookies=auth_user["cookies"]).json()

    past_date = (date.today() - timedelta(days=3)).isoformat()

    # Create overdue action (due in past, open)
    res = client.post("/api/actions", json={
        "meeting_id": meeting["id"],
        "task": "Overdue task",
        "owner": "Sarah",
        "due_date": past_date,
        "priority": "high",
        "status": "open"
    }, cookies=auth_user["cookies"])
    action = res.json()
    assert action["is_overdue"] is True

    # Filter with is_overdue=true
    overdue_list = client.get("/api/actions?is_overdue=true", cookies=auth_user["cookies"]).json()
    assert len(overdue_list) == 1

    # Mark as completed -> should no longer be overdue
    client.put(f"/api/actions/{action['id']}", json={"status": "completed"}, cookies=auth_user["cookies"])
    completed_action = client.get(f"/api/meetings/{meeting['id']}/actions", cookies=auth_user["cookies"]).json()[0]
    assert completed_action["status"] == "completed"
    assert completed_action["is_overdue"] is False

def test_cascade_delete(client, auth_user):
    meeting = client.post("/api/meetings", json={
        "title": "To be deleted",
        "meeting_date": "2026-09-20",
        "meeting_type": "Other",
        "participants": [],
        "transcript": ""
    }, cookies=auth_user["cookies"]).json()

    client.post("/api/actions", json={
        "meeting_id": meeting["id"],
        "task": "Task to be cascaded",
        "priority": "medium",
        "status": "open"
    }, cookies=auth_user["cookies"])

    assert len(client.get("/api/actions", cookies=auth_user["cookies"]).json()) == 1

    # Delete meeting
    client.delete(f"/api/meetings/{meeting['id']}", cookies=auth_user["cookies"])

    # Actions list should now be empty
    assert len(client.get("/api/actions", cookies=auth_user["cookies"]).json()) == 0

def test_action_ownership_isolation(client, auth_user, second_user):
    meeting = client.post("/api/meetings", json={
        "title": "User 1 Meeting",
        "meeting_date": "2026-09-20",
        "meeting_type": "Other",
        "participants": [],
        "transcript": ""
    }, cookies=auth_user["cookies"]).json()

    action = client.post("/api/actions", json={
        "meeting_id": meeting["id"],
        "task": "User 1 Task",
        "priority": "medium",
        "status": "open"
    }, cookies=auth_user["cookies"]).json()

    # User 2 tries to update User 1's action -> 404
    upd_res = client.put(f"/api/actions/{action['id']}", json={"task": "Hacked"}, cookies=second_user["cookies"])
    assert upd_res.status_code == 404

    # User 2 tries to delete User 1's action -> 404
    del_res = client.delete(f"/api/actions/{action['id']}", cookies=second_user["cookies"])
    assert del_res.status_code == 404
