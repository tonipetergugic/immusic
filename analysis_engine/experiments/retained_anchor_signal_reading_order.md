# Retained Anchor Signal Reading Order

## Purpose
This document defines the reading order for the first retained-anchor signal set.

Goal:
- create a stable reading sequence
- avoid overweighting candidate count too early
- keep the first interpretation pass simple and consistent

Important:
- this is a reading order
- this is not implementation logic
- this is not a threshold system

---

## Scope
This reading order applies only to:

**retained anchor with ignored neighbors**

Meaning:
- `group_candidate_count > 1`
- `final_anchor_bar_index != null`
- `anchor_changed = false`
- `ignored_group_bar_indices` is not empty
- `applied_rule_name = null`

---

## Reading order

### 1) `anchor_score_dominance`
Read this first.

Main question:
- is there a clear winner over the strongest ignored neighbor?

Why first:
- this is the clearest local competition signal

---

### 2) `group_span_bars`
Read this second.

Main question:
- is the local group very tight or more spread out?

Why second:
- spatial tightness helps interpret whether the ignored candidates behave more like nearby duplicates or part of a broader local cluster

---

### 3) `group_candidate_count`
Read this third.

Main question:
- how many candidates exist inside the group?

Why third:
- candidate count matters, but should not dominate the interpretation too early

---

## Guiding idea
The first retained-anchor reading should follow this order:

1. dominance
2. span
3. count

Not the other way around.

---

## Interpretation constraint
This reading order does not yet produce:
- final labels
- thresholds
- musical judgments
- quality verdicts

It only stabilizes how the retained-anchor evidence should be read.
