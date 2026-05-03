# Artist Feedback Payload Contract

This document defines the current product-facing contract for `artist_feedback_payload.json`.

The goal of this payload is to give artists clear, cautious, technically grounded feedback. It must not act like a full professional mastering lab and must not make absolute musical judgments.

## 1. Purpose

`artist_feedback_payload.json` is the artist-facing feedback layer.

It sits after:

```text
analysis.json
→ artist_decision_payload.json
→ artist_feedback_payload.json
```

## 2. Top-level blocks

### Artist-facing blocks

These blocks are intended to guide the product experience:

```text
track
release
artist_guidance
listening_guidance
ai_consultant
meta
```

### Internal / evidence blocks

These blocks may remain in the local payload for debugging, meters, validation, and future detailed views, but they should not drive the main artist-facing summary directly:

```text
engine_signals
technical_details
```

### meta

`meta` contains product and pipeline metadata for the generated payload.

It is not primary artist-facing copy and should not be rendered as feedback text in the artist UI.

Current fields:

```text
source
schema
created_at
warnings
```

Field meanings:

- `source`: identifies the payload producer. Current value: `analysis_engine`.
- `schema`: identifies the payload schema name. Current value: `artist_feedback_payload`.
- `created_at`: reserved timestamp field. It may currently be `null` in local engine output.
- `warnings`: payload-level generation warnings. It may be an empty list.

Rules:

- `meta` should be kept available for adapters, debugging, validation, and future platform ingestion.
- UI must not treat `created_at: null` as an analysis problem.
- UI must not show `schema`, `source`, or empty warnings as artist feedback.
- `warnings` is not the same as release warnings or technical warnings.

## 3. track

Purpose: basic track context.

Typical content:

- file name
- duration
- sample rate
- channels
- declared or detected metadata when available

This block should stay simple and factual.

## 4. release

Purpose: release decision and technical release checks.

Source: `artist_decision_payload`.

Main content:

- `track_status`
- `release_readiness`
- `critical_warnings`
- `technical_release_checks`
- `next_step`

Rules:

- `release` is the decision/check layer.
- It should answer whether the track looks ready, close, problematic, blocked, or incomplete.
- It should not become a detailed mix explanation layer.
- Detailed explanations belong in `artist_guidance`.

## 5. artist_guidance

Purpose: artist-friendly explanation layer.

Current intended blocks:

- `structure_summary`
- `section_character_summary`
- `arrangement_development_summary`
- `musical_flow_summary`
- `score_context`
- `section_timeline`
- `structure_overview`
- `technical_overview`
- `mix_overview`

### structure_overview

Purpose: short artist-facing structure and arrangement summary.

It should summarize relevant structure, movement, density, development, or repetition observations without making absolute musical judgments.

### technical_overview

Purpose: short artist-facing technical release summary.

Source: `release`.

It should summarize release-relevant technical risks from:

- `release_readiness`
- `critical_warnings`
- `technical_release_checks`
- `next_step`

It should not duplicate raw meters.

### mix_overview

Purpose: short artist-facing mix translation summary.

Source: `technical_details`.

Current signal groups:

- `low_end`
- `stereo`
- `spectral_balance`
- `dynamics`

Current possible focus IDs:

- `low_end_translation_check`
- `stereo_translation_check`
- `limiter_pressure_check`
- `limiter_headroom_stress_check`
- `low_mid_balance_check`
- `upper_balance_check`

Rules:

- It is a cautious translation overview, not a final mix diagnosis.
- It may suggest reference checks, mono checks, loud-section checks, or export focus.
- It must not claim that a mix is objectively bad.
- It should use wording such as "may", "suggests", "check", and "reference-check".

## 5.1 `structure_summary` field contract

`artist_guidance.structure_summary` is a structure detail block for neutral section evidence.

Path:

```python
payload["artist_guidance"]["structure_summary"]
```

Purpose:

- provide neutral detected section spans
- provide readable structure signals
- provide raw score evidence for internal/detail views
- support UI timelines and consultant context without forcing musical labels

It is not a fixed song-form diagnosis.

### Fields

```text
section_count
sections
readable_signals
raw_scores
labeling_note
```

### `section_count`

Number of detected neutral structure sections.

UI rule:

- may be shown as neutral section count
- must not imply official song parts
- do not label sections as intro, verse, chorus, drop, breakdown, build, or outro from this alone

### `sections`

Array of neutral detected structure sections.

Current section fields:

```text
index
start_sec
end_sec
duration_sec
start_bar
end_bar
length_bars
```

Usage rules:

- `start_sec`, `end_sec`, and `duration_sec` may support timeline rendering
- bar fields are internal/detail evidence
- bar fields should not be the primary artist-facing language
- section boundaries are detected structure spans, not guaranteed musical part labels

### `readable_signals`

Artist-readable mapping of the raw structure scores.

Current fields:

```text
material_reuse
form_contrast
transition_clarity
```

Current values may include:

```text
high
moderate
low
unavailable
```

Meaning:

- `material_reuse`: cautious signal for arrangement/material reuse
- `form_contrast`: cautious signal for detected section-shape contrast
- `transition_clarity`: cautious signal for clarity of accepted structure changes

Do not present these as quality judgments.

### `raw_scores`

Internal numeric score evidence.

Current fields:

```text
repetition_score
contrast_score
transition_score
```

Usage rules:

- can be used for debug/detail/consultant grounding
- should not be shown without explanation
- should not be used as a standalone artist-facing verdict

### `labeling_note`

Safety instruction for consumers.

It must be respected by UI, AI Consultant, and future adapters.

---

## 5.2 `structure_overview` field contract

`artist_guidance.structure_overview` is the artist-facing summary of the structure and movement guidance.

Path:

```python
payload["artist_guidance"]["structure_overview"]
```

Purpose:

- give one safe structure-related headline
- provide a cautious observation
- provide a focused listening instruction
- optionally point to a safe time span

This is the preferred artist-facing entry point for structure guidance.

### Fields

```text
status
headline
main_observation
listening_focus
confidence
timeline_hint
```

### `status`

Availability state of the overview.

Current values may include:

```text
available
limited
unavailable
```

Meaning:

- `available`: enough structure/listening evidence is available for a normal artist-facing overview.
- `limited`: only partial structure context is available; UI may show a cautious fallback overview.
- `unavailable`: no reliable structure overview can be produced.

Rules:

- UI must treat `limited` as artist-facing but cautious.
- `limited` must not be displayed as a problem or warning by itself.

### `headline`

Short artist-facing summary.

Rules:

- must be cautious
- must not claim a musical defect
- must not diagnose missing drops, weak songwriting, repeated samples, or bad arrangement

### `main_observation`

Plain-language observation derived from available structure and movement evidence.

Rules:

- should describe what the engine can safely observe
- should avoid internal score names
- should avoid absolute claims

### `listening_focus`

Artist-facing listening instruction.

Rules:

- should tell the artist what to check
- should be framed as reference listening
- should mention declared genre when useful
- should not prescribe a creative decision

### `confidence`

Confidence level for the overview.

Current values may include:

```text
low
medium
high
```

### `timeline_hint`

Optional plain-language time-span hint.

Usage rules:

- safe to show as a listening focus
- should be phrased as "may be worth checking"
- must not be shown as proof that the span is wrong

---

## 5.3 `musical_flow_summary` field contract

`artist_guidance.musical_flow_summary` is a cautious movement summary based on energy and density development.

Path:

```python
payload["artist_guidance"]["musical_flow_summary"]
```

Purpose:

- summarize energy movement
- summarize density movement
- identify broad movement profiles
- support listening checks and consultant grounding

It does not diagnose composition quality, melody, hooks, drops, loops, samples, or songwriting.

### Fields

```text
status
energy_movement
energy_direction
density_movement
density_direction
movement_signal
movement_profile
possible_repeated_structure_focus
listening_check
evidence_summary
wording_note
```

### Movement fields

Current movement and direction values may include:

```text
strong
moderate
varied
noticeable
rising
falling
stable
unavailable
```

Usage rules:

- describe energy/density tendencies only
- do not translate directly into quality judgments
- do not claim that a track lacks development from these fields alone

### `movement_profile`

Current values may include:

```text
combined_lift
energy_lift_with_limited_density_lift
mixed_motion
variable_without_clear_lift
unavailable
```

Usage rules:

- use only as cautious movement category
- safe for consultant grounding
- avoid exposing raw enum names directly in UI

### `possible_repeated_structure_focus`

Boolean caution flag.

Rules:

- this is not proof of repetition
- this is not proof of loop/sample reuse
- if used, frame only as a listening check

### `listening_check`

Artist-facing listening instruction.

Rules:

- safe to show
- should remain cautious
- should not become an automated verdict

### `evidence_summary`

Internal/detail evidence.

Current fields may include:

```text
energy_range_lu
density_cv
energy_point_count
density_point_count
energy_direction
density_direction
```

Nested direction evidence may include:

```text
early_avg_lufs_s
late_avg_lufs_s
delta_lu
early_avg_density_per_sec
late_avg_density_per_sec
delta_density_per_sec
```

Usage rules:

- can be used for debug/detail views
- should not be shown raw without explanation
- should not be used as standalone artist-facing text

### `wording_note`

Safety instruction for wording.

Must be respected by UI, AI Consultant, and future adapters.

---

## 5.4 `arrangement_development_summary` field contract

`artist_guidance.arrangement_development_summary` is a cautious arrangement-development evidence block.

Path:

```python
payload["artist_guidance"]["arrangement_development_summary"]
```

Purpose:

- summarize broad development signal
- summarize variation signal
- describe the larger journey shape
- identify possible longer central spans for listening checks

It is not proof of weak songwriting, missing drops/builds, repeated melody, loop repetition, or sample reuse.

### Fields

```text
status
reason
development_signal
variation_signal
journey_shape
possible_low_contrast_arrangement_focus
possible_extended_core_arrangement_span
extended_core_arrangement_span_evidence
listening_check
wording_note
```

### `status`

Availability state.

Current values may include:

```text
available
unavailable
```

When unavailable, `reason` may explain why the summary could not be built.

Unavailable handling note:

- `journey_shape` is only expected when `arrangement_development_summary.status` is `available`.
- If `status` is `unavailable`, `journey_shape` may be `null` or absent.
- `unavailable` means the engine did not have a stable enough structure/section-character basis to build this summary.
- It must not be shown as an artist-facing quality judgment.

### Signal fields

Current values may include:

```text
noticeable
moderate
varied
changing
alternating
unavailable
```

Usage rules:

- use as cautious arrangement evidence
- do not present as a creative verdict
- do not imply the arrangement is wrong

### `possible_low_contrast_arrangement_focus`

Boolean caution flag.

Rules:

- not proof of low musical quality
- not proof of missing contrast
- may support a focused listening check only

### `possible_extended_core_arrangement_span`

Boolean caution flag.

Rules:

- not proof that a section is too long
- not proof that development is missing
- may support a focused listening check only

### `extended_core_arrangement_span_evidence`

Optional evidence object for a longer detected central span.

Current fields may include:

```text
segment_index
start_sec
end_sec
start_time
end_time
duration_sec
duration_share
bars
relative_role
movement
energy_level
density_level
```

Usage rules:

- `start_time` and `end_time` are safe for artist-facing time hints
- raw bars and duration share are detail/evidence fields
- do not expose as proof of a problem

### `listening_check`

Artist-facing listening instruction.

Rules:

- safe to show
- should remain cautious
- should ask the artist to verify development, variation, tension, or lift by listening

### `wording_note`

Safety instruction for wording.

Must be respected by UI, AI Consultant, and future adapters.

---

## 5.5 `score_context` field contract

`artist_guidance.score_context` explains how structure scores should be interpreted.

Path:

```python
payload["artist_guidance"]["score_context"]
```

Purpose:

- prevent score misuse
- explain score meanings
- keep UI and AI Consultant wording aligned

### Fields

```text
scale
repetition_score
contrast_score
transition_score
```

### Rules

- always keep score explanations close to any exposed score
- do not show raw scores without context
- do not treat scores as musical quality ratings
- do not treat scores as genre-specific pass/fail rules

Current meanings:

- `repetition_score`: bar-level arrangement/material reuse; not melodic monotony
- `contrast_score`: structural form contrast based on section shape; not sound, melody, density, or energy contrast
- `transition_score`: transition and change clarity based on accepted structural change points

## 6. listening_guidance

Purpose: concrete artist listening checks.

Rules:

- Each entry should be actionable.
- Guidance should be based on available structure or technical evidence.
- Timeline hints are allowed when they point to a useful listening span.
- Avoid duplicate guidance for the same underlying issue.

## 7. engine_signals

Purpose: internal or evidence-oriented structure signals.

This block can help with validation and future detail pages, but should not be treated as the main artist-facing product contract.

### Usage rules

- Do not use `engine_signals` as primary artist-facing rendered content.
- Do not present `engine_signals` as a standalone warning, verdict, or quality judgment.
- Intended uses include debugging, validation, deeper detail views, consultant grounding, and future internal tooling.

### Relationship to `artist_guidance.structure_summary`

- `artist_guidance.structure_summary` is the artist-facing structure detail block (neutral section evidence and related context).
- `engine_signals` is a reduced internal evidence mirror derived from `consultant_input`. It supports the same broad structure story but is not a substitute for showing `structure_summary` to artists.

### Current top-level keys

Path:

```text
payload["engine_signals"]
```

Current keys:

```text
structure_scores
readable_structure_signals
sections
```

- `structure_scores`: compact score-related evidence aligned with consultant structure inputs (for example segment counts and structure scores). Individual numeric fields may be `null` when reliable structure values are not available.

- `readable_structure_signals`: cautious categorical structure signal levels derived from the readable signals in `structure_summary` (for example material reuse, form contrast, transition clarity).

- `sections`: neutral detected structure section spans aligned with `structure_summary` sections. The list may be empty when no sections are available.

Presence rules:

- These keys are always present on the `engine_signals` object. Contents may still be empty objects, empty lists, or include `null` fields when the analysis does not provide reliable values. Empty or `null` content must not be treated as an error by UI, adapters, or the AI Consultant on its own.

This section intentionally does not define a full nested schema for these objects.

## 7.1 `technical_overview` field contract

`artist_guidance.technical_overview` is the artist-facing technical release overview.

Current path:

```text
payload["artist_guidance"]["technical_overview"]
```

Purpose:

- summarize the most important technical release/export risk
- keep the wording understandable for artists
- separate technical release checks from broader mix-translation advice

Current fields:

```text
status
headline
main_observation
listening_focus
export_focus
confidence
```

### `status`

Overall technical overview status.

Current values may include:

- `ok`
- `warning`
- `problem`
- `unavailable`

### `headline`

Short artist-facing summary.

Rules:

- Use clear release/export language.
- Do not overstate non-blocking warnings.
- Do not describe musical quality.

### `main_observation`

Main technical observation.

Examples of valid topics:

- True Peak above 0.0 dBTP
- tight source headroom
- clipped samples
- very low peak-to-loudness range
- no visible major technical release risk

Rules:

- May include concrete technical values when they are useful.
- Keep the explanation short.
- Avoid raw debug-style field names.

### `listening_focus`

Artist-facing listening check connected to the technical observation.

Examples:

- listen for clipping
- listen for harshness
- listen for limiter pressure
- listen for loss of punch or flattened impact

### `export_focus`

Practical export or mastering action.

Examples:

- review limiter ceiling
- leave safer peak headroom
- review limiter pressure
- no specific export correction suggested

### `confidence`

How reliable the overview is based on available technical checks.

Current values may include:

- `low`
- `medium`
- `high`

## 7.2 `mix_overview` field contract

`artist_guidance.mix_overview` is the artist-facing mix-translation overview.

Current path:

```text
payload["artist_guidance"]["mix_overview"]
```

Purpose:

- summarize the most useful mix/listening focus
- help the artist run a focused reference pass
- avoid turning mix evidence into an absolute judgment

Current possible fields:

```text
status
headline
main_observation
listening_focus
export_focus
confidence
available_signal_groups
evidence
source_focus_id
```

Field presence rules:

- `status`, `headline`, `main_observation`, `listening_focus`, `export_focus`, and `confidence` are the core fields.
- `available_signal_groups` is present when mix-related signal groups are available.
- `available_signal_groups` may be omitted when `status` is `unavailable`.
- `evidence` is only present when a dominant mix-translation focus was selected.
- `source_focus_id` is only present when a dominant mix-translation focus was selected.
- If `status` is `available` but no dominant focus was selected, `available_signal_groups` may be present while `evidence` and `source_focus_id` are omitted.
- Missing `evidence` or `source_focus_id` must not be treated as an error by UI, adapters, or the AI Consultant.
- Missing `evidence` or `source_focus_id` means: no single dominant mix focus was selected from the available signals.

### `status`

Availability/status of the mix overview.

Current values may include:

- `available`
- `unavailable`

### `headline`

Short artist-facing mix/listening-check title.

Rules:

- Use cautious wording.
- Prefer "Check whether..." or "Reference-check...".
- Do not claim the mix is objectively bad or wrong.

### `main_observation`

Main mix-related observation.

Rules:

- Keep the wording cautious.
- Present the signal as something worth checking, not as proof of a defect.

### `listening_focus`

Artist-facing reference-listening instruction.

Examples:

- check translation on headphones, small speakers, and mono
- compare bass, kick, and lower body against a trusted reference
- check whether transients, groove, and impact still feel natural

### `export_focus`

Practical mix/master export attention point.

Examples:

- review low and low-mid balance if the mix feels crowded
- review limiter pressure and final level before export
- no specific mix-balance correction suggested

### `confidence`

How reliable the mix overview is based on available signal groups.

Current values may include:

- `low`
- `medium`
- `high`

### `available_signal_groups`

Present when mix-related signal groups are available.

Internal/supporting list of signal groups that were available when building the overview.

Current values may include:

- `low_end`
- `stereo`
- `spectral_balance`
- `dynamics`

Rules:

- Useful for debugging, validation, consultant input, and future detailed views.
- Do not render this as primary artist-facing text.

### `evidence`

Optional. Present only when a dominant mix focus was selected.

Internal evidence object for the selected mix focus.

It may contain numeric technical or mix-related values.

Examples may include:

- `low_rms_dbfs`
- `mid_rms_dbfs`
- `low_minus_mid_db`
- `sub_rms_dbfs`
- `plr_lu`
- `crest_factor_db`

Rules:

- Do not render raw evidence directly in the main artist-facing UI.
- Use it only for validation, detailed views, consultant input, or explained technical displays.
- Never show raw numeric values without context.

### `source_focus_id`

Optional. Present only when a dominant mix focus was selected.

Internal identifier for the selected dominant mix focus.

Current values may include:

- `low_end_translation_check`
- `stereo_translation_check`
- `limiter_pressure_check`
- `limiter_headroom_stress_check`
- `low_mid_balance_check`
- `upper_balance_check`

Rules:

- Do not render this directly to artists.
- UI may use it internally for grouping, icons, or safe labels.
- Artist-facing labels should come from `headline`, not from this ID.

## 7.3 UI usage notes for `technical_overview` and `mix_overview`

Safe artist-facing fields:

- `status`
- `headline`
- `main_observation`
- `listening_focus`
- `export_focus`
- `confidence`

Do not directly render:

- `available_signal_groups`
- `evidence`
- `source_focus_id`
- raw numeric evidence without explanation

`technical_overview` should be used for release/export readiness context.

`mix_overview` should be used for mix translation and reference-listening context.

Do not merge them into one meaning:

- technical release risk is not the same as mix translation focus
- mix translation focus is not automatically a release blocker

## 8. technical_details

Purpose: detailed technical data for validation, meters, and future detail views.

Typical content:

- `loudness`
- `dynamics`
- `stereo`
- `low_end`
- `limiter_stress`
- `spectral_rms`
- `transients`
- `mix_basis`

Rules:

- These fields may be useful for meters.
- They should not be shown as the primary feedback summary.
- Artist-facing wording should be generated through `artist_guidance`.

### technical_details.mix_basis

Purpose: compact mix-basis suspicion contract for future detail views and consultant context.

Path:

```python
payload["technical_details"]["mix_basis"]
```

Current fields:

```text
status
confidence
available_signal_groups
checks
```

Allowed status values:

```text
available
partial
not_available
```

Each item in checks contains:

```text
id
status
confidence
area
headline
observation
listening_check
evidence
```

Allowed check status values:

```text
ok
watch
suspect
not_available
```

Current check IDs:

```text
left_right_balance_check
center_focus_tendency
low_mid_mud_tendency
upper_harshness_tendency
```

Rules:

- mix_basis is not a release blocker.
- mix_basis must not override release.release_readiness.
- mix_basis must not replace artist_guidance.mix_overview.
- mix_basis exposes cautious mix-basis suspicion signals only.
- Do not present check IDs as artist-facing diagnoses.
- Do not claim masking, washed-out reverb, or kick/bass conflict from this block.
- Use headline, observation, and listening_check for future artist-facing wording.
- Use evidence for audit, debugging, and meter/detail views only.

## 9. AI Consultant

`ai_consultant` is a separate status layer for AI Consultant output availability.

Path:

```python
payload["ai_consultant"]
```

Current purpose:

- expose whether AI Consultant output is available
- keep the deterministic payload useful without OpenAI-generated text
- document that local consultant summaries may exist separately for testing

Current fields:

```text
summary_status
local_summary_filename
note
```

### `summary_status`

Type: string.

Current value:

```text
not_generated_by_engine
```

Meaning:

The analysis engine did not generate a live AI Consultant summary.

Rules:

- This is not an analysis failure.
- This is not a release-readiness failure.
- This must not block `release` or `artist_guidance`.
- Future values require a contract update before platform wiring.

### `local_summary_filename`

Type: string.

Current value:

```text
ai_consultant_summary.md
```

Meaning:

Optional local filename used for testing or locally generated markdown summaries.

Rules:

- This is not a public stable asset URL.
- This is not a Supabase storage path.
- This is not proof that live consultant output exists.
- Production UI should not depend on this filename.

### `note`

Type: string.

Human-readable guardrail explaining that the engine does not generate live AI consultant text.

Rules:

- Safe for internal QA or debug/detail views.
- Product UI should prefer a clear user-facing state instead of exposing this raw note directly.
- The note must not be treated as artist feedback content.

### Product rules

- `ai_consultant` is optional.
- The deterministic feedback payload must remain complete without OpenAI-generated text.
- Live AI Consultant output belongs to a future platform/service layer.
- Do not merge generated consultant text into deterministic engine guidance without a separate contract.
- Do not use `ai_consultant` as source data for release readiness, technical checks, structure guidance, or listening checks.

## 10. Current intentional limitations

The following topics are not yet fully implemented as dedicated artist-facing mix checks:

- mud / low-mid masking
- harshness beyond simple upper-balance hints
- detailed masking
- washed-out / reverb depth tendency
- center-focus weakness
- advanced frequency balance
- genre-specific mix rules

These should be added later only when the supporting evidence and wording contract are clear.

## 11. Product rules

The payload must follow these rules:

- measure first
- derive cautious signals second
- explain to artists third
- avoid absolute musical judgments
- avoid taste judgments
- avoid debug language in artist-facing summaries
- keep release decisions separate from deeper guidance
- keep raw technical data separate from artist-facing conclusions

## 12. `section_timeline` field contract

`artist_guidance.section_timeline` is an artist-facing timeline of detected arrangement areas.

It is not a claim about official song sections such as intro, verse, chorus, break, drop, or outro. It is a cautious structure and movement timeline derived from available analysis signals.

Current item fields:

```text
index
position
duration_character
energy_level
density_level
movement
relative_role
time_range
duration_sec
```

### `index`

Zero-based timeline index.

### `position`

Broad placement in the track.

Current values may include:

- `opening`
- `early`
- `middle`
- `closing`

### `duration_character`

Coarse duration description.

Current values may include:

- `short`
- `medium`
- `extended`

### `energy_level`

Relative energy level for this detected area.

Current values may include:

- `low`
- `moderate`
- `high`

### `density_level`

Relative arrangement density level for this detected area.

Current values may include:

- `low`
- `moderate`
- `high`

### `movement`

Coarse movement direction inside or around this area.

Current values may include:

- `rising`
- `falling`
- `stable`
- `changing`

### `relative_role`

Cautious role description based on the available section signals.

Current values may include:

- `opening_area`
- `reduced_area`
- `main_area`
- `stronger_area`
- `closing_area`

### Rules

- These are not fixed musical section names.
- These labels must not be presented as absolute arrangement judgments.
- They should be shown as listening guidance or structural orientation only.

### `time_range`

Time information for the timeline item.

Current fields:

- `start_sec`
- `start_time`
- `end_sec`
- `end_time`

Example:

```json
{
  "start_sec": 46.35,
  "start_time": "0:46",
  "end_sec": 125.71,
  "end_time": "2:06"
}
```

### `duration_sec`

Duration of the detected area in seconds.

## 13. UI usage notes for `section_timeline`

For the feedback page, the safest current UI representation is:

- time range
- `relative_role`
- `energy_level`
- `density_level`
- `movement`
- `duration_character`

The UI should avoid wording such as:

- verse
- chorus
- drop
- breakdown
- official section
- correct structure
- wrong structure

Safer wording:

- detected area
- opening area
- reduced area
- main area
- stronger area
- closing area
- movement
- energy tendency
- density tendency

If the UI needs a display label, it should derive it from `relative_role` and `time_range`, not from hard-coded song-section assumptions.

## 14. `listening_guidance` field contract

`listening_guidance` is a top-level artist guidance list.

It is not nested under `artist_guidance`.

Current path:

```text
payload["listening_guidance"]
```

Each entry is a concrete listening check derived from available analysis evidence.

Current item fields:

```text
id
area
priority
confidence
headline
what_to_listen_for
evidence
wording_note
```

### `id`

Stable identifier for the listening check.

Current values may include:

- `mixed_motion_density_check`
- `combined_lift_clarity_check`
- `energy_lift_with_limited_density_lift`
- `variable_without_clear_lift`
- `possible_extended_core_arrangement_span`
- `section_timeline_extended_reduced_middle_check`

### `area`

Broad feedback area.

Current values may include:

- `musical_flow`
- `arrangement`
- `technical`
- `mix`

### `priority`

How strongly the check should be surfaced.

Current values may include:

- `low`
- `medium`
- `high`

### `confidence`

How reliable the check is based on the available evidence.

Current values may include:

- `low`
- `medium`
- `high`

### `headline`

Short artist-facing listening-check title.

Rules:

- Use cautious wording.
- Prefer "Check whether..." or "Reference-check whether...".
- Do not present the headline as a diagnosis.
- Do not claim that the arrangement, mix, melody, sample, drop, or songwriting is wrong.

### `what_to_listen_for`

Artist-facing explanation of what to check during playback.

Rules:

- Keep it actionable.
- Keep it cautious.
- Avoid absolute musical judgments.
- Avoid claims about missing drops, weak songwriting, repeated samples, bad arrangement, or incorrect structure.

### `evidence`

Internal evidence object.

This may contain source signals, numeric values, movement profiles, timeline data, technical values, or section-derived context.

Rules:

- Useful for validation, debugging, consultant input, and future detailed views.
- Must not be rendered directly as primary artist-facing text.
- UI may use safe subfields such as `time_range` when needed.
- UI must not expose raw debug-style source names or unexplained numeric values.

Examples of fields that should not be shown directly in the main artist-facing UI:

- `source_signal`
- `movement_profile`
- `energy_delta_lu`
- `density_delta_per_sec`
- `bars`
- raw technical/evidence values without explanation

### `wording_note`

Internal wording guardrail for UI, consultant, and future prompt-building.

Rules:

- Do not render this directly to artists.
- Use it to prevent overclaiming.
- It should protect against unsafe claims such as weak songwriting, missing drops/builds, repeated samples, or objective quality judgments.

## 15. UI usage notes for `listening_guidance`

The safest current UI representation is:

- `headline`
- `what_to_listen_for`
- `area`
- `priority`
- `confidence`

Optional UI usage:

- show a safe time span from `evidence.time_range` when available
- group checks by `area`
- sort checks by `priority`

The UI should not directly show:

- `evidence`
- `wording_note`
- internal source signal names
- raw numeric evidence without explanation

Safe UI wording:

- listening check
- reference check
- area to review
- may be worth checking
- listen for whether...
- check whether...

Avoid UI wording such as:

- problem
- failure
- wrong structure
- missing drop
- weak songwriting
- bad arrangement
- bad mix
- repeated sample
- objective quality issue


## Additional `listening_guidance` ids

The following `listening_guidance` ids are generated from already available artist guidance blocks. They do not run new audio analysis and must remain cautious, evidence-based listening prompts.

### `technical_release_listening_check`

Purpose: translates `artist_guidance.technical_overview` into a concrete technical listening check.

Expected area: `technical`

Expected priority:
- `high` when `technical_overview.status = problem`
- `medium` when `technical_overview.status = warning`
- `low` when `technical_overview.status = ok`

Expected evidence:
- `source_signal = artist_guidance.technical_overview`
- `status`
- optional `main_observation`
- optional `export_focus`

Required source:
- `artist_guidance.technical_overview.status` must be one of `problem`, `warning`, or `ok`
- `artist_guidance.technical_overview.headline` must be available
- `artist_guidance.technical_overview.listening_focus` must be available

Wording rule: this check must not claim bad mastering, bad mixing, or incorrect artistic decisions.

### `mix_translation_listening_check`

Purpose: translates `artist_guidance.mix_overview` into a concrete mix-translation listening check.

Expected area: `mix`

Expected priority:
- `medium` when `mix_overview.source_focus_id` is available
- `low` when no specific source focus id is available

Expected evidence:
- `source_signal = artist_guidance.mix_overview`
- optional `source_focus_id`
- optional `main_observation`
- optional `export_focus`
- optional `technical_evidence`

Required source:
- `artist_guidance.mix_overview.status = available`
- `artist_guidance.mix_overview.headline` must be available
- `artist_guidance.mix_overview.listening_focus` must be available

Wording rule: this check must not claim that the mix is wrong or artistically invalid.

### `section_timeline_extended_closing_check`

Purpose: highlights a longer closing section as a cautious listening check.

Expected area: `arrangement`

Expected priority: `low`

Expected confidence: `low`

Expected evidence:
- `source_signal = artist_guidance.section_timeline`
- `section_index`
- `time_range`
- `duration_sec`
- `position`
- `duration_character`
- optional `relative_role`
- optional `movement`
- optional `energy_level`
- optional `density_level`

Required source:
- at least one `section_timeline` item with `position = closing`
- `duration_character = extended`

Wording rule: this check must not claim that the ending is too long, weak, or incorrectly arranged.

### `section_timeline_contrast_transition_check`

Purpose: highlights a section change where role, energy, or density may be worth checking.

Expected area: `arrangement`

Expected priority: `medium`

Expected confidence: `medium`

Expected evidence:
- `source_signal = artist_guidance.section_timeline`
- `from_section`
- `to_section`

Each section evidence object should include:
- `section_index`
- `time_range`
- `duration_sec`
- `position`
- `duration_character`
- optional `relative_role`
- optional `movement`
- optional `energy_level`
- optional `density_level`

Required source:
- a transition from a reduced area into a main or stronger area
- plus either an energy lift or density lift

Wording rule: this check must not describe the change as a missing drop, weak build, or fixed arrangement problem.


## `section_timeline.role_hint`

`role_hint` is an optional artist-facing helper field generated for each `section_timeline` item.

It is derived from already available section timeline fields such as:

- `position`
- `relative_role`
- `energy_level`
- `density_level`
- `movement`

It does not run new audio analysis.

### Allowed values

- `intro_like`
- `breakdown_like`
- `breakdown_or_rebuild_like`
- `main_area_like`
- `main_or_drop_like`
- `peak_like`
- `outro_like`

### Meaning

`role_hint` provides a cautious, human-readable orientation for the section.

It may help the artist understand the approximate function of a section in the track journey, but it must not be treated as a hard musical classification.

### Wording rules

Do not use `role_hint` to claim that a section definitively is:

- an intro
- a breakdown
- a build
- a drop
- a peak
- an outro

Use wording such as:

- "intro-like"
- "breakdown-like"
- "main-area-like"
- "drop-like"
- "peak-like"
- "outro-like"
- "may function as"
- "may read as"

Avoid wording such as:

- "this is the drop"
- "the breakdown is wrong"
- "the outro is too long"
- "the build is missing"

### Contract note

`role_hint` is allowed inside:

- `artist_guidance.section_timeline[]`
- section-timeline-based `listening_guidance[].evidence`
- `from_section` / `to_section` evidence objects for transition-related guidance


## `structure_overview` synthesis fields

`structure_overview` may include additional synthesis fields derived from existing artist guidance data.

These fields do not run new audio analysis. They combine already available evidence from:

- `artist_guidance.section_timeline`
- `section_timeline.role_hint`
- `artist_guidance.musical_flow_summary`
- `artist_guidance.arrangement_development_summary`
- `artist_guidance.section_character_summary`
- structure-related `listening_guidance`

### `timeline_summary`

Type: string

Purpose: provides a short artist-facing summary of the broad section journey.

Expected meaning:
- number of broad sections
- approximate movement from opening orientation through middle section roles toward closing orientation
- based on cautious `role_hint` labels

Wording rule: must not claim a fixed arrangement form or definitive section identity.

### `role_journey`

Type: array of objects

Purpose: gives compact per-section orientation for the broad structure journey.

Allowed fields per item:
- `section_index`
- `role_hint`
- `role_label`
- `position`
- `duration_character`
- `relative_role`
- `movement`
- `energy_level`
- `density_level`
- `duration_sec`
- `time_range`

Wording rule: values are orientation signals only, not hard musical truth.

### `key_sections`

Type: array of objects

Purpose: highlights a small number of sections that may be useful for an artist listening pass.

Expected reasons:
- `opening_orientation`
- `main_or_peak_orientation`
- `extended_section_span`
- `closing_orientation`

Allowed fields per item:
- all compact section evidence fields from `role_journey`
- `reason`

Wording rule: `key_sections` must not imply that non-listed sections are unimportant.

### `evidence`

Type: object

Purpose: exposes machine-readable source information for the structure synthesis.

Expected fields:
- `source_signals`
- `section_count`
- `role_hint_counts`
- optional `primary_guidance_id`
- optional `primary_guidance_area`
- optional `movement_profile`
- optional `journey_shape`

Expected `source_signals` values:
- `artist_guidance.section_timeline`
- `artist_guidance.musical_flow_summary`
- `artist_guidance.arrangement_development_summary`
- `artist_guidance.section_character_summary`

### Status behavior

Expected status behavior:
- `available`: structure-related guidance, movement evidence, arrangement evidence, or section evidence exists
- `limited`: only section timeline exists, without stronger structure evidence
- `unavailable`: no reliable structure overview can be generated

### Safety rules

The synthesis must remain cautious.

It may say:
- "suggests"
- "may read as"
- "orientation"
- "section journey"
- "listening pass"

It must not say:
- "this is the drop"
- "the breakdown is wrong"
- "the track needs a build"
- "the arrangement is incorrect"
- "the ending is too long"

## Technical check provenance fields

`release.technical_release_checks[]` may include stable provenance fields for machine-readable traceability.

These fields explain which technical issue, if any, caused a warning/problem check.

### `release.technical_release_checks[].check_id`

Type: string

Purpose: stable identifier for the technical check row.

Expected format:
- `technical_loudness_check`
- `technical_peaks_check`
- `technical_dynamics_check`
- `technical_stereo_check`
- `technical_low_end_check`
- `technical_file_check`

### `release.technical_release_checks[].source_issue_code`

Type: string, optional

Purpose: stable issue code from the originating normalized issue.

Examples:
- `source_true_peak_over_zero_dbtp`
- `source_true_peak_tight_headroom`
- `clipped_sample_count_hard_fail`
- `very_low_plr_lu`

Rule: this field must only be present when the originating issue has a real code. It must not be guessed from text.

### `release.technical_release_checks[].source_issue_title`

Type: string, optional

Purpose: normalized issue title used for artist-facing and audit traceability.

Rule: may mirror the source issue code when no more specific title exists.

### `release.technical_release_checks[].source_issue_severity`

Type: string, optional

Purpose: severity of the originating issue selected for that area.

Known values:
- `problem`
- `warning`
- `info`

### `release.technical_release_checks[].source_issue_area`

Type: string, optional

Purpose: normalized technical area of the originating issue.

Known values:
- `loudness`
- `peaks`
- `dynamics`
- `stereo`
- `low_end`
- `file`

### Selection rule inside technical checks

If multiple issues exist for one technical area, the selected source issue should be the highest severity issue for that area.

Expected severity priority:
1. `problem`
2. `warning`
3. `info`
4. `ok`

The selected source issue is used only for traceability. It must not change the measured technical result by itself.

## `technical_overview` selection provenance fields

`artist_guidance.technical_overview` may expose the provenance of the selected technical focus.

### `selected_check_id`

Type: string, optional

Purpose: points to the selected `release.technical_release_checks[].check_id`.

### `selected_issue_code`

Type: string, optional

Purpose: stable originating issue code copied from `source_issue_code`.

Rule: optional because not every selected check has a source issue code. It must not be inferred from free text.

### `selected_issue_title`

Type: string, optional

Purpose: normalized originating issue title copied from `source_issue_title`.

### `selected_area`

Type: string, optional

Purpose: selected technical area.

Known values:
- `loudness`
- `peaks`
- `dynamics`
- `stereo`
- `low_end`
- `file`

### `selected_severity`

Type: string, optional

Purpose: selected issue severity if available, otherwise selected check state.

Known values:
- `problem`
- `warning`
- `ok`
- `unavailable`

### `selection_reason`

Type: string

Purpose: explains why the technical overview selected this focus.

Known values:
- `highest_priority_problem_check`
- `highest_priority_warning_check`
- `no_warning_or_problem_check_selected`
- `technical_checks_unavailable`
- `no_specific_check_selected`
- `selected_check_without_warning_or_problem_state`

### Safety and traceability rules

Technical provenance fields are machine-readable traceability fields.

They must:
- be copied from stable issue/check fields
- avoid parsing artist-facing text
- avoid guessing issue codes
- remain safe for tests, UI, and future consultant input

They must not:
- introduce new audio analysis
- override release readiness
- change issue severity
- create hidden musical judgment

## `mix_overview` selection provenance

Section topic: mix_overview selection provenance.

`artist_guidance.mix_overview` may include machine-readable provenance fields that explain why a mix translation focus was selected.

These fields are not artist-facing judgments. They are intended for UI routing, auditability, and safe downstream explanation.

### Fields

- `selected_guidance_id`
  - Stable listening-guidance id connected to the overview.
  - Current value: `mix_translation_listening_check`.

- `source_focus_id`
  - Internal mix-focus id selected by the engine when one specific candidate is chosen.
  - May be absent when no specific candidate stands out.

- `selected_area`
  - Broad selected area for routing.
  - Current values include:
    - `mix`
    - `dynamics`
    - `limiter_stress`
    - `low_end`
    - `stereo`
    - `spectral_balance`

- `selected_signal_group`
  - Single selected signal group when the focus maps cleanly to one group.
  - May be absent for multi-source focus types.

- `selected_signal_groups`
  - List of source signal groups used by the selected focus.
  - Examples:
    - `["dynamics"]`
    - `["limiter_stress", "loudness", "dynamics"]`
    - `["spectral_balance"]`

- `selection_reason`
  - Machine-readable reason for the selection path.
  - Current values:
    - `mix_signals_unavailable`
    - `no_specific_mix_focus_selected`
    - `highest_priority_mix_candidate`

- `selection_priority`
  - Numeric internal priority of the selected candidate.
  - Only present when a concrete candidate was selected.

### Safety rules

- Do not infer missing signal groups from text.
- Do not treat `source_focus_id` as an artist-facing diagnosis.
- Do not present `selection_priority` to artists.
- Use `selected_area` and `selected_signal_groups` for routing and audit only.
- Artist-facing copy must continue to use cautious listening-check wording.

---

## Artist feedback payload root structure

The artist feedback payload uses a stable root-level structure.

Top-level payload keys:

- `track`
- `release`
- `artist_guidance`
- `listening_guidance`
- `engine_signals`
- `technical_details`
- `ai_consultant`
- `meta`

### Root-level `listening_guidance`

`listening_guidance` is a root-level payload block.

It must not be read from:

```
payload.artist_guidance.listening_guidance
```

Correct path:

```
payload.listening_guidance
```

This is intentional because listening_guidance combines guidance derived from structure, technical release checks, and mix overview signals.

### `artist_guidance` block

The stable `artist_guidance` block contains:

- `structure_summary`
- `section_character_summary`
- `arrangement_development_summary`
- `musical_flow_summary`
- `score_context`
- `section_timeline`
- `structure_overview`
- `technical_overview`
- `mix_overview`

`artist_guidance` should be treated as the structured artist-facing summary layer.

It should not own the root-level `listening_guidance` list.

### `release` block

The stable `release` block contains:

- `track_status`
- `release_readiness`
- `critical_warnings`
- `technical_release_checks`
- `next_step`

### Safety rule

Adapters, audits, and future UI readers must use the documented root paths exactly.

In particular:

- use `payload.listening_guidance`
- use `payload.artist_guidance.structure_overview`
- use `payload.artist_guidance.technical_overview`
- use `payload.artist_guidance.mix_overview`
- use `payload.artist_guidance.section_timeline`
- use `payload.release.technical_release_checks`

Do not duplicate listening_guidance into artist_guidance.

---

## `listening_guidance` provenance contract

Section topic: listening_guidance evidence source_signal provenance.

`listening_guidance` is a root-level payload list.

Canonical path:

```
payload["listening_guidance"]
```

Forbidden nested path:

```
payload["artist_guidance"]["listening_guidance"]
```

Every `listening_guidance` item must be a dictionary with:

- `id`: non-empty string
- `area`: non-empty string
- `evidence`: dictionary
- `evidence.source_signal`: non-empty string

`evidence.source_signal` is the canonical provenance anchor for the listening guidance item. It must identify the engine/payload signal that caused the guidance item to be emitted.

Known `source_signal` examples include:

- `artist_guidance.technical_overview`
- `artist_guidance.mix_overview`
- `artist_guidance.section_timeline`
- `musical_flow_summary.movement_profile`
- `arrangement_development_summary.possible_extended_core_arrangement_span`

There is currently no whitelist for `id` or `evidence.source_signal`. The contract requires structural provenance only.

### Safety rules

- Do not infer provenance from headline, summary, `what_to_listen_for`, or other prose fields.
- Do not place `listening_guidance` under `artist_guidance`.
- Do not emit a listening guidance item without `evidence.source_signal`.
- UI code may use `id` and `area` for routing, and `evidence.source_signal` for provenance, grouping, debugging, or source display.
- A top-level `source_signal` field is not required while `evidence.source_signal` remains mandatory.
