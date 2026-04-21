# Boundary Ownership Contract

## Purpose
This document defines which layer owns which responsibility in the boundary pipeline.

Goal:
- keep responsibilities clean
- prevent heuristic drift
- avoid pushing boundary semantics into the wrong file
- make future changes easier to evaluate

---

## 1) `boundary_decision.py`

### Responsibility
Conservative early duplicate suppression on pair level.

### Owns
- pairwise comparison of nearby boundary candidates
- weak-duplicate suppression
- small local gap checks
- simple pre-filter decisions

### Does **not** own
- full local-group semantics
- choosing the musically best anchor for a whole cluster
- opening / early-entry / late-arrival / weak-transition interpretation
- section construction

### Short definition
**Duplicate Suppression Layer**

---

## 2) `macro_boundary_decision.py`

### Responsibility
Local-group anchor semantics.

### Owns
- grouping nearby boundary candidates into local boundary groups
- selecting one anchor candidate for a group
- deciding whether a group behaves like a real anchor cluster vs a weaker local pattern
- opening-boundary refinement
- early-entry behavior
- late-arrival behavior
- weak-transition handling

### Does **not** own
- low-level pairwise duplicate cleanup already handled earlier
- raw section object construction
- unrelated global post-processing

### Short definition
**Cluster Anchor Decision Layer**

---

## 3) `sections.py`

### Responsibility
Pure translation from final boundary indices into section objects.

### Owns
- sorting final boundary indices
- deriving section start/end ranges
- building neutral section payloads

### Does **not** own
- candidate filtering
- near-neighbor suppression
- duplicate heuristics
- local-group anchor logic
- musical rule interpretation

### Short definition
**Pure Translation Layer**

---

## Target Architecture
- `boundary_decision.py` = weak duplicate filter
- `macro_boundary_decision.py` = strong cluster / anchor logic
- `sections.py` = neutral section builder

---

## Important Rule
Future `strong_cluster vs weak_duplicate` logic must **not** be implemented in `sections.py`.

If the question is:
- "Are these two nearby candidates basically the same event?"  
  -> `boundary_decision.py`

If the question is:
- "Which candidate inside this local group is the musically correct anchor?"  
  -> `macro_boundary_decision.py`
