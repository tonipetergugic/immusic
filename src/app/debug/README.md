# Debug Pages (Temporary)

These pages are temporary tools for manual testing during Phase 1 / Phase 2 prep.

## /debug/exposure-test
- Purpose: Trigger `POST /api/tracks/[id]/exposure/delivered` from an authenticated session
- Notes:
  - Requires login (redirects to `/login` if not authenticated)
  - Track ID is editable in the UI
- Cleanup:
  - Remove the entire `src/app/debug` folder before Phase 2 automatic Earned Credit calculations go live.


