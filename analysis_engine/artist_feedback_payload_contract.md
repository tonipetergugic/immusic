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
- `low_mid_balance_check`
- `upper_balance_check`

Rules:

- It is a cautious translation overview, not a final mix diagnosis.
- It may suggest reference checks, mono checks, loud-section checks, or export focus.
- It must not claim that a mix is objectively bad.
- It should use wording such as "may", "suggests", "check", and "reference-check".

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

Current fields:

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

Internal identifier for the selected dominant mix focus.

Current values may include:

- `low_end_translation_check`
- `stereo_translation_check`
- `limiter_pressure_check`
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

Rules:

- These fields may be useful for meters.
- They should not be shown as the primary feedback summary.
- Artist-facing wording should be generated through `artist_guidance`.

## 9. AI Consultant

`ai_consultant` is a separate layer.

The payload may expose whether consultant output is available, but the deterministic feedback payload must remain useful without an OpenAI-generated summary.

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
