# Analysis Engine Platform Adapter Progress

## Current status

The analysis_engine has been fachlich aligned against the original PDFs.
Mix basis is completed.
GitHub Action is green.

Latest commits:
- a9ceaf6 Support artist feedback payload in decision adapter
- ee5f8a4 Add isolated analysis engine runner

## Completed in this phase

### 1. Decision read adapter

File changed:
- src/lib/ai/decision-center/artistDecisionPayload.ts

Result:
- The Decision Center adapter can now read the new artist_feedback_payload root schema.
- The new root is detected before the older product_payload / consultant_input / legacy branches.
- Existing legacy handling was left unchanged.
- Tested with a real artist_feedback_payload.json.
- TypeScript passed.

Confirmed output fields:
- summary
- what_works_well
- what_may_be_worth_checking
- score_cards
- structure_movement
- technical_release_checks
- next_step

### 2. Isolated analysis engine runner

File added:
- src/lib/ai/track-check/engine-runner.ts

Result:
- Adds an isolated runner for analysis_engine.
- It is not imported anywhere yet.
- It does not touch worker.ts.
- It does not write Supabase.
- It does not replace FeedbackPayloadV2.
- It runs analysis_engine through python and reads artist_feedback_payload.json.

Successful test:
- IMMUSIC_PYTHON_BIN=/Users/tonipetergugic/immusic/.venv/bin/python
- Runner returned ok: true.
- artist_feedback_payload.json was read successfully.
- stderr was empty.

## Important boundaries

Not done yet:
- No worker integration.
- No Supabase changes.
- No upload changes.
- No payload_version change.
- No OpenAI integration.
- No UI redesign.
- No Write Adapter.
- No FeedbackPayloadV2 replacement.

## Current architecture decision

analysis_engine stays responsible for:
- audio analysis
- artist_feedback_payload generation
- analysis.json / plots / technical output

src stays responsible for:
- Upload
- Queue
- Supabase
- Track creation
- Payload storage
- UI reading

Adapter boundary:
- Read adapter is started.
- Engine runner exists isolated.
- Write adapter is not built yet.

## Next step

Read-only plan the safe worker integration point.

Goal:
Determine how the isolated runner can later be called from the existing track-check worker without replacing the current V2 / Track Check flow.

Likely next file to inspect:
- src/lib/ai/track-check/worker.ts

Do not change yet:
- src/lib/ai/track-check/payload.ts
- Supabase schema
- payload_version
- OpenAI consultant
