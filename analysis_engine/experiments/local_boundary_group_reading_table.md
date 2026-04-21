# Local Boundary Group Reading Table

## Purpose
This document defines a neutral reading table for local boundary group outcomes.

It is descriptive only.

Goal:
- make local-group outputs easier to read
- create a shared interpretation layer before new logic is added
- avoid premature semantic labels like `strong_cluster` or `weak_duplicate`

Important:
- this is not implementation logic
- this is not a scoring layer
- this is not a musical verdict layer

---

## 1) Isolated Anchor

### Pattern
- `group_candidate_count = 1`
- `final_anchor_bar_index != null`
- `anchor_changed = false`
- `applied_rule_name = null`

### Meaning
A single stable boundary candidate with no local competition.

---

## 2) Retained Anchor With Ignored Neighbors

### Pattern
- `group_candidate_count > 1`
- `final_anchor_bar_index != null`
- `anchor_changed = false`
- `ignored_group_bar_indices` is not empty
- `applied_rule_name = null`

### Meaning
The group contains multiple local candidates, but the initially selected anchor remains the final anchor.

---

## 3) Rule-Shifted Anchor

### Pattern
- `group_candidate_count > 1`
- `final_anchor_bar_index != null`
- `anchor_changed = true`
- `applied_rule_name` is set

### Meaning
The group contains multiple plausible candidates, and a rule deliberately shifts the anchor.

---

## 4) Suppressed Group

### Pattern
- `final_anchor_bar_index = null`
- `anchor_changed = true`
- `applied_rule_name` is set

### Meaning
The group exists, but the final anchor is removed completely.

---

## Important Constraint
This reading table is descriptive, not normative.

It does not yet mean:
- `strong_cluster`
- `weak_duplicate`
- musically correct
- musically incorrect
- good
- bad

It only describes how the current engine resolved the local group.

---

## Current neutral group forms
Before introducing `strong_cluster vs weak_duplicate`, local groups should first be read in these four neutral forms:

- isolated anchor
- retained anchor with ignored neighbors
- rule-shifted anchor
- suppressed group
