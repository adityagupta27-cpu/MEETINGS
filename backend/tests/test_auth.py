def test_register_success(client):
    res = client.post("/api/auth/register", json={
        "email": "alice@example.com",
        "password": "SecurePassword123!",
        "full_name": "Alice Smith"
    })
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == "alice@example.com"
    assert data["full_name"] == "Alice Smith"
    assert "access_token" in res.cookies

def test_register_duplicate_email(client, auth_user):
    res = client.post("/api/auth/register", json={
        "email": "sarah.connor@example.com",
        "password": "AnotherPassword123!",
        "full_name": "Sarah Duplicate"
    })
    assert res.status_code == 400
    assert "already exists" in res.json()["detail"]

def test_login_success(client, auth_user):
    res = client.post("/api/auth/login", json={
        "email": "sarah.connor@example.com",
        "password": "Password123!"
    })
    assert res.status_code == 200
    assert res.json()["email"] == "sarah.connor@example.com"
    assert "access_token" in res.cookies

def test_login_invalid_credentials(client, auth_user):
    res = client.post("/api/auth/login", json={
        "email": "sarah.connor@example.com",
        "password": "WrongPassword"
    })
    assert res.status_code == 401
    assert "Invalid email address or password" in res.json()["detail"]

def test_get_me_authenticated(client, auth_user):
    res = client.get("/api/auth/me", cookies=auth_user["cookies"])
    assert res.status_code == 200
    assert res.json()["email"] == "sarah.connor@example.com"

def test_get_me_unauthenticated(client):
    res = client.get("/api/auth/me")
    assert res.status_code == 401

def test_logout(client, auth_user):
    res = client.post("/api/auth/logout", cookies=auth_user["cookies"])
    assert res.status_code == 200
    # Next get_me without cookies or with cleared cookie should fail
    check = client.get("/api/auth/me")
    assert check.status_code == 401
