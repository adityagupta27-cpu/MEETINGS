# Specification: AI Meeting Notes & Action Tracker

## 1. Product Objective
AI Meeting Notes & Action Tracker is an AI-native productivity web application designed for teams to capture post-meeting transcripts (via paste or `.txt` file upload), automatically synthesize structured intelligence (executive summary, discussion points, key decisions, action items, risks/concerns, unanswered questions), allow human review and editing, and centrally manage deliverables via an Action Tracker and real-time operational dashboard.

---

## 2. Target Users & User Journeys

### Users
- **Meeting Facilitators & PMs**: Ingest transcripts, trigger AI extraction, refine notes, assign deliverables.
- **Team Members / Assignees**: Track assigned action items, update statuses, prioritize tasks, review decisions.
- **Leadership / Stakeholders**: Review high-level summaries, track project bottlenecks/risks, monitor velocity via dashboard metrics.

### Key User Journeys
1. **Authentication & Session Lifecycle**:
   - Register with email, password, and full name.
   - Login with email and password -> receive HTTP-only session cookie.
   - Persistent authenticated state across browser refreshes.
   - Logout clears session cookie.
2. **Meeting Ingestion & Management**:
   - Create a meeting specifying: Title, Date, Meeting Type, Participants, and Transcript.
   - Input transcript by direct pasting or uploading a `.txt` file.
   - Search, view, edit metadata/transcript, and delete meetings with cascade cleanup.
3. **AI Processing & Human Review**:
   - Trigger AI analysis on the transcript.
   - AI extracts: Summary, Discussion Points, Key Decisions, Action Items, Risks/Concerns, and Unanswered Questions.
   - Review and edit generated insights with rich formatting.
   - Re-analyze transcript if transcript is updated.
4. **Action Item Lifecycle**:
   - Extracted action items are automatically persisted to the meeting.
   - Users can manually add, edit (task description, owner, due date, priority, status), or delete action items.
   - Status transitions: `open` ➔ `in_progress` ➔ `blocked` ➔ `completed`.
   - Priorities: `low`, `medium`, `high`.
5. **Central Action Tracker**:
   - View all action items across all meetings in one unified interface.
   - Search by task, owner, or meeting title.
   - Filter by status, priority, owner, and due date.
   - Deterministic overdue highlighting (due date < today and status != `completed`).
6. **Dashboard & Analytics**:
   - Real-time aggregate statistics: Total Meetings, Total Action Items, Open, Completed, Overdue.
   - List of recent meetings with direct navigation.
   - Theme toggle (Light / Dark mode) with local persistence.

---

## 3. Explicit Non-Goals
To preserve focus and comply with assessment guidelines, the following are strictly out of scope:
- Video/audio calling, WebRTC, meeting recording, or live audio streaming.
- Live speech-to-text or real-time transcription.
- Calendar integrations (Google Calendar, Outlook).
- Live team chat or WebSockets.
- Microservices, Celery/Redis, Kafka, vector databases, RAG, or GraphQL.

---

## 4. Data Model & Relationships

```
User (1) ───────< (N) Meeting (1) ───────< (N) ActionItem
```

### 4.1 `User`
- `id` (String UUID, PK)
- `email` (String 255, Unique, Indexed, Not Null)
- `hashed_password` (String 255, Not Null)
- `full_name` (String 120, Not Null)
- `created_at` (DateTime UTC, Not Null)
- `updated_at` (DateTime UTC, Not Null)

### 4.2 `Meeting`
- `id` (String UUID, PK)
- `user_id` (String UUID, FK -> `users.id`, Indexed, Not Null)
- `title` (String 255, Not Null)
- `meeting_date` (Date, Not Null)
- `meeting_type` (String 50, Not Null) - e.g., "Client Meeting", "Sales Meeting", "Project Meeting", "Internal Meeting", "Requirement Discussion", "Retrospective", "Other"
- `participants` (JSON array of strings, Not Null, default `[]`)
- `transcript` (Text, Not Null, default `""`)
- `summary` (Text, Nullable)
- `discussion_points` (JSON array of strings, Nullable)
- `decisions` (JSON array of strings, Nullable)
- `risks` (JSON array of strings, Nullable)
- `unanswered_questions` (JSON array of strings, Nullable)
- `created_at` (DateTime UTC, Not Null)
- `updated_at` (DateTime UTC, Not Null)

### 4.3 `ActionItem`
- `id` (String UUID, PK)
- `meeting_id` (String UUID, FK -> `meetings.id`, Indexed, On Delete Cascade, Not Null)
- `task` (Text, Not Null)
- `owner` (String 100, Nullable)
- `due_date` (Date, Nullable)
- `priority` (Enum / String: `low`, `medium`, `high`, default `medium`)
- `status` (Enum / String: `open`, `in_progress`, `blocked`, `completed`, default `open`)
- `created_at` (DateTime UTC, Not Null)
- `updated_at` (DateTime UTC, Not Null)

---

## 5. REST API Contracts

### Authentication (`/api/auth`)
- `POST /api/auth/register`
  - Body: `{ email, password, full_name }`
  - Response: `201 Created` with User object + `access_token` HTTP-only cookie
- `POST /api/auth/login`
  - Body: `{ email, password }`
  - Response: `200 OK` with User object + `access_token` HTTP-only cookie
- `POST /api/auth/logout`
  - Response: `200 OK`, clears cookie
- `GET /api/auth/me`
  - Response: `200 OK` with User object or `401 Unauthorized`

### Meetings (`/api/meetings`)
- `GET /api/meetings?search=&meeting_type=&skip=0&limit=50`
  - Response: `200 OK` with list of meetings + action item counts
- `POST /api/meetings`
  - Body: `{ title, meeting_date, meeting_type, participants, transcript }`
  - Response: `201 Created` with Meeting object
- `GET /api/meetings/{id}`
  - Response: `200 OK` with Meeting detail + linked action items
- `PUT /api/meetings/{id}`
  - Body: `{ title, meeting_date, meeting_type, participants, transcript, summary, discussion_points, decisions, risks, unanswered_questions }`
  - Response: `200 OK` with updated Meeting
- `DELETE /api/meetings/{id}`
  - Response: `204 No Content` (cascades to action items)
- `POST /api/meetings/{id}/transcript`
  - Multipart Form: File upload (`file`) OR JSON `{ transcript: string }`
  - Validates `.txt`, max 2MB, UTF-8
  - Response: `200 OK` with updated Meeting
- `POST /api/meetings/{id}/process-ai`
  - Triggers AI extraction on meeting transcript.
  - Updates meeting summary, discussion points, decisions, risks, unanswered questions, and generates/replaces action items.
  - Response: `200 OK` with updated Meeting + action items
- `GET /api/meetings/{id}/actions`
  - Response: `200 OK` with list of ActionItems for this meeting

### Action Items (`/api/actions`)
- `GET /api/actions?search=&status=&priority=&owner=&meeting_id=&is_overdue=`
  - Response: `200 OK` with list of ActionItems (with meeting title)
- `POST /api/actions`
  - Body: `{ meeting_id, task, owner, due_date, priority, status }`
  - Validates meeting ownership
  - Response: `201 Created`
- `PUT /api/actions/{id}`
  - Body: `{ task, owner, due_date, priority, status }`
  - Response: `200 OK`
- `DELETE /api/actions/{id}`
  - Response: `204 No Content`

### Dashboard (`/api/dashboard/stats`)
- `GET /api/dashboard/stats`
  - Response: `200 OK`
  ```json
  {
    "total_meetings": 12,
    "total_actions": 34,
    "open_actions": 18,
    "completed_actions": 12,
    "overdue_actions": 4,
    "recent_meetings": [...]
  }
  ```

---

## 6. AI Service Specification & Prompt Engineering

### Output Schema (Pydantic validated)
```json
{
  "summary": "string",
  "discussion_points": ["string"],
  "decisions": ["string"],
  "action_items": [
    {
      "task": "string",
      "owner": "string or null",
      "due_date": "YYYY-MM-DD or null",
      "priority": "low | medium | high",
      "status": "open"
    }
  ],
  "risks": ["string"],
  "unanswered_questions": ["string"]
}
```

### Anti-Hallucination & Grounding Guardrails:
1. Grounding: All summaries, discussion points, decisions, risks, and questions must derive solely from transcript statements.
2. Missing Details: If an owner is not clearly stated, set `owner = null`. If due date is not mentioned or relative date cannot be anchored, set `due_date = null`.
3. Non-fabrication: If no decisions were reached, return `decisions = []`.
4. Idempotency: Processing a transcript repeatedly is idempotent and handles re-processing gracefully.
5. Error Resilience: If an external LLM fails, times out, or has an invalid key, the service falls back gracefully without crashing or leaking API keys.

---

## 7. Frontend Routing & Application Shell
- `/login`: Public auth screen
- `/register`: Public registration screen
- `/dashboard`: Protected dashboard with KPI cards and recent meetings
- `/meetings`: Protected meetings list with search and filters
- `/meetings/new`: Protected meeting creation wizard (metadata + transcript upload/paste + instant AI process option)
- `/meetings/:id`: Protected meeting details page (metadata edit, rich-text notes/summary, discussion points, decisions, risks, questions, inline action item manager, re-analyze AI button)
- `/actions`: Protected central action tracker with comprehensive search, filters (status, priority, owner, overdue), and quick-edit controls.

Theme: Seamless toggle between Light and Dark mode, persisted in `localStorage`.

---

## 8. Security & Hardening Checklist
- Passwords hashed with `bcrypt` (12 rounds).
- Signed JWT in `HttpOnly`, `SameSite=Lax` cookies to prevent XSS credential theft.
- Row-Level Authorization: Every meeting and action item query enforces `meeting.user_id == current_user.id`.
- File Upload Protection: Only `.txt` accepted; size bounded to 2MB; decoded strictly as UTF-8.
- Untrusted AI Rendering: AI outputs and user transcripts sanitized and rendered safely to prevent stored XSS.
- Error Masking: Server stack traces never exposed to client; structured JSON error responses.

---

## 9. Acceptance Criteria
- [x] Full user authentication flow with protected routes and persistent login.
- [x] Create, read, update, delete meetings with multi-user isolation.
- [x] Paste or upload `.txt` transcript with client & server validation.
- [x] Structured AI analysis yielding all 6 categories (summary, points, decisions, actions, risks, questions).
- [x] Robust offline fallback/mock AI provider and optional live Gemini provider.
- [x] Full action item CRUD, inline status/priority edits, and manual creation.
- [x] Central Action Tracker with search, status/priority/owner filters, and overdue detection.
- [x] Dashboard with accurate, derived statistics and recent meeting list.
- [x] Clean, responsive UI with light/dark theme toggle and mobile support.
- [x] Comprehensive automated test suite for backend API and workflows.
- [x] End-to-end browser verification using devtools.
