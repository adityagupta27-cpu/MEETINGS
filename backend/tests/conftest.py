import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

TEST_DB_FILE = "/tmp/test_meetings.db"
TEST_DATABASE_URL = f"sqlite:///{TEST_DB_FILE}"

os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ["SECRET_KEY"] = "test-secret-key-32-chars-minimum-length-needed-here"

from app.core.database import Base, get_db
from app.main import app

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    yield
    test_engine.dispose()

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture
def auth_user(client):
    register_payload = {
        "email": "sarah.connor@example.com",
        "password": "Password123!",
        "full_name": "Sarah Connor"
    }
    resp = client.post("/api/auth/register", json=register_payload)
    assert resp.status_code == 201
    return {
        "user": resp.json(),
        "cookies": resp.cookies
    }

@pytest.fixture
def second_user(client):
    register_payload = {
        "email": "john.reese@example.com",
        "password": "Password123!",
        "full_name": "John Reese"
    }
    resp = client.post("/api/auth/register", json=register_payload)
    assert resp.status_code == 201
    return {
        "user": resp.json(),
        "cookies": resp.cookies
    }
