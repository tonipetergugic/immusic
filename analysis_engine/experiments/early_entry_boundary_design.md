# Early Entry Boundary Design

## Purpose

This note isolates a specific boundary failure class that should **not** be solved by blindly extending the current late-arrival rescoring logic.

The goal is to describe the **early entry / intro boundary problem** as a separate design case.

---

## Problem Class

**Problem class:** Early entry / intro boundary

This is the case where the musically correct section start happens a little **later** than the currently selected candidate, but the existing local rescoring logic does **not** move the boundary forward.

Typical reason:

- the current boundary already has strong novelty
- the following bars do not yet create a clearly superior late-arrival score
- intro / early-groove transitions often do not behave like classic drop-arrival cases
- therefore the same scoring logic that helps in late-arrival cases may fail here

---

## Verified Example

### David Forbes – Techno Is My Only Drug (Mixed)

**Observed result from listening:**
- Section 1 should end around **00:26**
- the next section should begin there
- current engine places the boundary too early at **bar 8** (~14.0s)

**Debug result:**
- base candidate **8** remains winner
- later candidates **9–11** do not beat it
- therefore the current rescoring prototype does **not** solve this case

---

## Why This Is Different From Late Arrival

This case is structurally different from a late-arrival / delayed-drop problem.

In late-arrival cases:
- a slightly later bar can win because it shows
  - better arrival stability
  - lower transition penalty
  - stronger post-boundary continuity

In early-entry cases:
- the first candidate may already look strong in novelty and break terms
- the musically correct later boundary may emerge only when looking at a **longer settling phase**
- the best signal may not be “largest local break”
- instead it may be closer to:
  - first stable arrival
  - first fully established groove state
  - first bar after transition noise finishes
  - first bar where the new pattern becomes persistent

So this should be treated as a **separate design problem**, not as a parameter tweak of the late-arrival formula.

---

## Design Constraint

Do **not** patch this by:
- simply increasing the comparison window
- globally preferring later bars
- lowering replacement thresholds
- weakening the base boundary too aggressively

Those changes would likely damage correctly placed boundaries in other tracks.

---

## Design Direction

A future solution for this class should likely evaluate one or more of these ideas:

### 1. First Stable Arrival
Score not just the break itself, but the first bar where the new state becomes stable for several bars afterward.

Possible intuition:
- boundary is better if bars `b+1`, `b+2`, `b+3`, maybe `b+4` show strong internal consistency

### 2. Transition Settling Detection
Treat the immediate change region as a noisy transition zone.
The boundary may be better placed at the first bar **after** this unstable zone.

Possible intuition:
- large novelty spike can happen before the true new section is fully established

### 3. Longer Context For Early Sections
Early section changes may need a slightly longer evaluation horizon than late-arrival shifts.

Possible intuition:
- intros and first groove entries often “land” over several bars instead of one sharp switch

### 4. Section-Type-Aware Boundary Logic
In the future, boundary handling may need different logic for:
- intro / first groove entry
- breakdown to drop
- drop to outro
- vocal pre-drop to real drop
- late energy reset

This note does **not** define such a system yet.
It only records that the intro / early-entry case should be separated conceptually.

---

## Current Conclusion

Current status:

- the local rescoring prototype is useful as a **debug tool**
- it can help in some late-arrival situations
- it does **not** solve the verified early-entry case
- therefore this class needs its **own dedicated scoring design step**

---

## Next Design Goal

Before any pipeline integration, define a dedicated concept for:

**“How should the engine detect the first musically stable section arrival in early-entry situations?”**

No implementation yet.
No code changes yet.
Only design separation.
