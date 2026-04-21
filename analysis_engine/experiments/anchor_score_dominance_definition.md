# Anchor Score Dominance Definition

## Purpose
This document defines the first minimal dominance metric for retained-anchor groups.

Goal:
- keep the first retained-anchor evaluation simple
- use an interpretable dominance signal
- avoid relying on a more complex composite score too early

Important:
- this is a design definition
- this is not implementation yet

---

## Scope
This dominance metric applies only to:

**retained anchor with ignored neighbors**

Meaning:
- `group_candidate_count > 1`
- `final_anchor_bar_index != null`
- `anchor_changed = false`
- `ignored_group_bar_indices` is not empty
- `applied_rule_name = null`

---

## Definition

### `anchor_score_dominance`
```text
final_anchor_boundary_score
- max(boundary_score of ignored group candidates)
Why boundary score

The first-pass dominance metric should use:

boundary_score

not the more complex composite:

score

Reason:

simpler
easier to inspect
easier to explain
closer to the direct boundary-strength question
Interpretation idea
larger dominance -> cleaner winner
smaller dominance -> stronger local competition

This is only a first-pass retained-anchor signal.

It does not yet mean:

musically correct
musically incorrect
final quality judgment
Examples
Example A
final anchor boundary score = 0.5721032001
strongest ignored boundary score = 0.4149302613

Result:

anchor_score_dominance ≈ 0.1572
Example B
final anchor boundary score = 0.9816968441
strongest ignored boundary score = 0.5067941038

Result:

anchor_score_dominance ≈ 0.4749
