# ImMusic analysis_engine Completion Status

Stand: 2026-05-03

## Status

The `analysis_engine/` is technically stable and fachlich ausreichend for the next platform-connection phase.

It is not a full professional mastering lab. This is intentional.

The engine currently fulfills the intended first-basis role:

- technical release risk detection
- structure and arrangement suspicion signals
- loudness and dynamics checks
- stereo, mono, phase, and low-end checks
- compact mix-basis suspicion signals
- artist-friendly guidance
- product payload export
- consultant input export
- artist feedback payload export
- contract and audit coverage

## Completed areas

### Structure / Arrangement

Completed:

- beat, downbeat, and bar basis
- section / segment timeline
- repetition score
- contrast score
- transition score
- musical flow summary
- arrangement development summary
- section character summary
- cautious structure listening guidance

### Loudness / Dynamics

Completed:

- integrated LUFS
- loudness range
- true peak
- peak DBFS
- clipped sample count
- short-term LUFS summary
- crest factor
- PLR
- limiter stress summary and timeline
- technical release issue collection

### Stereo / Mono / Phase

Completed:

- phase correlation
- stereo width
- side/mid ratio
- low-end mono loss
- low-band phase correlation
- low-band balance
- left/right full-band balance

### Mix Basis

Completed:

- `mix_basis.py`
- `AnalysisResult.mix_basis`
- `product_payload.technical_metrics.mix_basis`
- `consultant_input.technical_metrics.mix_basis`
- `artist_feedback_payload.technical_details.mix_basis`

Current mix-basis checks:

- `left_right_balance_check`
- `center_focus_tendency`
- `low_mid_mud_tendency`
- `upper_harshness_tendency`

Rules:

- mix-basis checks are suspicion signals only
- mix-basis checks are not release blockers
- mix-basis checks must not override release readiness
- mix-basis checks must not claim hard mix errors

## Explicitly deferred

These are not required before platform connection:

- real masking detection
- washed-out / reverb-depth detection
- strict kick/bass conflict detection
- stem separation
- deep frequency-balance analysis
- genre-specific mix rules
- professional mastering nuance detection

## Explicitly out of first-basis scope

Do not add before platform connection:

- `allin1`
- `madmom`
- `natten`
- hard musical judgments
- taste-based sound judgments
- absolute claims such as "bad drop", "wrong arrangement", or "bad mix"

## Upload metadata

Upload metadata is intentionally not added inside the standalone engine.

Deferred to the future platform adapter:

- artist name
- main genre
- subgenre
- version
- declared BPM
- declared key
- reference artist
- reference track

## Latest implementation commits

- `8fb923a` Add stereo left right balance metric
- `f0b82dd` Add mix basis schema and builder
- `6d01ecb` Compute mix basis in analysis pipeline
- `96bd490` Export mix basis in product payload
- `bca9ab4` Export mix basis in consultant input
- `286b58d` Expose mix basis in artist feedback details
- `36f9f14` Audit mix basis product consultant exports
- `4307b05` Document mix basis artist feedback contract

## Verified checks

Latest verified checks:

- `python3 -m py_compile $(find analysis_engine -name "*.py")`
- `python3 -m analysis_engine.audit_product_consultant_exports`
- `python3 -m analysis_engine.audit_artist_feedback_payload`
- `python3 analysis_engine/audit_artist_feedback_payload_coverage.py`
- GitHub Action green
- Git status clean after push

## Current decision

The engine is ready for the next planning step toward platform connection.

Before implementation of platform wiring, the next step should be read-only planning of the adapter boundary:

- what the platform provides
- what the engine receives
- what the engine returns
- which metadata is added outside the standalone engine
- which payload becomes the stable upload result

No UI, Supabase, Upload, or OpenAI code should be changed before that adapter boundary is defined.
