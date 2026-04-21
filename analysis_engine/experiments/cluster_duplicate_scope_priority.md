# Cluster vs Duplicate Scope Priority

## Purpose
This document defines where future `strong_cluster vs weak_duplicate` work should start.

Goal:
- keep the first implementation narrow
- avoid mixing unrelated group forms
- focus on the most relevant local-group pattern first

---

## Primary target group form
Future `strong_cluster vs weak_duplicate` work should start with:

**retained anchor with ignored neighbors**

### Why
This is the most relevant neutral group form for the question:

- are the ignored nearby candidates only weak local duplicates?
- or does the group represent a stronger local anchor cluster?

This is the clearest and safest starting point.

---

## Not the initial target

### 1) Isolated Anchor
Do not start here.

Reason:
- there is no real local cluster-vs-duplicate question
- only one candidate exists

---

### 2) Suppressed Group
Do not start here.

Reason:
- the main event is suppression, not cluster semantics
- this is a different problem space

---

### 3) Rule-Shifted Anchor
Do not start here.

Reason:
- the first-order behavior is the rule-driven anchor shift
- adding cluster-vs-duplicate semantics here too early would mix concerns

This can be revisited later.

---

## Initial implementation priority
First focus only on groups that match:

- `group_candidate_count > 1`
- `final_anchor_bar_index != null`
- `anchor_changed = false`
- `ignored_group_bar_indices` is not empty
- `applied_rule_name = null`

This is the retained-anchor starting scope.

---

## Key rule
Do not expand the first implementation to all group forms at once.

Start narrow.
Validate.
Then extend carefully if needed.
