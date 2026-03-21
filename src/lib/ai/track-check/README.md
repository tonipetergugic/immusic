# AI Track Check (IMUSIC) — System Overview (Single Source of Truth)

This folder contains the server-side **AI Track Check** pipeline.
Core goals:
- Deterministic processing (same input → same output)
- Strict **anti-leak** (no unlock → no detailed payload)
- Clear module boundaries (easy to extend later without regressions)

---

## 1) High-level Flow (Current Real Flow)

### Upload → Processing (polling)
1. Artist uploads a **WAV** file
2. Processing UI polls:
   - `POST /api/ai/track-check/process-next`
   - Source: `src/app/artist/upload/processing/ProcessingClient.tsx`

### Worker pipeline (business orchestration)
3. `process-next` delegates to the worker orchestrator:
   - `src/lib/ai/track-check/worker.ts`
4. Worker processes the queue item in this real order:
   - queue recovery
   - fetch pending queue item
   - claim `pending -> processing`
   - download ingest WAV
   - ensure audio hash
   - write temp WAV
   - run early technical gates
   - extract private metrics
   - persist private metrics/events
   - apply hard-fail gate
   - duplicate check
   - analyzer decision
   - transcode WAV -> MP3
   - upload MP3
   - insert approved track
   - write unlock-gated feedback payload if applicable
   - respond with terminal state

### Feedback (anti-leak gated)
5. Feedback page loads:
   - `GET /api/ai/track-check/feedback?queue_id=...`
6. Detailed payload becomes visible only after unlock:
   - server action unlock → state transition → payload written

---

## 2) Entry Points (What calls what)

### Worker Orchestrator (main)
- `src/lib/ai/track-check/worker.ts`

Responsibilities:
- Validate expected queue inputs
- Run technical ingest gates
- Run metrics extraction
- Persist private metrics/events
- Apply hard-fail rules
- Check duplicates
- Run analyzer decision
- Insert approved track
- Produce safe responses (no leaks)

### API Routes
- `src/app/api/ai/track-check/process-next/route.ts`
  - Triggered by UI polling
  - Runs queue recovery
  - Fetches/claims next queue item
  - Delegates to worker
- `src/app/api/ai/track-check/feedback/route.ts`
  - Secure feedback fetch endpoint
  - Enforces ownership and unlock gating
  - Must never leak metrics when locked

### Feedback UI + Unlock
- `src/app/artist/upload/feedback/page.tsx`
- `src/app/artist/upload/feedback/_components/UnlockPanel.tsx`
- `src/app/artist/upload/feedback/actions.ts`

---

## 3) Queue & State Model

### Queue states
- `pending`
- `processing`
- `approved`
- `rejected`

### Recovery model
`tracks_ai_queue.processing_started_at` is the real time basis for stuck recovery.

That means:
- claim sets `processing_started_at`
- stuck recovery checks `processing_started_at < cutoff`
- terminal/reset paths clear `processing_started_at`

This avoids incorrect recovery based on `created_at`.

---

## 4) Anti-Leak Rules (Non-negotiable)

### Hard rules
- Foreign `queue_id` must not reveal existence
- No unlock → no detailed payload (no private metrics/events/timeline)
- Unlock must not double-charge credits
- Payload writing must be deterministic and tied to final audio hash
- Technical private metrics stay server-side unless unlock exists

---

## 5) Important Modules (Current Real Responsibilities)

### Queue / Claim / Recovery
- `queue-fetch.ts`
  - Fetches the oldest pending queue item
- `queue-claim.ts`
  - Claims `pending -> processing`
  - Sets `processing_started_at`
- `queue-recovery.ts`
  - Resets truly stuck `processing` rows back to `pending`
  - Uses `processing_started_at`, not `created_at`
- `queue.ts`
  - Marks approved / rejected / pending reset
  - Clears `processing_started_at` on terminal/reset paths

### Audio / ingest layer
Worker calls technical audio utilities mainly through:
- `@/lib/audio/ingestTools`

Important technical operations include:
- duration probe
- silence detection
- DC offset detection
- WAV -> MP3 transcode

### Metrics extraction
- `feature-extraction.ts`
  - Extracts private technical metrics from temp WAV
- `metrics-mapping.ts`
  - Maps extracted values into the private metrics shape
- `persist-orchestrator.ts`
  - Passes extracted metrics into persistence
- `private-persistence.ts`
  - Writes private metrics/events to DB
  - Core reject-relevant metrics remain strict
  - Advanced analysis metrics may persist as `null` if unavailable

### Hard-fail gate
- `hardfail-orchestrator.ts`
- `rules.ts`

Current hard-fail policy is intentionally narrow:
- extreme True Peak
- massive clipping
- early technical failures
- duplicate audio

`dynamic_collapse` is no longer a hard-fail rule.

### Decision layer
- `decision.ts`
  - Terminal technical rejection helpers
- `analyzer.ts`
  - Conservative analyzer decision layer
  - Uses a small verified metrics contract from the worker
  - Rejects only on confirmed defect clusters
  - Does not emit fail-codes or detailed reasons

### Hash / Duplicate protection
- `hash.ts`
  - Stable audio hash generation / queue hash handling
- `duplicate.ts`
  - Duplicate checks against queue + tracks

### Persistence + payload
- `persist-orchestrator.ts`
- `private-persistence.ts`
- `write-feedback-unlocked.ts`
- `payload.ts`

### Response helpers
- `respond-*.ts`
  - Centralized safe response patterns

---

## 6) What the Engine Currently Decides

### Current real decision model
At the moment, the engine effectively does this:

1. Early technical gate:
   - reject if clearly broken
2. Hard-fail rules:
   - reject only on narrow objective failures
3. Duplicate check:
   - reject duplicate audio
4. Analyzer decision:
   - evaluates conservative defect clusters
   - does not judge genre/style/preferences
   - rejects only when multiple problem groups are confirmed
5. Otherwise:
   - approve

So the current system is:
- a real technical gate
- a real duplicate gate
- a real private metrics pipeline
- a real conservative analyzer decision layer

---

## 7) Extension Points (Safe future work)

### Add a new metric
1. Extract it in `feature-extraction.ts`
2. Map it in `metrics-mapping.ts`
3. Persist it server-side in `private-persistence.ts`
4. Expose it only through unlock-gated payload if needed
5. Render it in feedback UI only after unlock

### Add a new hard-fail rule
1. Implement it in `rules.ts`
2. Keep it strictly limited to clearly objective failures
3. Ensure locked state reveals nothing detailed

### Refine the analyzer carefully
The current analyzer is intentionally conservative.

Future refinements may improve:
- threshold calibration using real test tracks
- multi-genre robustness
- reduction of false rejects / false approvals
- additional defect-cluster confirmation logic

Any refinement must keep these rules:
- no genre/style judging
- no single-metric reject
- no detail leakage in locked state

---

## 8) Local Smoke Test Checklist

- `npx tsc --noEmit`
- `npm run dev`

Verify:
- upload creates queue item
- polling triggers `process-next`
- claim sets `processing_started_at`
- stuck recovery only affects truly stuck processing jobs
- duplicate handling works
- clearly broken tracks can be rejected
- loud but still usable tracks can still be approved
- approved path inserts track and cleans ingest WAV
- duplicate/error paths do not leave orphan MP3s
- locked feedback reveals no private payload
- unlock reveals payload

---

END OF FILE.
