# Artist Decision Center Plan

## Product role

`/artist/decision` is the main artist-facing feedback surface.

It should not become a direct copy of the old `/artist/upload/feedback` page.

The old feedback page can remain temporarily as a detailed technical feedback page during migration.

## Artist-facing principles

The Decision Center should explain feedback in plain artist language.

Do not expose:
- score names
- segment counts
- bar-level analysis
- decision traces
- engine/debug terms
- raw internal structure fields

Focus on:
- what works well
- what may be worth checking
- why it matters musically
- one clear next step

## Target page structure

1. Summary
2. What works well
3. What may be worth checking
4. Structure / Movement
5. Technical release checks
6. Detailed feedback link

## Structure / Movement wording

Use simple language such as:
- The main changes feel clear and easy to follow.
- Some musical or arrangement ideas seem to return across the track.
- Some parts may feel relatively similar in shape.
- You may want to check whether the different parts stand out enough.

Avoid technical wording such as:
- transition_score
- repetition_score
- contrast_score
- segment_count
- bar-level material
- macro sections
- boundary decisions

## Technical release checks

Show only compact, artist-useful release checks such as:
- loudness
- true peak
- dynamics
- stereo stability
- low-end mono stability

Detailed engineering views can stay on the detailed feedback page until the migration is complete.

---

## Target data contract

The Decision Center should eventually read one prepared artist-facing block:

`artist_decision_payload`

Example shape:

```json
{
  "summary": "Short artist-facing summary.",
  "what_works_well": [
    "The main changes feel clear and easy to follow."
  ],
  "what_may_be_worth_checking": [
    "Some parts may feel relatively similar."
  ],
  "structure_movement": {
    "main_message": "The track shows clear movement between the main parts.",
    "supporting_points": [
      "Some musical or arrangement ideas seem to return across the track."
    ]
  },
  "technical_release_checks": [
    {
      "label": "True Peak",
      "status": "check",
      "message": "You may want to check limiter or export headroom before release."
    }
  ],
  "next_step": "Listen once with focus on how clearly the main parts differ, then check export headroom."
}
```

---

## Target data contract

The Decision Center should eventually read one prepared artist-facing block:

`artist_decision_payload`

Example shape:

```json
{
  "summary": "Short artist-facing summary.",
  "what_works_well": [
    "The main changes feel clear and easy to follow."
  ],
  "what_may_be_worth_checking": [
    "Some parts may feel relatively similar."
  ],
  "structure_movement": {
    "main_message": "The track shows clear movement between the main parts.",
    "supporting_points": [
      "Some musical or arrangement ideas seem to return across the track."
    ]
  },
  "technical_release_checks": [
    {
      "label": "True Peak",
      "status": "check",
      "message": "You may want to check limiter or export headroom before release."
    }
  ],
  "next_step": "Listen once with focus on how clearly the main parts differ, then check export headroom."
}

Artist-facing text may mention:

clear main changes
recurring ideas
parts that may feel similar
headroom
loudness
low-end stability
stereo stability

Artist-facing text should not mention:

score names
segment counts
bar-level analysis
macro sections
boundary decisions
decision traces
engine/debug terms
