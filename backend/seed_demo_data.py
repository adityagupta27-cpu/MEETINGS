import os
import sys
from datetime import date, timedelta

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.core.database import SessionLocal, init_db
from app.core.security import hash_password
import app.models
from app.models.user import User
from app.models.meeting import Meeting
from app.models.action_item import ActionItem
from app.services.ai_service import MockAIService

def seed_demo():
    init_db()
    db = SessionLocal()

    # 1. Create or get Demo User
    demo_email = "demo@example.com"
    user = db.query(User).filter(User.email == demo_email).first()
    if not user:
        user = User(
            email=demo_email,
            full_name="Demo User",
            hashed_password=hash_password("Password123!")
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"Created demo user: {user.email}")
    else:
        print(f"Demo user {user.email} already exists.")

    # 2. Check if meetings exist for demo user
    existing_meetings = db.query(Meeting).filter(Meeting.user_id == user.id).count()
    if existing_meetings == 0:
        today = date.today()

        # Meeting 1: Architecture Review
        m1_transcript = """
Sarah Connor: Welcome team to our Q3 Architecture & Database Scaling Review.
David Miller: I propose standardizing on SQLite with WAL mode for our high-throughput local operational store.
Sarah Connor: Agreed. We decided to use SQLite with WAL mode.
David Miller: I will implement the database schema migrations and enable foreign key constraints by tomorrow.
Alex Vance: I will build the React frontend views and the Central Action Tracker by Friday.
Sarah Connor: What if our concurrent transactions cause database file contention?
David Miller: That is a potential risk if high write concurrency occurs without connection pooling.
Alex Vance: I can handle the frontend end-to-end integration tests by next week.
Sarah Connor: Please make sure security and cookie protection are high priority.
"""
        m1 = Meeting(
            user_id=user.id,
            title="Q3 Architecture & Database Scaling Review",
            meeting_date=today - timedelta(days=2),
            meeting_type="Project Meeting",
            participants=["Sarah Connor", "David Miller", "Alex Vance"],
            transcript=m1_transcript.strip()
        )
        db.add(m1)
        db.commit()
        db.refresh(m1)

        # Run AI synthesis on M1
        ai = MockAIService()
        res1 = ai.analyze_transcript(m1.transcript, m1.participants, m1.meeting_date)
        m1.summary = res1.summary
        m1.discussion_points = res1.discussion_points
        m1.decisions = res1.decisions
        m1.risks = res1.risks
        m1.unanswered_questions = res1.unanswered_questions

        # Add Action Items to M1
        a1 = ActionItem(
            meeting_id=m1.id,
            task="Implement database schema migrations and enable foreign key constraints",
            owner="David Miller",
            due_date=today + timedelta(days=1),
            priority="high",
            status="in_progress"
        )
        a2 = ActionItem(
            meeting_id=m1.id,
            task="Build React frontend views and Central Action Tracker",
            owner="Alex Vance",
            due_date=today + timedelta(days=3),
            priority="medium",
            status="open"
        )
        a3 = ActionItem(
            meeting_id=m1.id,
            task="Audit cookie protection and OWASP security headers",
            owner="Sarah Connor",
            due_date=today - timedelta(days=1),  # Overdue
            priority="high",
            status="open"
        )
        db.add_all([a1, a2, a3])

        # Meeting 2: Sprint Planning
        m2_transcript = """
Sarah Connor: Let's align on Sprint deliverables.
Alex Vance: We agreed to launch the dark mode theme toggle by this Wednesday.
Sarah Connor: I will review and merge the pull request for the auth flow today.
"""
        m2 = Meeting(
            user_id=user.id,
            title="Sprint 14 Planning & Velocity Sync",
            meeting_date=today - timedelta(days=5),
            meeting_type="Internal Meeting",
            participants=["Sarah Connor", "Alex Vance"],
            transcript=m2_transcript.strip()
        )
        db.add(m2)
        db.commit()
        db.refresh(m2)

        res2 = ai.analyze_transcript(m2.transcript, m2.participants, m2.meeting_date)
        m2.summary = res2.summary
        m2.discussion_points = res2.discussion_points
        m2.decisions = res2.decisions
        m2.risks = res2.risks
        m2.unanswered_questions = res2.unanswered_questions

        a4 = ActionItem(
            meeting_id=m2.id,
            task="Launch dark mode theme toggle and persistent local storage sync",
            owner="Alex Vance",
            due_date=today - timedelta(days=2),
            priority="medium",
            status="completed"
        )
        db.add(a4)

        db.commit()
        print("Seeded 2 meetings and 4 action items for demo user!")
    else:
        print("Demo user already has meeting data.")

    db.close()

if __name__ == "__main__":
    seed_demo()
