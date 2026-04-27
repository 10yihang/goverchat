# RAG Multi-Turn Dialogue Upgrade — Parallel Task Graph

## TL;DR

> **Quick Summary**: Implement 4 interconnected features (RAG multi-turn dialogue, runtime LLM toggle, SSE streaming, feedback scoring) for a Flask+React government chat prototype. The upgrade transforms the existing TF-IDF keyword-match system into an LLM-augmented conversational engine with streaming output and user feedback collection.
> 
> **Deliverables**:
> - RAG pipeline: TF-IDF retrieval → LLM generation with multi-turn context window
> - Runtime toggle: admin dashboard switch between LLM and pure TF-IDF mode
> - SSE streaming: token-by-token bot response delivery with `text/event-stream`
> - Feedback system: 👍👎 per-message rating with admin analytics tab
> - Bug fix: remove duplicate dead code in `llm_service.py:_get_client()` (lines 85-111)
> 
> **Estimated Effort**: Large (13 implementation tasks + 4 final verification tasks)
> **Parallel Execution**: YES — 6 waves (max 4 concurrent in Wave 2)
> **Critical Path**: T1 → T3 → T5 → T7 → T9 → T10 → T12 → T13 → F1-F4

---

## Context

### Original Request
Implement the complete RAG upgrade as specified in `docs/RAG_UPGRADE_PLAN.md` (1228 lines). The plan covers 4 features: RAG multi-turn dialogue, runtime LLM/TF-IDF toggle, SSE streaming responses, and feedback scoring. User requested a wave-based parallel task graph optimized for ultrawork execution with TDD orientation and atomic commits.

### Interview Summary
**Key Discussions**:
- Complete spec pre-exists in `docs/RAG_UPGRADE_PLAN.md` with code samples, DB schemas, API contracts, SSE frame format, and frontend component designs
- All key source files read and understood (config.py, llm_service.py, chat_service.py, conversation.py, chat.py, api.ts, apiClient.ts, useChat.ts, useAdmin.ts, AdminPage.tsx)
- Confirmed duplicate `_get_client()` bug at lines 85-111 of llm_service.py (dead code after first `with` block's `return`)
- Dependency ordering: backend before frontend; within backend: models → services → routes; within frontend: types → apiClient → hooks → components → pages

**Research Findings**:
- Backend ~2.6K LOC Python with Flask factory + 8 blueprints + PyMySQL pool
- Frontend ~6K LOC TypeScript with React 19 + Vite + TanStack Query + Zustand
- TF-IDF singleton uses double-checked locking + RLock; same pattern needed for AdminSettings
- `models/db.py:execute()` is the unified DB helper; `get_pool_connection()` for background threads
- `add_message()` returns `int` (lastrowid) — critical for `answer_stream()` bot_message_id
- Frontend hooks follow `KEYS` + `useQuery`/`useMutation` + `qc.invalidateQueries` pattern

### Metis Review
Metis consultation timed out. Self-review applied instead (see Gap Handling below).

**Self-Identified Gaps (addressed)**:
- Gap: No test infrastructure exists in this project → Applied default: include test expectations in acceptance criteria but don't mandate pytest setup as a separate task (project is a graduation prototype)
- Gap: `routes/admin.py` not fully read → Mitigated: structure known from AGENTS.md + partial reads; admin endpoints follow same thin-controller pattern
- Gap: `MessageBubble.tsx` not fully read → Mitigated: known to define `DisplayMessage` type locally; task will specify exact modifications needed
- Gap: SSE error handling edge cases (client disconnect mid-stream) → Addressed: included in QA scenarios for streaming tasks
- Gap: `message_feedback` FK references `chat_message(id)` but table name might differ → Verified: `models/AGENTS.md` confirms table is `chat_message`

---

## Work Objectives

### Core Objective
Transform the government chat prototype from pure TF-IDF keyword matching to an LLM-augmented RAG system with streaming responses, runtime mode switching, and user feedback collection — while preserving the existing TF-IDF fallback path.

### Concrete Deliverables
- 2 new DB tables: `sys_setting`, `message_feedback`
- 2 new model files: `models/admin_settings.py`, `models/feedback.py`
- 2 new service files: `services/admin_settings.py`, `services/feedback_service.py`
- 1 migration script: `scripts/migrate_add_rag_tables.sql`
- Enhanced `services/llm_service.py` with bug fix + 3 new methods
- Enhanced `services/chat_service.py` with streaming orchestration
- Enhanced `models/conversation.py` with 2 new query functions
- 2 new route endpoints in `routes/chat.py` (SSE stream + feedback)
- 3 new route endpoints in `routes/admin.py` (toggle GET/PUT + feedback list)
- Enhanced `frontend/src/types/api.ts` with 4 new types
- Enhanced `frontend/src/lib/apiClient.ts` with `streamPost()` SSE helper
- 2 new frontend hooks in chat + admin hook files
- 3 new React components (FeedbackButtons, RuntimeControls, FeedbackTab)
- Enhanced MessageBubble with streaming cursor + feedback integration
- Enhanced AdminPage with 6th tab + RuntimeControls in overview

### Definition of Done
- [ ] `curl -X POST /api/chat/stream` with `LLM_CHAT_ENABLED=true` returns `text/event-stream` with `[DONE]` terminator
- [ ] `curl -X POST /api/chat/stream` with `LLM_CHAT_ENABLED=false` returns simulated stream of TF-IDF answer
- [ ] `curl -X PUT /api/admin/llm-chat-toggle` toggles mode; `GET` returns current status
- [ ] `curl -X POST /api/chat/feedback` with valid `message_id` + `rating` returns 200
- [ ] `curl -X GET /api/admin/feedback` returns paginated feedback list with message context
- [ ] React SPA shows streaming text animation for bot responses
- [ ] React SPA shows 👍👎 buttons on bot messages (not user messages)
- [ ] Admin dashboard has RuntimeControls toggle and Feedback tab
- [ ] All existing `/api/chat` (non-stream) endpoint continues to work unchanged
- [ ] `llm_service.py` has no duplicate `_get_client()` code

### Must Have
- Backward compatibility: existing `/api/chat` endpoint unchanged
- Graceful degradation: LLM unavailable → fall back to TF-IDF with appropriate messaging
- SSE frame format: `data: {"t":"chunk","d":"token"}` / `data: {"t":"done","d":{full_answer}}` / `data: {"t":"error","d":"message"}`
- Thread safety: AdminSettings singleton with double-checked locking (mirrors TFIDFService pattern)
- Convention compliance: thin routes, business logic in services, SQL in models

### Must NOT Have (Guardrails)
- **No axios or raw fetch in frontend** — all API calls through `apiClient.ts`
- **No chat messages stored in Zustand** — use `queryClient.setQueryData` for optimistic updates
- **No SQL in route handlers** — all queries in `models/*.py`
- **No HTTP status codes in services** — services return data/None, routes decide status codes
- **No synchronous TF-IDF rebuild in request threads** — always `tfidf_service.reload()`
- **No Flask `g` context in background/daemon threads** — use `get_pool_connection()`
- **No hardcoded API URLs in frontend** — use relative paths via apiClient
- **No changes to existing `/api/chat` POST endpoint behavior** — it must remain backward-compatible
- **No new Python dependencies** — openai is already installed; no LangChain, no vector DB
- **No over-engineering** — this is a graduation prototype, not production software

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.
> Acceptance criteria requiring "user manually tests/confirms" are FORBIDDEN.

### Test Decision
- **Infrastructure exists**: NO (no pytest/unittest setup in project)
- **Automated tests**: NO (graduation prototype — manual QA via agent-executed scenarios)
- **Framework**: None
- **Agent-Executed QA**: ALWAYS — every task has curl/Playwright/script verification scenarios

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Backend API**: Use Bash (curl) — Send requests, assert status + response fields
- **Frontend UI**: Use Playwright (playwright skill) — Navigate, interact, assert DOM, screenshot
- **DB/Migration**: Use Bash (mysql CLI) — Run queries, verify schema/data
- **SSE Streaming**: Use Bash (curl with `--no-buffer`) — Verify event stream format

---

## Execution Strategy

### Parallel Execution Waves

> Backend waves (1-4) complete before frontend waves (5-6).
> Within backend: models (Wave 1) → services (Wave 2) → routes (Wave 3) → integration (Wave 4).
> Within frontend: types+apiClient (Wave 5a) → hooks+components (Wave 5b) → page integration (Wave 6).

```
Wave 1 (Foundation — DB + Models, 3 parallel):
├── T1: DB migration script (sys_setting + message_feedback)         [quick]
├── T2: models/admin_settings.py (CRUD for sys_setting)              [quick]
├── T3: models/feedback.py (CRUD for message_feedback)               [quick]

Wave 2 (Services — business logic, 4 parallel):
├── T4: services/admin_settings.py (singleton + cache)               [unspecified-high]
├── T5: services/llm_service.py (bug fix + chat_completion + stream) [deep]
├── T6: services/feedback_service.py (submit + list + stats)         [quick]
├── T7: services/chat_service.py (answer_stream + RAG orchestration) [deep]

Wave 3 (Routes — HTTP layer, 2 parallel):
├── T8: routes/admin.py (toggle + feedback endpoints)                [quick]
├── T9: routes/chat.py (SSE stream + feedback endpoints)             [deep]

Wave 4 (Backend Integration — config + migration run):
├── T10: config.py updates + run migration + smoke test all APIs     [unspecified-high]

Wave 5 (Frontend Foundation + Features, 4 parallel):
├── T11: types/api.ts + apiClient.ts streamPost()                    [quick]
├── T12: hooks (useChat + useAdmin additions)                        [unspecified-high]
├── T13: FeedbackButtons + RuntimeControls + FeedbackTab components  [visual-engineering]

Wave 6 (Frontend Integration — page wiring):
├── T14: MessageBubble streaming + AdminPage 6th tab + OverviewTab   [visual-engineering]

Wave FINAL (After ALL tasks — 4 parallel review agents):
├── F1: Plan compliance audit                                        [oracle]
├── F2: Code quality review                                          [unspecified-high]
├── F3: Real manual QA                                               [unspecified-high]
├── F4: Scope fidelity check                                         [deep]

Critical Path: T1 → T2/T3 → T4/T5/T7 → T9 → T10 → T11 → T12 → T14 → F1-F4
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 4 (Waves 2 and 5)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| T1 | — | T2, T3, T10 | 1 |
| T2 | T1 | T4, T8 | 1 |
| T3 | T1 | T6, T8, T9 | 1 |
| T4 | T2 | T7, T8, T10 | 2 |
| T5 | — | T7, T9 | 2 |
| T6 | T3 | T8, T9 | 2 |
| T7 | T4, T5 | T9, T10 | 2 |
| T8 | T4, T6 | T10 | 3 |
| T9 | T3, T5, T6, T7 | T10 | 3 |
| T10 | T1-T9 | T11-T14 | 4 |
| T11 | T10 | T12, T13 | 5 |
| T12 | T11 | T14 | 5 |
| T13 | T11 | T14 | 5 |
| T14 | T12, T13 | F1-F4 | 6 |
| F1-F4 | T14 | — | FINAL |

### Agent Dispatch Summary

| Wave | Count | Tasks → Categories |
|------|-------|--------------------|
| 1 | 3 | T1 → `quick`, T2 → `quick`, T3 → `quick` |
| 2 | 4 | T4 → `unspecified-high`, T5 → `deep`, T6 → `quick`, T7 → `deep` |
| 3 | 2 | T8 → `quick`, T9 → `deep` |
| 4 | 1 | T10 → `unspecified-high` |
| 5 | 3 | T11 → `quick`, T12 → `unspecified-high`, T13 → `visual-engineering` |
| 6 | 1 | T14 → `visual-engineering` |
| FINAL | 4 | F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep` |

---

## TODOs

> Implementation tasks follow. Each task is self-contained with complete context for delegated agents.
> **A task WITHOUT QA Scenarios is INCOMPLETE. No exceptions.**

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Review all changed/created files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check convention compliance: thin routes (no SQL), service logger tags, config via env vars, frontend through apiClient only. Verify no axios/raw-fetch, no Zustand chat storage, no hardcoded URLs.
  Output: `Files [N clean/N issues] | Conventions [N/N compliant] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill for UI)
  Start Flask server (`SERVE_SPA=true python app.py`). Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-feature integration: stream + feedback on same message, toggle mode mid-conversation, feedback after mode switch. Test edge cases: empty input, very long input, rapid toggle, feedback on same message twice.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual code changes. Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Verify existing `/api/chat` POST endpoint still works unchanged. Flag any unaccounted changes.
  Output: `Tasks [N/N compliant] | Backward Compat [PASS/FAIL] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Task | Commit Message | Files | Pre-commit Check |
|------|---------------|-------|-----------------|
| T1 | `feat(db): add sys_setting and message_feedback tables` | `scripts/migrate_add_rag_tables.sql`, `scripts/init_db.sql` | `mysql` dry-run parse |
| T2 | `feat(models): add admin_settings model for sys_setting CRUD` | `models/admin_settings.py` | `python -c "from models.admin_settings import ..."` |
| T3 | `feat(models): add feedback model for message_feedback CRUD` | `models/feedback.py` | `python -c "from models.feedback import ..."` |
| T4 | `feat(services): add AdminSettings singleton with DB cache` | `services/admin_settings.py` | `python -c "from services.admin_settings import AdminSettings"` |
| T5 | `fix(services): remove duplicate _get_client and add chat_completion methods` | `services/llm_service.py` | `python -c "from services.llm_service import LLMService"` |
| T6 | `feat(services): add feedback_service for rating submission and stats` | `services/feedback_service.py` | `python -c "from services.feedback_service import ..."` |
| T7 | `feat(services): add answer_stream RAG orchestration to chat_service` | `services/chat_service.py`, `models/conversation.py` | `python -c "from services.chat_service import chat_service"` |
| T8 | `feat(routes): add admin toggle and feedback list endpoints` | `routes/admin.py` | `python -c "from routes.admin import admin_bp"` |
| T9 | `feat(routes): add SSE stream and feedback submission endpoints` | `routes/chat.py` | `python -c "from routes.chat import chat_bp"` |
| T10 | `feat(config): add LLM chat configuration and run migration` | `config.py` | `python -c "import config"` + curl smoke tests |
| T11 | `feat(frontend): add streaming types and SSE apiClient helper` | `frontend/src/types/api.ts`, `frontend/src/lib/apiClient.ts` | `cd frontend && npx tsc --noEmit` |
| T12 | `feat(frontend): add streaming and feedback hooks` | `frontend/src/hooks/api/useChat.ts`, `frontend/src/hooks/api/useAdmin.ts` | `cd frontend && npx tsc --noEmit` |
| T13 | `feat(frontend): add FeedbackButtons, RuntimeControls, FeedbackTab` | `frontend/src/components/chat/FeedbackButtons.tsx`, `frontend/src/components/admin/RuntimeControls.tsx`, `frontend/src/components/admin/FeedbackTab.tsx` | `cd frontend && npx tsc --noEmit` |
| T14 | `feat(frontend): integrate streaming in MessageBubble and feedback tab in admin` | `frontend/src/components/chat/MessageBubble.tsx`, `frontend/src/routes/AdminPage.tsx`, `frontend/src/components/admin/OverviewTab.tsx` | `cd frontend && npm run build` |

---

## Success Criteria

### Verification Commands
```bash
# Backend smoke tests (after T10)
curl -s http://localhost:5000/api/admin/llm-chat-toggle | jq .enabled
# Expected: true or false

curl -s -X POST http://localhost:5000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"如何办理居住证","session_id":"test-123"}' \
  --no-buffer
# Expected: data: {"t":"chunk","d":"..."}\n lines ending with data: {"t":"done",...}

curl -s -X POST http://localhost:5000/api/chat/feedback \
  -H "Content-Type: application/json" \
  -d '{"message_id":1,"rating":"up"}'
# Expected: {"success": true}

curl -s http://localhost:5000/api/admin/feedback | jq .total
# Expected: integer >= 0

# Frontend build
cd frontend && npm run build
# Expected: exit 0, no TS errors

# Backward compatibility
curl -s -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"你好","session_id":"compat-test"}'
# Expected: existing JSON response format unchanged
```

### Final Checklist
- [ ] All "Must Have" present (verified by F1)
- [ ] All "Must NOT Have" absent (verified by F1 + F2)
- [ ] All backend endpoints return correct responses (verified by F3)
- [ ] Frontend builds without errors (verified by F2)
- [ ] SSE streaming works end-to-end (verified by F3)
- [ ] Feedback buttons appear on bot messages only (verified by F3)
- [ ] Admin toggle switches mode at runtime (verified by F3)
- [ ] Existing `/api/chat` endpoint unchanged (verified by F4)
- [ ] No duplicate code in llm_service.py (verified by F2)
