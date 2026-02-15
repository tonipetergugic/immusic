IMUSIC AI Track Check – Refactor Landing Zone

Goal:
Refactor ONLY (structure). No behavior changes, no gate changes, no business logic changes.

Target separation (future steps):
- queue/terminal state transitions (tracks_ai_queue updates)
- feature extraction (ffmpeg/ffprobe DSP)
- rule engine (hard-fail reasons)
- decision (approved/rejected/pending mapping)
- persistence (track_ai_private_metrics, track_ai_private_events, hard_fail_reasons)
- payload builder (paid unlock -> buildFeedbackPayloadV2Mvp)

Rule:
Move code in small, verified steps: 1 function/group per step, identical inputs/outputs.
