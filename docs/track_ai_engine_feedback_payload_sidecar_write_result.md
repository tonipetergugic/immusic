# Engine feedback payload sidecar write result

## Status

The engine feedback payload sidecar write has been verified locally.

Confirmed Supabase target table:

`public.track_ai_feedback_payloads_engine`

Confirmed written values:

- `payload_schema = artist_feedback_payload`
- `source = analysis_engine_sidecar`

Confirmed test queue:

`01d8ea18-f849-4123-b757-259bdb4ae437`

## What was verified

- Next.js worker reached the analysis engine sidecar block.
- The analysis engine generated a local `artist_feedback_payload.json`.
- The generated payload was written to `public.track_ai_feedback_payloads_engine`.
- The write is server-side.
- The write no longer depends on unlock timing.
- Existing `track_ai_feedback_payloads` / FeedbackPayloadV2 flow remains separate.

## Required local dev command

For local sidecar testing, start the dev server with:

```bash
IMMUSIC_ANALYSIS_ENGINE_SIDECAR=1 IMMUSIC_PYTHON_BIN=.venv/bin/python npm run dev
Problems found during verification
1. Broken local ffprobe

Initial processing failed because local Homebrew ffprobe could not load the expected x265 library:

Library not loaded: /opt/homebrew/opt/x265/lib/libx265.215.dylib

Fix used locally:

brew reinstall x265 ffmpeg
ffprobe -version
ffmpeg -version
2. Wrong Python interpreter for the analysis engine

The engine runner defaults to:

python3

That interpreter did not have the required Python package:

ModuleNotFoundError: No module named 'soundfile'

The project virtualenv had the package:

.venv/bin/python -c "import soundfile as sf; print(sf.__version__)"

Confirmed version:

0.13.1

Therefore local sidecar testing must use:

IMMUSIC_PYTHON_BIN=.venv/bin/python

Debug logging cleanup

Temporary verification logs were removed after the successful write test.

Kept:

analysis_engine_sidecar_failed

Removed:

analysis_engine_sidecar_env
analysis_engine_sidecar_ok
analysis_engine_sidecar_result_failed

## Reader integration

Implemented commit:

`234996e Read engine feedback payload alongside legacy payload`

Changed file:

`src/lib/ai/track-check/read-feedback-state.ts`

Result:

- `readFeedbackState()` now reads `public.track_ai_feedback_payloads_engine` after a valid unlock.
- Existing `payload` remains the legacy/V2 payload.
- New `engine_payload` returns the `artist_feedback_payload` from the engine table when available.
- New `primary_payload_source` reports `engine`, `legacy`, or `none`.
- Existing feedback UI and Decision Center remain unchanged.

Runtime verification:

- Test queue: `01d8ea18-f849-4123-b757-259bdb4ae437`
- API returned `feedback_state = unlocked_ready`
- API returned `primary_payload_source = engine`
- API returned `engine_payload.meta.schema = artist_feedback_payload`

Not implemented yet
Reader integration for the new engine table is implemented as an additional unlocked read in `readFeedbackState()`.
No UI integration.
No Decision Center integration.
No new feedback page integration.
No OpenAI flow change.
No automatic backfill for old queue rows.
