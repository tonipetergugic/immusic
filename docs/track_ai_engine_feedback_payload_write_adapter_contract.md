# Track AI Engine Feedback Payload Write Adapter Contract

## Purpose

This document defines the planned write adapter contract for persisting `artist_feedback_payload` results from `analysis_engine`.

The adapter is not implemented yet.

## Boundary

`analysis_engine` remains a pure audio analysis system.

`src` remains responsible for:

- Queue context
- Supabase writes
- Unlock gating
- Platform integration
- UI consumption

The write adapter must not change the existing `FeedbackPayloadV2` flow.

## Target table

Planned target table:

```text
track_ai_feedback_payloads_engine
```

The existing table track_ai_feedback_payloads remains V2-only.

Adapter responsibility

The future adapter should:

receive a completed artist_feedback_payload
validate payload.meta.schema
preserve unlock gating
write one engine payload per queue_id
update the existing row for the same queue_id on retry
keep the V2 payload untouched
Adapter inputs

Required inputs:

userId
queueId
payload
payloadSchema
source

Optional inputs:

trackId
audioHash
engineRunId

Expected values:

payloadSchema = artist_feedback_payload
source = analysis_engine_sidecar
Adapter output

The adapter should return a small result object:

ok: true if the write succeeded or was skipped by gating
ok: false if validation or persistence failed
clear error code
no full payload duplication in logs
Unlock gating

The adapter must keep unlock gating.

If feedback is not unlocked, the adapter must not write the engine payload.

This keeps the new engine payload aligned with the existing feedback persistence model.

Idempotency

The adapter should use queue_id as the idempotency key.

Expected behavior:

first write inserts a row
repeated write for the same queue_id updates the existing row
no multiple engine payload rows for the same queue item
Explicit non-goals

The adapter must not:

write into track_ai_feedback_payloads
overwrite FeedbackPayloadV2
use payload_version = 2
change Queue status
change Track Check approval or rejection decisions
write raw audio data
store temp file paths
trigger OpenAI
update UI state directly
Current implementation status

Current status:

optional sidecar exists
sidecar is default-off
isolated runner is tested
engine output can be produced locally
table contract is documented
SQL draft is documented
write adapter is not implemented
Supabase table does not exist yet
existing V2 flow remains unchanged
