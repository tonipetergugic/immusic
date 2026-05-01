# AI Consultant Prompt Notes

## Current purpose

The local AI Consultant prompt is used to test artist-facing feedback from local analysis engine output before the new engine is connected to the upload and Supabase flow.

The prompt should translate analysis data into clear, supportive artist feedback. It must not expose engine internals, raw score names, segment counts, bar-level details, or debug terminology.

## Artist-declared context

During local testing, artist-declared context is stored manually in:

- `analysis_engine/local_artist_contexts.json`

This mirrors the metadata that will later come from the upload flow:

- track title
- main genre
- subgenre
- version
- BPM
- key
- optional reference artist
- optional reference track
- language

The artist-declared BPM is the musical BPM truth for the AI Consultant. Engine tempo estimates are internal grid/analysis values and should not be sent to the AI Consultant by default.

## Current wording direction

The final feedback should be:

- friendly
- encouraging
- artist-facing
- cautious
- genre-relative
- evidence-based
- useful without sounding like a hard judgment

The prompt should avoid absolute musical claims. It should frame possible concerns as listening checks or optional improvements.

For all German AI-generated ImMusic output, do not use gendered forms such as "Hörer:innen", "Künstler:innen", "Artist:innen", or "Produzent:innen". Use simple, respectful, non-gendered wording such as "Hörer", "Publikum", "Artists", "Produzenten", or "Nutzer" depending on context.

## Structure wording

Structure feedback should not force labels such as build, drop, break, verse, intro, peak, or outro unless strongly supported elsewhere.

Preferred wording uses neutral artist language such as:

- opening part
- main part
- reduced moment
- energy lift
- stronger section
- later section
- larger track areas
- arrangement areas
- passages

When form contrast is low, the feedback should not call the track boring or bad. It should suggest checking whether the track creates enough new tension, variation, or a special moment over time, especially if a central motif or loop remains in focus for a long stretch.

The words motif, loop, or element may be used only as listening-check examples, not as diagnoses.

The word samples should not be used unless actual sample detection is explicitly available.

musical_flow_summary.possible_repeated_structure_focus is only a cautious structure listening-check signal. It must not be treated as proof that a melody, loop, motif, element, or sample is repetitive. It may only support wording such as checking whether a central idea gets enough variation, tension, or a special moment over time.

## Loudness and mastering wording

Loud or energetic mastering should not automatically be presented as a problem.

If the track is technically okay or release-ready, loudness should be framed as a neutral note or optional listening check, not as a required fix.

The prompt must avoid encouraging artists to make a track quieter unless there is a clear release-relevant issue such as clipping, true-peak risk, severe limiter stress, or another technical warning.

## Local preview flow

A local prompt preview can be generated from an analysis output with:

```bash
python3 -m analysis_engine.build_consultant_prompt_preview "analysis_engine/output/<track-folder>/analysis.json"

The generated file is written to:

analysis_engine/output/<track-folder>/consultant_prompt_preview.md
Currently validated local test contexts
Techno Is My Only Drug
track title: Techno Is My Only Drug
main genre: Trance
subgenre: Main Floor
version: Mixed
BPM: 144
key: B Minor
language: de
Roots of Eternity
track title: Roots of Eternity
main genre: Trance
subgenre: Progressive Trance
version: Original Mix
BPM: 132
key: C Major
language: de

The simulated German Artist Output for Roots of Eternity was accepted as fitting.

## possible_repeated_structure_focus calibration note

Current status:
- The rule is kept unchanged for now.
- `possible_repeated_structure_focus` is a cautious structural listening-check signal, not a proof of repetitive melody, loop, motif, element, or sample use.
- Listening check: Crazy Love and Freaky were considered plausible true positives.
- Near-threshold cases to watch in future calibration: Rezz - Entropy and David Forbes - Techno Is My Only Drug.
- No threshold tuning yet, because the current validation set is too small.
- Future calibration should compare this signal against a larger reference set and user-confirmed listening impressions.

## possible_extended_core_arrangement_span validated wording note

Current status:
- `possible_extended_core_arrangement_span` was validated on Roots of Eternity as a plausible listening-check signal.
- The signal must not be phrased as a hard judgment.
- The feedback must not say that a track is boring.
- The feedback must not claim that songwriting, melody, loop behavior, sample reuse, drop, or build quality is objectively problematic.
- When this signal is true, the practical next step should stay focused on the longer central arrangement area.
- Preferred practical-next-step focus: check development, variation, tension, lift, or forward motion within that central area.
- Avoid drifting into unrelated generic practical checks unless other engine evidence clearly supports them.
- Allowed artist wording direction:
  - A larger central arrangement area can stay relatively similar in its effect over a comparatively long stretch.
  - This can be an intentional artistic choice.
  - As a listening check, it can be worth verifying whether enough new tension, variation, or a clearly memorable lift appears after an energetic build-up.
- The output may simultaneously acknowledge that a track can feel controlled, technically clean, and close to release-ready.

## Validated note: possible_extended_core_arrangement_span

The `possible_extended_core_arrangement_span` signal is intended as a cautious listening-check signal, not as a hard judgment.

Validated example:
- Track: Roots of Eternity
- Signal: `possible_extended_core_arrangement_span = true`
- Evidence range: approx. `0:44–2:00`
- Evidence source: existing arrangement segment data, not manual listening context
- Intended artist-facing meaning: one larger central arrangement area may stay similar long enough that the artist should check whether the track needs more noticeable development, variation, tension, lift, or forward motion in that area.

Important wording constraints:
- Do not present this as proof that the track is boring, weak, repetitive, loop-based, or structurally wrong.
- Do not mention samples, loop reuse, melody repetition, missing drops, or missing builds unless directly supported by future engine evidence.
- Do not turn manual listening impressions into engine-derived claims.
- If approximate start/end times are available, the German artist-facing output may mention the range as a helpful listening reference, for example: `im Bereich ca. 0:44–2:00`.
- The practical next step should stay focused on that longer central arrangement area when this signal is true.

Regression expectation:
- In the current six-track sample, only Roots of Eternity triggers this signal.
- Other tracks remain unaffected.
- Existing signals such as `possible_low_contrast_arrangement_focus` and `possible_repeated_structure_focus` remain separate and unchanged.

## Manual listening boundary note

Current status:
- Manual listening is for validation/calibration only.
- Manual listening must not become part of the normal AI Consultant runtime input contract.
- Runtime input should remain limited to artist-declared metadata/context and engine evidence (`consultant_input`).
- Manually reported impressions (for example "build-up feels tense") must not be turned into generic Consultant claims.

## Validated Movement + Extended Core Span Behavior

The AI Consultant may treat the combination of:

- `musical_flow_summary.movement_profile = energy_lift_with_limited_density_lift`
- `arrangement_development_summary.possible_extended_core_arrangement_span = true`

as a stronger listening-check signal than either value alone.

Validated example:
- Roots of Eternity shows this combination plausibly.
- The relevant span is approximately 0:44–2:00.
- The evidence suggests rising energy while density does not lift in the same way.
- This may justify a cautious artist-facing check about whether the central arrangement area develops enough through variation, tension, or a clear lift.

Important wording constraints:
- Do not treat this as a hard flaw.
- Do not diagnose melody repetition, loop repetition, sample reuse, missing drop, or bad songwriting from this signal.
- Do not use manual listening impressions as runtime Consultant input.
- Manual listening impressions are only allowed for validation and calibration.
- Professional tracks may also show `energy_lift_with_limited_density_lift`; the combined signal only becomes more relevant when supported by `possible_extended_core_arrangement_span = true`.

German wording constraint:
- Do not use gendered forms such as `Hörer:innen`, `Künstler:innen`, `Artist:innen`, or `Produzent:innen`.
- Use simple neutral wording such as `Hörer`, `Publikum`, `Artists`, `Produzenten`, or `Nutzer`.
