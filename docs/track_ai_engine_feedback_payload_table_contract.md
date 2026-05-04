# Track AI Engine Feedback Payload Table Contract

## Purpose

This document defines the planned database contract for storing `artist_feedback_payload` results from `analysis_engine`.

The existing table `track_ai_feedback_payloads` remains reserved for the current `FeedbackPayloadV2` flow.

No SQL has been executed yet.
No Supabase schema change has been applied yet.
No write adapter has been implemented yet.

## Table name

Proposed table:

```text
track_ai_feedback_payloads_engine
```
Separation from existing V2 flow

track_ai_feedback_payloads stays V2-only.

The engine payload must not overwrite the existing V2 payload row.

The engine payload must not use payload_version = 2.

The engine payload must not change the current Track Check, Queue, Unlock, or FeedbackPayloadV2 write flow.

Minimal column contract
Column	Purpose
id	Technical primary key
user_id	Owner / user scope
queue_id	Queue item that produced the engine payload
track_id	Nullable track reference after approval / insert
audio_hash	Nullable audio hash for traceability
payload_schema	Expected value: artist_feedback_payload
payload	Full JSONB root payload from analysis_engine
source	Expected value: analysis_engine_sidecar
engine_run_id	Nullable engine run trace id
created_at	Creation timestamp
updated_at	Last update timestamp
Unique strategy

queue_id should be unique.

Reason:

one queue item should have one current engine payload
retries for the same queue item should update the same logical record
audio_hash is not unique enough because the same audio can be submitted again
track_id is not reliable as the primary key because it may not exist before approval
Unlock gating

Unlock gating should remain required before writing the engine payload.

Reason:

keeps behavior aligned with the existing feedback persistence model
avoids silently expanding stored feedback data
keeps product gating consistent
Future write adapter inputs

A future write adapter should receive:

userId
queueId
trackId nullable
audioHash nullable
payload
payloadSchema from payload.meta.schema
source
engineRunId nullable

Expected payload schema:

artist_feedback_payload
Explicitly not included

This table must not contain:

FeedbackPayloadV2 structures
payload_version = 2
duplicated Queue status or approval decision logic
raw audio data
temp file paths
audio binaries
mandatory Supabase Storage paths
duplicated source-of-truth technical metrics already stored elsewhere
Current implementation status

Current status:

optional engine sidecar exists
sidecar is default-off
isolated runner has been tested successfully
artist_feedback_payload.json can be produced locally
no engine payload write adapter exists yet
no database table exists yet
existing V2 flow remains unchanged
