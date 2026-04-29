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

musical_flow_summary.possible_repeated_focus is only a cautious listening-check signal. It must not be treated as proof that a melody, loop, motif, element, or sample is repetitive. It may only support wording such as checking whether a central idea gets enough variation, tension, or a special moment over time.

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
