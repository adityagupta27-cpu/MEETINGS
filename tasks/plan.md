# Implementation Plan: AI Meeting Notes & Action Tracker

## Architecture Overview
- **Backend**: FastAPI (Python 3.14), SQLAlchemy 2.0 (SQLite), Pydantic v2 schemas, PyJWT + Passlib/Bcrypt for authentication, Uvicorn server.
- **Frontend**: Vite + React 19 / 18, React Router v6, Tailwind CSS, Lucide React icons, TipTap rich text editor.
- **AI Engine**: Abstracted AI provider pattern with a high-fidelity heuristic provider (zero-token, offline, 100% compliant with prompt guardrails) and a live Google Gemini API provider.
- **Data Persistence**: SQLite database `meetings.db` with full relational constraints and foreign key cascading.

---

## Phase 1: Environment Setup & Foundation
- Initialize git repository.
- Configure backend directory structure:
  - `app/core`: config, security, database
  - `app/models`: User, Meeting, ActionItem
  - `app/schemas`: Auth, Meeting, ActionItem, AI, Dashboard
  - `app/api`: auth, meetings, actions, dashboard
  - `app/services`: AI provider & synthesis
- Configure frontend directory structure:
  - Vite React setup with Tailwind CSS, React Router, Lucide React
  - API client service with cookie credentials
  - Dark mode context & theme provider
- Provide initial `.env.example` and environment configurations.

---

## Phase 2: Authentication & User Isolation
- Implement User model and password hashing via bcrypt.
- Implement JWT token generation and cookie handling (`HttpOnly`, `SameSite=Lax`).
- Build auth endpoints: `/api/auth/register`, `/login`, `/logout`, `/me`.
- Implement `get_current_user` FastAPI dependency enforcing token validation.
- Unit tests for registration, login, logout, and token expiration.

---

## Phase 3: Meeting Management & Transcript Handling
- Implement Meeting model with metadata and JSON fields for AI insights.
- Meeting endpoints:
  - `GET /api/meetings`: search, filter, pagination
  - `POST /api/meetings`: create with metadata and initial transcript
  - `GET /api/meetings/{id}`: read with action items
  - `PUT /api/meetings/{id}`: update
  - `DELETE /api/meetings/{id}`: delete with cascade
  - `POST /api/meetings/{id}/transcript`: text paste or `.txt` file upload (with size/UTF-8 validation)
- Enforce strict ownership validation on all operations.

---

## Phase 4: AI Synthesis Service
- Define Pydantic schema for structured AI extraction:
  - `summary`, `discussion_points`, `decisions`, `action_items`, `risks`, `unanswered_questions`.
- Implement `BaseAIService` interface.
- Implement `MockAIService`:
  - Deterministic, contextual extraction from transcript text.
  - Strict speaker/participant matching for action item owners.
  - Identification of decisions, risks, questions, and action items.
  - Strict adherence to missing-information rules (`owner = null`, `due_date = null`).
- Implement `GeminiAIService`:
  - Structured JSON generation with strict prompting and schema validation.
- Implement `POST /api/meetings/{id}/process-ai` endpoint to trigger analysis, update meeting fields, and populate action items.

---

## Phase 5: Action Items & Central Action Tracker
- Implement ActionItem model and endpoints:
  - `GET /api/actions`: global filterable query (status, priority, owner, meeting_id, search, overdue)
  - `POST /api/actions`: manual creation
  - `PUT /api/actions/{id}`: update status/priority/owner/due_date/task
  - `DELETE /api/actions/{id}`: delete
- Overdue computation: `due_date < today` and `status != 'completed'`.

---

## Phase 6: Operational Dashboard & Rich Text
- Implement `GET /api/dashboard/stats`:
  - Count of total meetings, total actions, open actions, completed actions, overdue actions.
  - Recent meetings list.
- Frontend Rich Text Editor component for meeting notes/summary review using TipTap / ProseMirror or structured editor.

---

## Phase 7: Frontend Application Shell & Views
- Navigation bar / sidebar with links to Dashboard, Meetings, Action Tracker, Theme Toggle, and User profile.
- Views:
  - `/login` and `/register` with user-friendly error banners.
  - `/dashboard`: KPI metric cards, action breakdown chart, recent meetings.
  - `/meetings`: Meeting card list, search bar, filter by meeting type, "+ New Meeting" CTA.
  - `/meetings/new`: Meeting creation modal/wizard with transcript paste or drag-and-drop file upload.
  - `/meetings/:id`: Comprehensive meeting detail view:
    - Metadata badges (date, type, participants)
    - Transcript drawer / accordion
    - AI Synthesis tabs: Summary, Key Decisions, Action Items, Risks & Concerns, Unanswered Questions, Discussion Points
    - Interactive Action Items table with inline status toggling, priority changer, assignee edit, and new action modal
    - "Run AI Analysis" / "Regenerate" button with loading state
  - `/actions`: Global action tracker table:
    - Search by task description, owner, meeting title
    - Multi-select filters: Status (`open`, `in_progress`, `blocked`, `completed`), Priority (`low`, `medium`, `high`), Owner, Overdue toggle
    - Inline status updater and quick delete.

---

## Phase 8: Testing & Security Audit
- Comprehensive pytest test suite:
  - Auth tests: registration, duplicates, password verification, cookie issuance, logout.
  - Meeting tests: CRUD, ownership check, search, cascade delete.
  - Transcript tests: text input, `.txt` file validation, oversized file rejection.
  - AI analysis tests: schema validation, fallback handling, action item creation.
  - Action item tests: CRUD, overdue computation, status transitions.
  - Dashboard stats tests: accurate counts and aggregations.
- Security audit:
  - IDOR check: ensure User A cannot access or mutate User B's meetings or action items.
  - XSS check: sanitized rendering of transcripts and notes.
  - Secret check: confirm no hardcoded API keys or passwords.

---

## Phase 9: Browser Verification with Devtools
- Use browser subagent to execute full end-to-end verification:
  - Register new account.
  - Create meeting with transcript.
  - Run AI analysis.
  - Edit meeting summary and action item.
  - Add manual action item.
  - Filter central action tracker.
  - Toggle light/dark mode.
  - Verify dashboard metrics.
  - Test responsive layout on tablet/mobile viewport.
  - Logout and verify route protection.

---

## Phase 10: Code Simplification & Documentation
- Code cleanup: eliminate redundant utilities, dead code, unused CSS classes.
- Create detailed `README.md` with architecture, features, API guide, and setup instructions.
- Create truthful `AI_USAGE.md` documenting prompting, tool usage, corrections, and test methods.
- Update `AGENTS.md` and create `.env.example`.
- Ensure clean Git commit history.
