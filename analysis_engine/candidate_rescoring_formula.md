# Candidate Rescoring Formula

## Goal

Define the exact local score formula for comparing:

- base candidate
- candidate + 1
- candidate + 2
- candidate + 3

This is still design-only.
No engine code changes are allowed in this step.

---

## Principle

A candidate should win only if it is both:

- a convincing break from the previous state
- a convincing arrival into a more stable next state

The formula must therefore reward:

- break strength
- post-boundary stability

And it must penalize:

- boundaries that still look like transition entry instead of true arrival

---

## Inputs Per Candidate Position

For each tested candidate position `c`, use these values if available:

- `novelty[c]`
- `delta_from_prev[c]`
- `similarity_prev_to_here[c]`
- `similarity_here_to_next[c]`
- `next_similarity[c]`
- `next_next_similarity[c]`

Definitions:

- `similarity_prev_to_here[c]` = similarity between bar `c-1` and `c`
- `similarity_here_to_next[c]` = similarity between bar `c` and `c+1`
- `next_similarity[c]` = similarity between bar `c+1` and `c+2`
- `next_next_similarity[c]` = similarity between bar `c+2` and `c+3`

---

## Normalization Rule

All raw values should later be normalized locally inside the comparison window only.

That means:
- compare only the four tested positions against each other
- do not use global track-wide normalization for this rescoring layer

For each metric inside the local window:
- convert to a local 0..1 scale
- if all values are equal, use a neutral value

Neutral value:
- `0.5`

This keeps the rescoring logic local and conservative.

---

## Component Scores

## 1) Break Score

The break score should reward:

- higher novelty
- higher delta_from_prev
- lower similarity_prev_to_here

Formula:

`break_score = (0.35 * novelty_norm) + (0.35 * delta_norm) + (0.30 * prev_break_norm)`

Where:

- `novelty_norm` = normalized novelty, higher is stronger
- `delta_norm` = normalized delta_from_prev, higher is stronger
- `prev_break_norm` = normalized inverse of similarity_prev_to_here, so lower similarity becomes higher break value

---

## 2) Arrival Score

The arrival score should reward stable continuation after the chosen bar.

Formula:

`arrival_score = (0.45 * immediate_stability_norm) + (0.30 * next_stability_norm) + (0.25 * next_next_stability_norm)`

Where:

- `immediate_stability_norm` comes from `similarity_here_to_next`
- `next_stability_norm` comes from `next_similarity`
- `next_next_stability_norm` comes from `next_next_similarity`

Higher is better.

---

## 3) Transition Penalty

The transition penalty should punish a candidate if it looks like the transition is still unfolding after that point.

Simple design rule for now:

`transition_penalty = 1.0 - arrival_score`

Interpretation:
- weak post-boundary stability means stronger penalty
- strong arrival stability means weaker penalty

---

## Final Local Score

Formula:

`final_score = (0.45 * break_score) + (0.40 * arrival_score) - (0.15 * transition_penalty)`

Equivalent simplified form is acceptable later, but this explicit form should remain the design reference.

---

## Why These Weights

### Break Score = 45%
Because a boundary must still represent a real change.

### Arrival Score = 40%
Because structural boundaries should begin a more coherent new state, not only mark turbulence.

### Transition Penalty = 15%
Because this should act as a corrective pressure, not dominate the decision.

This balance is meant to prevent blind late-shifting while still fixing early transition-entry boundaries.

---

## Win Rule

Inside the local window, choose the highest `final_score`.

But the base candidate should only be replaced if both conditions are true:

### Condition 1 — Margin rule
The winning later candidate must beat the base candidate by at least:

`0.08`

### Condition 2 — Stability rule
The winning later candidate must not have a lower `arrival_score` than the base candidate.

If either condition fails:
- keep the base candidate

---

## Tie Rule

If two candidates are nearly equal:

- prefer the earlier candidate

“Nearly equal” means score difference less than:

`0.03`

This keeps the system conservative and reduces unnecessary drift to the right.

---

## Edge Handling

If some forward similarities are unavailable near the track end:

- use only the available values
- reweight the arrival subcomponents proportionally
- do not inject zeros as fake evidence

If the local comparison window goes out of range:
- only compare the valid positions

---

## Intended Outcomes On Known Cases

### Crazy Love type case
Expected:
- early transition-entry candidate may have strong break score
- slightly later bar may win because arrival stability is better
- shift becomes possible

### David Forbes early intro boundary
Expected:
- base candidate remains strong
- later bars should not win unless they clearly improve the arrival
- no unnecessary shift

### David Forbes outro boundary
Expected:
- no forced shift unless the later bar actually creates a more stable new state
- gradual outro handling remains conservative

---

## Constraints

This formula must not be treated as final truth.

It is the first explicit rescoring design, intended for testing against the benchmark pack.

If benchmark results disagree, the weights or rules may later change.

But implementation must follow this document first, so testing is based on a fixed reference.
