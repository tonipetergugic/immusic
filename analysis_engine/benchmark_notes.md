# Analysis Engine Benchmark Notes

## Purpose
This file documents the manually verified benchmark tracks for the structure-analysis engine.
The goal is to compare engine output against real hearing checks and identify repeatable failure patterns.

---

## Solar Vision - Coming Home Again (Original Mix)
- Status: strong positive reference
- Overall verdict: very good
- Notes:
  - S1 correct
  - S2 correct
  - S3 correct
  - S4 correct
  - S5 correct
  - S6 correct
  - S7 correct
  - Outro change was correctly captured
- Use:
  - positive benchmark for macro structure detection
  - positive benchmark for outro recognition

---

## Above & Beyond, Zoe Johnston - Crazy Love feat. Zoë Johnston (Extended Mix)
- Status: important problem reference
- Overall verdict: mostly good, but one important boundary was too early
- Notes:
  - Section 7 started too early
  - Cause confirmed by hearing: vocals before the drop were interpreted as structural change
  - The true new section should begin later at the actual drop
- Use:
  - benchmark for false early boundary caused by pre-drop vocal change

---

## Hardwell - OH GOSH (Original Mix)
- Status: strong negative reference
- Overall verdict: clearly wrong
- Notes:
  - structure felt shifted and logically off
  - early and mid boundaries did not match the real arrangement well
- Use:
  - benchmark for major segmentation failure
  - benchmark for detecting globally misaligned structure output

---

## Rezz, fknsyd, Anyma (ofc) - Entropy feat. Fknsyd (Extended Mix)
- Status: positive reference
- Overall verdict: good
- Notes:
  - bpm correct
  - main sections were well detected
  - some shorter internal sections were not captured
- Use:
  - benchmark for good macro segmentation with slightly coarse granularity

---

## Marlon Hoffstadt, Dimension, DJ Daddy Trance - It_s That Time (Dimension Remix) (Original Mix)
- Status: mixed reference
- Overall verdict: usable, but somewhat coarse
- Notes:
  - measured tempo was sensible as double-time for engine purposes
  - track contains many changes while still feeling repetitive
  - engine captured some changes well, but missed smaller sections
- Use:
  - benchmark for dense change activity on a repetitive foundation

---

## David Forbes - Techno Is My Only Drug (Mixed)
- Status: positive reference with timing drift
- Overall verdict: good overall
- Notes:
  - S1 should end around 00:26, engine ended it too early
  - S2 therefore started too early
  - S3 correct
  - S4 ended too late and should end around 02:10
  - S5 correct
  - small acid variations did not need separate structural sections
- Use:
  - benchmark for generally good macro segmentation with timing errors at specific boundaries

---

## Current Lessons
- The engine is already useful for macro structure detection.
- The main weakness is boundary timing, not total instability.
- Pre-drop vocals can create false early boundaries.
- Smaller internal sections are often missed.
- Some tracks are segmented too coarsely.
- Not every sound change should become a new section.
