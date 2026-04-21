# Macro Boundary Rule Contract

## Purpose

This document defines the current rule contract for macro-boundary decisions before further rule activation in code.

The goal is to keep the architecture clean:

- Decision Layer decides which group survives or which anchor is preferred
- Section Build Layer only builds macro sections from the final chosen boundary indices

This document is intentionally rule-focused and implementation-light.
It defines the rule logic, not final numeric thresholds.

---

## Fixed Rule Order

Rules are evaluated in this order:

1. Outro-Guard
2. Weak-Transition
3. Early-Entry
4. Late-Arrival

---

## Fixed Conflict Rule

Only one final decision per group is allowed.

Priority:

1. suppress_group
2. replace_with_candidate
3. keep_selected

At this stage, `keep_forced` is intentionally not part of the active contract.

---

## Shared Scope

All rules operate only within a single local boundary group.

Relevant shared inputs:

- `group_bar_indices`
- `selected_bar_index`
- `candidate_summaries`

Relevant candidate fields:

- `bar_index`
- `boundary_score`
- `delta_norm`
- `forward_stability`

The following are not primary decision drivers at this stage:

- `score`
- `similarity_prev_to_here`

---

## Outro-Guard

### Purpose

Prevent a final macro boundary group from creating an unnecessary tiny trailing block near the end of the track.

### Core Idea

A very late final group should be suppressed if it would only leave a musically insignificant remainder.

### Decision Character

Outro-Guard is a group-level protection rule.

It does not search for a better anchor.
It only decides whether the last group should survive.

### Action

If the rule applies:

- `suppress_group`

Otherwise:

- `keep_selected`

---

## Weak-Transition

### Purpose

Suppress a whole group if it does not carry a convincing macro-level transition.

### Core Idea

Not every local change should become a macro boundary.

Weak-Transition applies when the group looks like:

- micro movement
- surface variation
- unstable intermediate motion
- weak local activity without a real new macro block

### Minimum Condition

A group may only be suppressed if all of the following point in the same direction:

1. the selected candidate has no convincing boundary character
2. `delta_norm` does not support a clear structural jump
3. `forward_stability` does not support a stable new block
4. no other candidate in the same group provides a strong counterexample

### Blocking Reasons

Do not suppress the group if:

- there is still a convincing candidate
- a stable new block does begin
- a real structural jump is visible
- the group is merely mixed or unclear, but not truly weak
- suppression would only serve cosmetic cleanup

### Action

If the rule applies:

- `suppress_group`

Otherwise:

- `keep_selected`

---

## Early-Entry

### Purpose

Correct cases where the currently selected anchor is too early and the directly later candidate marks the true structural entry better.

### Core Idea

The earlier candidate behaves more like:

- pre-impulse
- pre-announcement
- preparatory movement

The later candidate behaves more like:

- actual arrival
- true structural entry
- stable start of the next block

### Comparison Model

Early-Entry compares only direct neighbors inside one local boundary group.

Example:

For `[9, 17, 25]`, compare only:

- `9 -> 17`
- `17 -> 25`

No long jumps.
No cross-group comparisons.

### Allowed Signals

Only these signals may actively drive the rule:

- `boundary_score`
- `delta_norm`
- `forward_stability`

### Minimum Condition

A shift from earlier candidate A to directly later candidate B is allowed only if:

1. `boundary_score(B)` is clearly stronger than `boundary_score(A)`
2. at least one support signal also favors B:
   - `delta_norm(B)` is better than `delta_norm(A)`
   - `forward_stability(B)` is better than `forward_stability(A)`

### Blocking Reasons

Do not shift from A to B if:

- the boundary advantage is not clear
- there is no support signal
- A already behaves like a plausible stable entry
- B is only louder/stronger, but not a clearly better new entry
- the advantage is too small or fragile
- the shift would become an aggressive chain optimization

### Action

If the rule applies:

- `replace_with_candidate`
- `preferred_bar_index = B.bar_index`

Otherwise:

- `keep_selected`

---

## Late-Arrival

### Purpose

Correct cases where the currently selected anchor is too late and the directly earlier candidate marks the true structural entry better.

### Core Idea

The later candidate behaves more like:

- delayed full expression
- later stabilization
- follow-through of the real entry

The earlier candidate behaves more like:

- actual boundary onset
- real beginning of the new block

### Comparison Model

Late-Arrival also compares only direct neighbors inside one local boundary group.

Example:

For `[9, 17, 25]`, compare only:

- `17 <- 9`
- `25 <- 17`

No long jumps.
No cross-group comparisons.

### Allowed Signals

Only these signals may actively drive the rule:

- `boundary_score`
- `delta_norm`
- `forward_stability`

### Minimum Condition

A shift from later candidate B to directly earlier candidate A is allowed only if:

1. A carries the true boundary moment at least as well or better than B
2. `delta_norm(A)` supports the real structural shift better than `delta_norm(B)`
3. B behaves more like later expression / stabilization / follow-through
4. A is not just a pre-impulse, but a plausible real entry

### Blocking Reasons

Do not shift from B to A if:

- B is already the plausible real entry
- A behaves only like a pre-impulse
- A does not support a stable new block
- the advantage of A is too small or fragile
- the left shift would be merely cosmetic

### Action

If the rule applies:

- `replace_with_candidate`
- `preferred_bar_index = A.bar_index`

Otherwise:

- `keep_selected`

---

## Current Implementation Intention

This rule contract is intentionally defined before final threshold tuning.

That means:

- the logic is fixed first
- numeric thresholds are tuned later
- code activation should follow this contract, not invent new behavior ad hoc

---

## Architectural Boundary

The Decision Layer is responsible for:

- group suppression
- anchor replacement
- ignored candidate documentation
- final selected boundary indices

The Section Build Layer is responsible only for:

- building macro sections from final selected boundary indices
- preserving output structure

It should not re-decide macro-boundary logic.

## Current rule status

- `outro_guard`: active
- `weak_transition`: active
- `early_entry`: active
- `late_arrival`: active

## Validation policy for this contract

- This contract must not claim validation from a single track or a single reference outcome.
- Track-specific examples may help exploration, but they must not be written here as validated rule proof.
- Rule acceptance must be based on broader multi-track review and architectural plausibility.
- This document defines intended rule behavior and guardrails, not track-calibrated truth.

## Opening-boundary refinement target

Scope:
- this refinement target applies only to the opening macro-boundary decision of a track
- it is only about early-entry behavior near the beginning of a track
- it must not change grouping behavior
- it must not globally loosen all early-entry decisions

Problem to solve:
- an early candidate near the beginning of a track can act like a strong pre-impulse
- a later candidate in the same local group can mark the more plausible end of the opening block
- the current rule may still keep the earlier anchor too aggressively in that narrow situation

Desired behavior:
- for the opening macro-boundary decision, the rule should better protect a plausible opening block
- a later candidate may be preferred even if it is not the strongest raw boundary-score candidate
- this must remain a narrow opening-boundary refinement, not a global relaxation

Guardrails:
- do not use this as a reason to weaken all early-entry thresholds
- do not merge this with grouping fixes
- do not affect non-opening macro-boundary groups in this refinement step

## Opening-boundary decision shape

Narrow decision shape:
- this shape applies only to the opening local boundary group in a track
- it is only relevant when the currently selected anchor would end the opening block unusually early
- it only applies when there is a later candidate in the same local group
- the later candidate does not need to win on every raw metric
- the main question is whether the later candidate preserves a more plausible opening block

Interpretation target:
- the earlier candidate may be a strong pre-impulse
- the later candidate may represent the more believable end of the opening section
- this is an opening-boundary plausibility correction, not a global score override

What this refinement should explicitly allow:
- choosing the later candidate even if its raw boundary_score is somewhat lower
- choosing the later candidate even if delta_norm or forward_stability are not globally stronger
- prioritizing opening-block plausibility over raw local peak strength in this narrow case

What this refinement must still forbid:
- moving anchors to clearly weak later candidates
- changing non-opening groups with the same logic
- turning early-entry into a general right-shift rule

## Opening-boundary refinement

Purpose:
Describe a narrow decision-layer refinement for the opening local boundary group near the beginning of a track.

Intent:
In some cases, the first selected boundary may capture an early pre-signal instead of the more plausible end of the opening macro block. The refinement exists to evaluate whether a direct later candidate should be preferred in that narrow situation.

Scope:
- Only relevant for the opening local boundary group
- Only a decision-layer refinement
- Not a global macro retuning rule

Constraint:
This rule must not be justified by calibrating to a single track or a single reference outcome. It must only be accepted if it remains architecturally plausible and stable across multiple test cases.

Current status:
Defined as a narrow architectural refinement target. It should be treated as provisional unless broader multi-track validation supports it.
