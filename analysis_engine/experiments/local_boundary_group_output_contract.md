# Local Boundary Group Output Contract

## Purpose
This document defines the minimal output contract for local boundary groups.

Goal:
- improve observability
- make group behavior easier to inspect
- prepare future `strong_cluster vs weak_duplicate` work
- avoid changing logic too early

Important:
- this contract is output-only
- no new thresholds
- no new heuristic behavior
- no new semantic labels yet

---

## Required fields per local boundary group

### `group_bar_indices: list[int]`
All bar indices that belong to the local group, sorted ascending.

Example:
```json
[52, 59, 67, 75]
initial_anchor_bar_index: int

The initially selected anchor for the group before rule application.

This is the raw starting anchor.

### `final_anchor_bar_index: int | null`

The final selected anchor for the group after rule application.

`null` is allowed when the group is suppressed and no final anchor remains.

anchor_changed: bool

Whether the anchor changed during rule application.

Rule:

true if initial_anchor_bar_index != final_anchor_bar_index
otherwise false
applied_rule_name: str | null

The rule that determined the final anchor result.

Allowed minimal values:

null
"opening_boundary_refinement"
"weak_transition"
"early_entry"
"late_arrival"
"outro_guard"

No additional labels yet.

ignored_group_bar_indices: list[int]

All group bar indices except the final anchor.

Rule:

the final anchor must not appear in this list

Example:

[59, 67, 75]
group_span_bars: int

The span of the local group in bars.

Rule:

max(group_bar_indices) - min(group_bar_indices)

Example:

group [52, 59, 67, 75]
group_span_bars = 23
group_candidate_count: int

The number of candidates inside the group.

Example:

group [52, 59, 67, 75]
group_candidate_count = 4
### `final_anchor_boundary_score: float | null`
Boundary score of the final anchor candidate.

`null` is allowed when the group is outside the retained-anchor dominance scope.

---

### `max_ignored_boundary_score: float | null`
Maximum boundary score among ignored group candidates.

`null` is allowed when the group is outside the retained-anchor dominance scope or when no ignored candidate score is available.

---

### `anchor_score_dominance: float | null`
Dominance of the final anchor over the strongest ignored candidate.

Definition:
```text id="l6k1yx"
final_anchor_boundary_score
- max_ignored_boundary_score

null is allowed when the group is outside the retained-anchor dominance scope.

Dominance scope constraint

These three dominance fields are intended only for:

retained anchor with ignored neighbors

Meaning:

group_candidate_count > 1
final_anchor_bar_index != null
anchor_changed = false
ignored_group_bar_indices is not empty
applied_rule_name = null

Outside this scope, the dominance fields may be null.
Explicitly not included yet

Do not add any of the following at this stage:

group_type
strong_cluster
weak_duplicate
confidence labels
extra score summaries
new heuristic flags

These can be added later only after the minimal observability layer is proven useful.

Intended use

This contract should make it easy to inspect:

how large a group was
how wide it was
which anchor was selected first
whether it changed
which rule caused the final result
which candidates inside the group were ignored

This is sufficient for the next technical step.
