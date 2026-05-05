# Upload processing to Decision Center flow decision

## Decision

After upload processing finishes, the artist should be sent directly to the Decision Center for the processed track.

This applies to both normal Track Check outcomes:

- accepted
- rejected

The artist should not see an intermediate choice between Feedback and My Tracks.

## Exceptions

Do not redirect directly to the Decision Center for:

- processing errors
- duplicate WAV/audio cases
- missing queue or invalid queue cases

These cases should keep their existing error/duplicate handling.

## Product flow

Target flow:

Upload
→ Processing
→ Decision Center for selected track

Inside the Decision Center, the artist can open the paid Detailed Feedback using credits.

## Routing implication

The Decision Center must be able to open a specific processed track via `queue_id`.

Expected platform route shape:

`/decision-center-lab?queue_id=<queue-id>`

A later production route name can replace `/decision-center-lab`, but the selected-track handoff should remain queue-based.

## Implementation status

Not implemented yet.

No redirect logic has been changed by this document.
