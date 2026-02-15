# AI Track Check (IMUSIC) — Architecture & Flow

This folder contains the server-side AI Track Check pipeline.
It is a deterministic, anti-leak system: without unlock, no sensitive metrics are exposed.

## High-Level Pipeline

Upload flow triggers processing via frontend polling:

1) Artist uploads a track
2) Processing page polls:
   - `POST /api/ai/track-check/process-next`
3) The API route delegates work to the worker pipeline:
   - queue → claim → analyze → hardfail → decision → persist → respond
4) Feedback page reads:
   - `GET /api/ai/track-check/feedback?queue_id=...`
5) Detailed payload becomes visible only after unlock:
   - server action unlock → state transitions → payload written

## Entry Points

### Worker Orchestrator (business flow)
- `src/lib/ai/track-check/worker.ts`
This is the central orchestrator responsible for:
- claiming the next queue item
- running technical audio analysis (via audio ingest layer)
- applying hard-fail rules
- making the final decision
- persistence + terminal state
- safe response construction

### API Routes

- `src/app/api/ai/track-check/process-next/route.ts`
  - Called repeatedly from processing UI (polling).
  - Delegates to the worker and returns progress/decision.

- `src/app/api/ai/track-check/feedback/route.ts`
  - Secure feedback fetch.
  - Enforces ownership + anti-leak rules.
  - Without unlock: returns only safe/limited info (no payload).

### Feedback UI

- `src/app/artist/upload/feedback/page.tsx`
  - Server page: loads data and composes UI blocks.

- `src/app/artist/upload/feedback/_components/UnlockPanel.tsx`
  - Server-side unlock action integration (no client component).
  - Must never leak metrics when locked.

## States (Anti-Leak)

The system uses explicit states, e.g.:
- `locked`
- `unlocked_pending`
- `unlocked_ready`

Rules:
- Foreign `queue_id` must never reveal existence/details (404).
- No unlock → no detailed payload.
- Payload creation is deterministic and gated by state.

## Modules (Selected)

- `analyzer.ts` — technical metric extraction (delegates into audio ingest tools)
- `decision.ts` — deterministic decision from extracted metrics
- `hardfail-orchestrator.ts` — hard-fail v2 gating
- `payload.ts` / `write-feedback-unlocked.ts` — payload writing gated by unlock
- `respond-*.ts` — consistent safe responses
- `hash.ts` — stable identity primitives (anti-dup + anti-leak glue)

## Local Testing (Smoke)

- `npx tsc --noEmit`
- `npm run dev`
- Upload a track, watch logs:
  - process-next returns 200
  - metrics print
  - feedback endpoint returns 200 for owned queue
- Verify:
  - locked shows no payload
  - unlock reveals payload
  - no double credit spend
  - no foreign queue access

---
