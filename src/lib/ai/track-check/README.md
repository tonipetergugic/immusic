# AI Track Check (IMUSIC) — System Overview (Single Source of Truth)

This folder contains the server-side **AI Track Check** pipeline.
Core goals:
- Deterministic processing (same input → same output)
- Strict **anti-leak** (no unlock → no detailed payload)
- Clear module boundaries (easy to extend later without regressions)

---

## 1) High-level Flow (End-to-End)

### Upload → Processing (polling)
1. Artist uploads a track
2. Processing UI polls:
   - `POST /api/ai/track-check/process-next`
   - Source: `src/app/artist/upload/processing/ProcessingClient.tsx`

### Worker pipeline (business orchestration)
3. `process-next` delegates to the worker orchestrator:
   - `src/lib/ai/track-check/worker.ts`
4. Worker processes the queue item:
   - queue claim → download/prepare → analyze → hardfail → decision → persist → respond

### Feedback (anti-leak gated)
5. Feedback page loads:
   - `GET /api/ai/track-check/feedback?queue_id=...`
6. Detailed v2 payload becomes visible only after unlock:
   - server action unlock → state transition → payload written

---

## 2) Entry Points (What calls what)

### Worker Orchestrator (main)
- `src/lib/ai/track-check/worker.ts`
Responsibilities:
- Validate ownership / expected inputs from queue item
- Call technical ingest/analyzers (audio layer)
- Apply hard-fail rules (gate v1)
- Compute deterministic decision
- Persist results + terminal state
- Produce safe responses (no leaks)

### API Routes
- `src/app/api/ai/track-check/process-next/route.ts`
  - Triggered by UI polling
  - Delegates to worker + returns progress/decision
- `src/app/api/ai/track-check/feedback/route.ts`
  - Secure feedback fetch endpoint
  - Enforces ownership and unlock gating
  - Must never leak metrics when locked

### Feedback UI + Unlock
- `src/app/artist/upload/feedback/page.tsx` (server page: load + compose)
- `src/app/artist/upload/feedback/_components/UnlockPanel.tsx` (server component)
- `src/app/artist/upload/feedback/actions.ts` (server action unlock)

---

## 3) States & Anti-Leak Rules (Non-negotiable)

### Core states (conceptual)
- `locked` → no detailed metrics/payload returned
- `unlocked_pending` → unlock initiated, payload not yet available
- `unlocked_ready` → payload available and can be rendered

### Hard rules
- Foreign `queue_id` must not reveal existence (return 404 / not found)
- No unlock → no v2 payload (no metrics, no events, no timeline)
- Unlock must not double-charge credits
- Payload writing must be deterministic and tied to final audio hash

---

## 4) Important Modules (What each does)

### Queue / Claim / Recovery
- `queue-claim.ts` / queue helpers
  - Acquire the next pending item safely
- `queue-recovery.ts`
  - Defensive recovery logic (if present)

### Audio ingest layer (technical utilities)
Worker calls the audio layer via:
- `@/lib/audio/ingestTools` (facade)
  - Re-exports from `@/lib/audio/ingest` (the module orchestrator)

Audio module orchestrator:
- `src/lib/audio/ingest/index.ts`
See: `src/lib/audio/ingest/README.md`

### Analyzer (metrics extraction)
- `analyzer.ts`
  - Calls ingest functions and computes extracted metrics
  - Outputs raw metrics in a stable shape

### Hard-fail gate (v2)
- `hardfail-orchestrator.ts`
  - Applies hard-fail matrix and produces reasons/events
  - Must be "gate-only": reject only on clearly broken audio/technical failures

### Decision (deterministic)
- `decision.ts` + `rules.ts`
  - Converts extracted metrics + hardfail results into final decision:
    - APPROVED / REJECTED
  - No UI, no persistence here

### Persistence + terminal states
- `persist-orchestrator.ts` / `private-persistence.ts` / `persist-fail.ts`
  - Write results into DB
  - Ensure terminal states are consistent

### Payload (unlock gated)
- `write-feedback-unlocked.ts`
  - Writes the v2 payload only when unlocked
- `payload.ts`
  - Builds deterministic payload content for rendering

### Hash / Duplicate protection
- `hash.ts`
  - Stable identity primitives (anti-leak glue + dedupe inputs)
- `duplicate.ts`
  - Duplicate checks / responses

### Response helpers (safe responses)
- `respond-*.ts`
  - Centralizes safe response patterns to avoid leaks

---

## 5) Extension Points (How to add new things safely)

### Add a new metric (recommended workflow)
1) Add extraction in `analyzer.ts`
2) Map it (if needed) in `metrics-mapping.ts`
3) Update decision rules in `rules.ts` / `decision.ts` (if relevant)
4) Persist it only server-side (no UI leak)
5) Expose it in v2 payload only when unlocked:
   - `payload.ts` / `write-feedback-unlocked.ts`
6) Render it in feedback UI panels (server components only)

### Add a new hard-fail rule
1) Implement in `hardfail-orchestrator.ts` (gate-only)
2) Add a reason code + severity mapping
3) Ensure locked state does NOT reveal details

### Add a new feedback panel
- Implement in:
  - `src/app/artist/upload/feedback/_components/*`
- Only read v2 payload if unlocked (server-side)

---

## 6) Local Smoke Test Checklist

- `npx tsc --noEmit`
- `npm run dev`
- Upload a track:
  - processing page polls process-next
  - worker logs metrics
- Open feedback page:
  - locked shows no payload
  - unlock reveals payload
  - no foreign queue access
  - no double credit spend

---

END OF FILE.
