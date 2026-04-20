# Candidate Rescoring Schema

## Goal

Define a small, explicit rescoring schema for transition-sensitive boundaries before any engine code is changed.

This step is still design-only.
No implementation is allowed in this step.

---

## Why This Exists

Some boundaries are detected too early because the first strong change is only the beginning of a transition.

Typical EDM example:
- pre-drop vocals
- riser / snare build
- fill before the drop
- transition FX before the true arrival

The current candidate may therefore be real as a change point, but still not the best final structural boundary.

---

## Scope

This rescoring schema only applies after the engine has already selected a candidate bar.

It is not a full replacement for the main candidate finder.

It is a local comparison layer.

---

## Candidate Window

For each selected boundary candidate, compare these positions:

- base candidate
- candidate + 1 bar
- candidate + 2 bars
- candidate + 3 bars

No wider shift window is defined in this step.

---

## Intended Use

This local rescoring should only be considered for transition-sensitive cases.

It should not blindly move every boundary later.

The default assumption remains:
- keep the original candidate
- only shift if the later bar is clearly better

---

## Evaluation Idea

Each compared position should later receive a local score built from these groups:

### 1) Break quality
How clearly does this bar separate from what comes before?

Useful signals:
- novelty
- delta_from_prev
- similarity_prev_to_here

Desired interpretation:
- stronger break is better
- lower similarity to the prior state is better

---

### 2) Arrival stability
How stable does the music become right after this bar?

Useful signals:
- similarity_here_to_next
- next_similarity
- next_next_similarity

Desired interpretation:
- a true structural arrival should produce a more coherent state after the chosen bar
- if the next bars still look unstable or transitional, the chosen bar may be too early

---

### 3) Transition continuation warning
Does the change still appear to be unfolding after this bar?

Warning signs:
- another stronger shift happens immediately after
- immediate post-boundary bars do not stabilize
- the chosen bar looks like transition entry, not arrival

Desired interpretation:
- if a later nearby bar gives a cleaner arrival, the earlier bar should lose

---

## Default Decision Rule

The base candidate should remain in place unless a later candidate inside the +1 to +3 window is clearly superior.

“Clearly superior” is not yet numerical in this step.
It means:

- better arrival stability
- no weaker break quality overall
- better fit as the beginning of a new stable section

If the evidence is mixed, keep the original candidate.

---

## Safe Shift Philosophy

The rescoring layer must be conservative.

That means:

- do not move boundaries just because a later bar exists
- do not chase tiny local fluctuations
- do not optimize for visual neatness alone
- only move a boundary when the later bar is musically more convincing as the actual section start

---

## Expected Behavior On Known Cases

### Early pre-drop case
Likely behavior:
- base candidate marks the start of the transition
- later candidate may better mark the true arrival
- shift may be justified

### Clean hard boundary
Likely behavior:
- base candidate already strong
- later bars should not win
- no shift

### Gradual outro case
Likely behavior:
- shift logic must remain cautious
- no forced later movement unless the new bar is clearly more plausible

---

## Important Constraints

This schema must not:

- hardcode track names
- hardcode specific bar numbers
- assume EDM labels like build/drop as truth
- replace the main boundary finder
- force later movement globally

---

## What The Next Step Must Decide

After this schema is accepted, the next design step must define:

- exact local comparison fields
- exact score formula
- exact tie behavior
- minimum margin required for a shift
- whether some cases should allow only +1 / +2 but not +3

Only after that should implementation be considered.
