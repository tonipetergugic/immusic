# Boundary Scoring Design

## Goal

Define how future boundary scoring should work before any code changes are made.

This document is intentionally design-only.
It does not implement logic.
It only defines the target behavior that later code must follow.

---

## Core Principle

A good section boundary is not just a local novelty peak.

A good boundary should ideally combine:

1. a meaningful break from the previous state
2. a stable new state after the boundary
3. musically plausible timing
4. protection against early transition triggers
5. tolerance for gradual outro / fade / exit cases

---

## Inputs Already Available

The current analysis already gives us these useful signals:

- novelty at candidate bar
- delta_from_prev
- similarity_prev_to_here
- similarity_here_to_next
- next_similarity
- next_next_similarity
- local bar timing
- existing candidate bars
- section context after candidate selection

These should be treated as the first scoring foundation.

---

## Boundary Types We Must Distinguish

### 1) Clean hard boundary
Typical pattern:
- clear break from previous bar(s)
- strong novelty and/or strong delta
- immediate post-boundary stability

Interpretation:
This is the ideal case for a confident structural boundary.

---

### 2) Early transition / pre-drop boundary
Typical pattern:
- noticeable change already begins before the true arrival
- vocals, fills, risers, snare rolls, FX or pre-drop energy can trigger the boundary too early
- post-boundary area may still not be the final stable destination

Interpretation:
The first strong change is real, but it may be only the start of a transition, not the best final boundary.

---

### 3) Gradual outro / exit boundary
Typical pattern:
- no single dominant novelty spike
- change is spread across several bars
- structure shifts slowly rather than with one hard break

Interpretation:
The engine must not require every valid boundary to behave like a drop or hard switch.

---

## Desired Future Scoring Logic

Future scoring should not rely on novelty alone.

Instead, every candidate should later receive a combined score from several components:

### A) Break score
Measures how strongly the candidate separates from the previous state.

Possible source signals:
- novelty
- delta_from_prev
- low similarity_prev_to_here

---

### B) Arrival stability score
Measures whether the bars after the candidate quickly stabilize into a coherent new state.

Possible source signals:
- similarity_here_to_next
- next_similarity
- next_next_similarity

High post-boundary stability is a strong positive sign.

---

### C) Early-trigger penalty
Penalizes boundaries that appear to fire too early inside a transition.

Typical warning pattern:
- strong change at candidate
- but the next 1–3 bars still look like transition material
- or the musically stronger arrival appears slightly later

This penalty is especially important for pre-drop vocals, risers, fills and similar EDM transition events.

---

### D) Gradual-change tolerance
Prevents the scorer from rejecting valid boundaries just because they are not explosive.

Typical use case:
- outro
- breakdown exit
- reduction of kick or energy
- slow textural transition

The system should allow lower novelty if the broader local context still supports a real structural change.

---

### E) Musical timing prior
Boundary timing should later prefer musically plausible bar positions where reasonable.

This does not mean hardcoding genre labels.
It means that if two nearby candidates are otherwise similar, the more musically plausible one should be preferred.

This must remain a soft preference, not a rigid rule.

---

## Target Behavior From Current Verified Cases

### Clean hard boundary
Should score high because:
- break is clear
- new state stabilizes quickly

### Early pre-drop boundary
Should be treated with caution because:
- first change is real
- but the main arrival may happen a little later

### Gradual outro boundary
Should remain possible even when:
- novelty is weak
- change unfolds over several bars

---

## Important Rule

Do not patch individual tracks.
Do not hardcode fixes for Crazy Love, David Forbes, or any other benchmark case.

All future scoring changes must generalize across boundary types.

---

## What This Design Still Does Not Solve

This design does not yet define:

- exact formulas
- exact weights
- exact thresholds
- candidate shift radius
- how many future bars should be inspected
- genre-specific timing rules

Those decisions must be made in a later step after this design is accepted.

---

## Immediate Next Objective

After this document is accepted, the next step should be:

Define a small explicit candidate rescoring schema that compares:
- current candidate
- +1 bar
- +2 bars
- +3 bars

for transition-sensitive cases, without changing the main engine yet.
