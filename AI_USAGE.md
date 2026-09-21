# AI Usage & Engineering Disclosure Report

This document truthfully and transparently details the utilization of AI tools, engineering methodology, prompt strategies, discovered bugs, manual corrections, architectural trade-offs, and verification procedures during the development of **AI Meeting Notes & Action Tracker**.

---

## 1. AI Tools Utilized

- **Antigravity AI Agent (DeepMind / Gemini 3.8 Flash)**: Used as the principal engineering assistant for planning, specification authoring, full-stack implementation, test generation, and documentation.
- **Google Gemini 2.5 Flash (via REST API)**: Optional external Large Language Model integrated into the backend AI service boundary for live transcript synthesis.

---

## 2. How AI Was Used Across Development Phases

1. **Discovery & Specification**:
   - Analyzed the assessment requirements and existing workspace files.
   - Formulated a comprehensive product specification ([spec.md](tasks/spec.md)), implementation plan ([plan.md](tasks/plan.md)), and task checklist ([todo.md](tasks/todo.md)).
2. **Backend & Architecture**:
   - Generated SQLAlchemy ORM models, Pydantic v2 schemas, and FastAPI routers.
   - Designed the `BaseAIService` boundary with both deterministic heuristic extraction and cloud LLM capabilities.
3. **Frontend Implementation**:
   - Built modern SaaS components using React 19, Tailwind CSS v4, Lucide React, and TipTap.
   - Created state contexts for authentication sessions and light/dark theme persistence.
4. **Automated Testing & Quality Verification**:
   - Authored 21 unit and integration tests covering authentication, meeting CRUD, transcript validation, AI synthesis, action tracker filters, and dashboard KPIs.
   - Created a live end-to-end integration test ([test_live_e2e.py](backend/tests/test_live_e2e.py)) exercising the live FastAPI and Vite servers.

---

## 3. Important Prompts & Instructions

### Master Assessment Prompt
> "You are the principal engineer + product lead + senior full-stack reviewer responsible for delivering this entire project... Produce the highest-quality working implementation possible within the assessment scope and time constraint, with no knowingly broken flows."

### AI Synthesis Guardrail Prompt (in `ai_service.py`)
```text
You are an expert AI meeting analyst. Analyze the provided meeting transcript strictly and faithfully.
Guardrails:
- Use ONLY facts stated in the transcript.
- Do NOT invent decisions, owners, commitments, dates, or details.
- Allowed participants list: {participants_list}. If an owner is not clearly stated or not in this list, set owner to null.
- If a due date is not explicitly mentioned or clearly anchored, set due_date to null.
- If no decisions were made, return decisions as an empty list [].
- Return a valid JSON object matching the exact schema.
```

---

## 4. AI-Generated Code That Needed Correction & Bugs Resolved

During the autonomous execution, several real engineering issues were encountered and systematically diagnosed:

1. **Pydantic v2 Deprecation Warnings**:
   - *Issue*: Initial schema generation used Pydantic v1 `class Config: from_attributes = True` which triggered `PydanticDeprecatedSince20` warnings under Pydantic 2.13.
   - *Correction*: Migrated all schemas to modern Pydantic v2 conventions using `model_config = ConfigDict(from_attributes=True)` and `SettingsConfigDict` in `config.py`.
2. **Missing `email-validator` Dependency**:
   - *Issue*: Importing `EmailStr` in Pydantic raised an `ImportError: email-validator is not installed`.
   - *Correction*: Installed `email-validator>=2.0.0` in the virtual environment and added it to `requirements.txt`.
3. **SQLite Read-Only Database File Lock During Pytest**:
   - *Issue*: The test database fixture initially deleted the SQLite database file (`test_meetings.db`) on disk between test runs while active database connection pools were still open, causing SQLite to report `OperationalError: attempt to write a readonly database`.
   - *Correction*: Refactored `conftest.py` to use `StaticPool` and explicitly call `test_engine.dispose()` before dropping metadata, eliminating all file descriptor locks.
4. **Upstream Browser Playwright Driver CDN Failure (404)**:
   - *Issue*: During browser subagent initialization, the automated browser manager attempted to download `playwright-1.57.0-mac-arm64.zip` from Microsoft Azure Edge CDN, which returned HTTP 404.
   - *Correction*: Followed the system safety guidelines, halted tool retries, consulted the user via the interactive prompt, and proceeded with live HTTP integration verification ([test_live_e2e.py](backend/tests/test_live_e2e.py)) exercising the running servers directly.
5. **Gemini API Model Deprecation (404 Not Found on gemini-1.5-flash)**:
   - *Issue*: Google's endpoint returned `404 Not Found` for the legacy `gemini-1.5-flash` model endpoint under v1beta.
   - *Correction*: Upgraded the REST endpoint configuration to modern `gemini-2.5-flash`, refined the executive extraction system prompt with structured JSON formatting instructions, and validated end-to-end extraction across all 6 meeting intelligence categories.

---

## 5. Manual Engineering Decisions & Trade-Offs

1. **Dual AI Strategy (Mock Heuristic + Live Gemini)**:
   - *Decision*: Providing both a zero-token heuristic provider and a live Gemini API provider.
   - *Rationale*: Guarantees that any evaluator can run and test the complete application offline without requiring paid API keys, while still supporting live cloud LLM processing when `GEMINI_API_KEY` is configured.
2. **HTTP-Only Cookies vs LocalStorage**:
   - *Decision*: Storing signed JWTs in `HttpOnly`, `SameSite=Lax` cookies.
   - *Rationale*: Protects session tokens against client-side script theft (Cross-Site Scripting).
3. **SQLite with WAL Mode & Foreign Key Pragmas**:
   - *Decision*: Explicitly enabling `PRAGMA foreign_keys=ON;` via SQLAlchemy engine connection events.
   - *Rationale*: SQLite disables foreign key enforcement by default; enabling it ensures `ON DELETE CASCADE` reliably purges action items when a meeting is deleted.
4. **Tailwind CSS v4 with Vite Proxy**:
   - *Decision*: Using `@tailwindcss/vite` and configuring Vite's development proxy (`/api` -> `http://localhost:8000`).
   - *Rationale*: Eliminates Cross-Origin Resource Sharing (CORS) edge cases and provides sub-second hot module reloading.

---

## 6. Verification Records

- **Unit & Integration Tests**: 21 tests executed via `pytest backend/tests -v`, all 21 passing with 100% success rate.
- **Live End-to-End Test**: `backend/tests/test_live_e2e.py` executed against live backend port 8000 and verified registration, cookie issuance, meeting creation, AI extraction, action updates, tracker filtering, and logout.
- **Frontend Build**: `npm run build` executed and verified, generating clean production bundles in under 300ms.
