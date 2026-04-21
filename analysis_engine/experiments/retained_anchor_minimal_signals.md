# Retained Anchor Minimal Signals

## Purpose
This document defines the minimal signal set for the first retained-anchor evaluation step.

Goal:
- keep the first iteration simple
- avoid premature complexity
- use a small, interpretable signal set
- prepare later `strong_cluster vs weak_duplicate` work

Important:
- this is a design reference
- this is not implementation yet
- this is not a full scoring system

---

## Target scope
This signal set applies only to:

**retained anchor with ignored neighbors**

Meaning:
- `group_candidate_count > 1`
- `final_anchor_bar_index != null`
- `anchor_changed = false`
- `ignored_group_bar_indices` is not empty
- `applied_rule_name = null`

---

## Minimal signal set

### 1) `group_candidate_count`
How many candidates are inside the local group.

Why it matters:
- very small groups are more likely to reflect narrow local duplication
- larger groups may indicate a broader local anchor structure

---

### 2) `group_span_bars`
How wide the local group is in bars.

Why it matters:
- very tight groups are more likely to behave like weak local duplicates
- wider groups may indicate a more meaningful local anchor cluster

---

### 3) `anchor score dominance`
How clearly the final anchor dominates the strongest ignored neighbor.

Concept:
- final anchor boundary score
- minus strongest ignored candidate boundary score

Why it matters:
- strong dominance suggests a cleaner winner and may point toward weak local duplication around it
- weak dominance suggests more competition inside the group and may point toward a stronger cluster pattern

---

## First-pass interpretation idea
The first retained-anchor reading should stay simple:

- few candidates
- small span
- strong anchor dominance

tends more toward:

**weak duplicate pattern**

Whereas:

- more candidates
- wider span
- weaker anchor dominance

tends more toward:

**stronger local cluster pattern**

---

## Explicitly not included yet
Do not include these yet:
- many extra metrics
- complicated heuristics
- musical verdicts
- quality judgments
- full confidence systems
- global aggregation logic

Keep the first pass small, readable, and testable.
