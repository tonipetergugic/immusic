# Decision Center Component Plan

## Purpose

The Decision Center is first developed and tested through the local lab route.

The lab route is not the final product surface.  
The final platform target remains the artist-facing Decision Center inside the real artist area.

The current goal is to keep reusable artist-facing components clearly separated from lab-only calibration components.

## Product Rule

Track Check is mandatory.

The required Track Check layer includes:

- Release Readiness
- Critical Warnings
- Technical Release Checks
- Next Step

The optional layer can include:

- AI Consultant
- deeper creative feedback
- coaching-style explanations
- extended insights

Optional feedback may later become premium or credit-based.

## Platform-ready Components

These components are reusable for the future platform-integrated Decision Center:

- `DecisionTrackHeader.tsx`
- `ReleaseReadinessPanel.tsx`
- `CriticalWarningsPanel.tsx`
- `TechnicalReleaseChecksPanel.tsx`
- `NextStepPanel.tsx`
- `ExtendedFeedbackPreview.tsx`
- `types.ts`

These components must stay independent from local file-system loading and lab-only debug data.

## Lab-only Components

These components are only for local testing, engine calibration, and payload inspection:

- `LabTrackSelector`
- `EngineSummaryPanel`
- `StructureMetricsPanel`
- `SegmentOverviewPanel`
- `BoundarySectionDebugPanel`
- `TechnicalMetricsRawPanel`
- `IssueDebugScoreContextPanel`
- `RawJsonInspectorPanel`
- `PayloadWarningsPanel`
- `ScrollUnlock`

These components must not be copied directly into the final platform page.

## Intended Artist-facing Order

The future platform page should follow this order:

1. Track Header
2. Release Readiness
3. Critical Warnings
4. Technical Release Checks
5. Next Step
6. Optional Feedback Preview

## Current Integration Rule

Do not connect the local lab route directly to the live artist flow yet.

First stabilize:

- Python analysis output
- `artist_decision_payload`
- reusable Decision Center components
- artist-facing page structure

Only after that, integrate the stable Decision Center back into the real platform route.

## Do Not Do Yet

Do not focus on:

- visual polish
- color tuning
- AI Consultant text polishing
- new payload fields
- live Supabase integration
- legacy payload compatibility hacks

The current priority is a clean structure and clear separation of reusable product UI from lab-only diagnostics.
