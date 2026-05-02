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
