# AGENTS.md: Developer & Agent Engineering Manual

This document defines the architectural guidelines, conventions, security mandates, testing protocols, and scope boundaries for **AI Meeting Notes & Action Tracker**.

---

## 1. Project Architecture & Stack

### Backend
- **Framework**: FastAPI (Python 3.14)
- **Database ORM**: SQLAlchemy 2.0 with SQLite (`sqlite:///./meetings.db`)
- **Foreign Keys**: Enabled at connection time via `PRAGMA foreign_keys=ON;`
- **Authentication**: Signed JWT stored in `HttpOnly`, `SameSite=Lax` cookies; passwords hashed using `bcrypt` (12 rounds)
- **Validation**: Pydantic v2 schemas (`ConfigDict(from_attributes=True)`)
- **AI Boundary**: Abstract `BaseAIService` with two implementations:
  1. `MockAIService`: Heuristic, offline, zero-token provider adhering strictly to anti-hallucination rules.
  2. `GeminiAIService`: Optional live LLM provider using Google Gemini REST API when `GEMINI_API_KEY` is present.

### Frontend
- **Bundler & Framework**: Vite 8 + React 19 (JavaScript)
- **Styling**: Tailwind CSS v4 via `@tailwindcss/vite`
- **Routing**: `react-router-dom` v7 with `ProtectedRoute` guards
- **Icons**: `lucide-react`
- **Rich Text**: TipTap (`@tiptap/react`, `@tiptap/starter-kit`)
- **State Management**: React Context (`AuthContext`, `ThemeContext`)
- **Proxy**: Vite server proxies `/api` requests to `http://localhost:8000`

---

## 2. Directory Structure

```text
MEETINGS/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI routers: auth, meetings, actions, dashboard
│   │   ├── core/         # Config, Database engine, Security utilities
│   │   ├── models/       # SQLAlchemy models: User, Meeting, ActionItem
│   │   ├── schemas/      # Pydantic request/response models
│   │   ├── services/     # AI service boundary (Mock & Gemini)
│   │   └── main.py       # FastAPI application entrypoint with CORS & lifespan
│   ├── tests/            # Pytest test suite (auth, meetings, actions, ai, dashboard, e2e)
│   ├── requirements.txt  # Python package dependencies
│   └── .env.example      # Backend environment template
├── frontend/
│   ├── src/
│   │   ├── components/   # Sidebar, RichTextEditor, ActionItemModal, ConfirmModal, EmptyState
│   │   ├── context/      # AuthContext, ThemeContext
│   │   ├── pages/        # Login, Register, Dashboard, Meetings, MeetingNew, MeetingDetail, ActionTracker
│   │   ├── services/     # api.js client with cookie credentials
│   │   ├── App.jsx       # Route registry and ProtectedRoute wrappers
│   │   ├── index.css     # Tailwind v4 import & custom styles
│   │   └── main.jsx      # Root DOM mounting
│   ├── package.json
│   └── vite.config.js    # Tailwind plugin & /api proxy configuration
├── tasks/
│   ├── spec.md           # Product & technical specification
│   ├── plan.md           # Implementation plan
│   └── todo.md           # Progress checklist
├── README.md
├── AI_USAGE.md
├── AGENTS.md
└── .env.example
```

---

## 3. Strict Security Rules

1. **Row-Level Tenant Isolation**:
   - Every meeting and action item query MUST be scoped to the authenticated user (`meeting.user_id == current_user.id`).
   - Action item mutations must verify ownership through the linked meeting before modifying or deleting records.
2. **Session Security**:
   - Always store tokens in `HttpOnly` cookies. Never write access tokens into `localStorage` or `sessionStorage`.
   - Clear cookie explicitly on logout with matching path and SameSite attributes.
3. **Password Security**:
   - Passwords must be hashed using `bcrypt` (minimum 12 rounds). Plain text passwords must never be logged or stored.
4. **Input & File Upload Validation**:
   - Meeting transcript uploads are strictly restricted to `.txt` files.
   - Enforce a maximum file size of 2MB.
   - Decode strictly as UTF-8; reject corrupted or binary files with `400 Bad Request`.
5. **No Stack Trace Leakage**:
   - The global FastAPI exception handler intercepts unhandled exceptions, logs them with `logger.error`, and returns a sanitized JSON error message.

---

## 4. AI Guardrails & Anti-Hallucination Policy

1. **Grounding**:
   - The AI must only summarize facts explicitly present in the transcript.
2. **Missing Entities**:
   - If an owner is not mentioned or cannot be unambiguously matched to the known `participants` list, set `owner = null`.
   - If a target date is not mentioned or cannot be anchored, set `due_date = null`.
3. **Empty Decisions**:
   - If no consensus or decision was reached during the meeting, return `decisions = []`. Do NOT fabricate decisions.
4. **Idempotency**:
   - Re-running AI analysis (`/api/meetings/{id}/process-ai`) must update synthesis fields and add only novel action items without creating duplicate rows.

---

## 5. Scope Boundaries (Strict Non-Goals)

Do **NOT** add the following features:
- Video/audio calling, WebSockets, or live streaming.
- Live speech-to-text or recording capabilities.
- Third-party calendar integrations (Google Calendar, Outlook).
- Vector databases, RAG, embeddings, Redis, or Celery.
- Microservices architectures or Kubernetes manifests.

---

## 6. Testing & Verification Commands

### Run Backend Unit & Integration Tests:
```bash
PYTHONPATH=backend backend/venv/bin/pytest backend/tests -v
```

### Run Live Full-Stack End-to-End Test:
```bash
backend/venv/bin/python backend/tests/test_live_e2e.py
```

### Build Frontend Production Assets:
```bash
cd frontend && npm run build
```

### Run Local Development Servers:
```bash
# Terminal 1: Backend
PYTHONPATH=backend backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2: Frontend
cd frontend && npm run dev
```
