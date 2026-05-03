# Artist Feedback Payload Audit

This document describes the read-only audit for generated Artist Feedback Payloads.

## Purpose

`audit_artist_feedback_payload.py` verifies that artist-facing payload guidance remains internally consistent.

The audit builds payloads in memory from existing `analysis.json` files and validates the current Artist Feedback Payload contract.

In addition, the audit checks stored-payload parity: if an `artist_feedback_payload.json` exists next to an `analysis.json`, the stored JSON must be exactly equal to the payload produced by the current builder.

The audit itself is read-only. It does not write or update payload files.

## Command

Run the audit from the project root:

```bash
python3 -m analysis_engine.audit_artist_feedback_payload
```

To audit one specific `analysis.json` file:

```bash
python3 -m analysis_engine.audit_artist_feedback_payload analysis_engine/output/<track-folder>/analysis.json
```

## Local generated output parity

`analysis_engine/output/` is ignored by Git and contains local generated analysis artifacts.

Stored `artist_feedback_payload.json` files under `analysis_engine/output/<track>/` are therefore local generated outputs, not versioned fixtures.

The parity check is a local consistency check:

```text
analysis.json
→ current artist feedback payload builder
→ stored artist_feedback_payload.json
→ exact equality check
```

If the parity check fails, regenerate the stored payload files with:

```bash
python3 -m analysis_engine.write_artist_feedback_payload --all
```

Then rerun:

```bash
python3 -m analysis_engine.audit_artist_feedback_payload
```

For future CI or versioned regression tests, use dedicated fixtures outside `analysis_engine/output/`.

## Coverage audit

`audit_artist_feedback_payload_coverage.py` reports non-gating coverage for existing generated `artist_feedback_payload.json` files.

Command:

```bash
python3 -m analysis_engine.audit_artist_feedback_payload_coverage
```

The coverage audit is informational only. Missing coverage is not a contract failure.

It reports coverage for:

- release readiness states
- track status labels/states
- technical release check states by area
- critical warning codes
- structure_overview statuses and key field presence
- technical_overview provenance fields
- mix_overview provenance fields
- listening_guidance item counts and evidence.source_signal values

Use it to identify missing edge-case fixtures without making the main contract audit fail.

## What it checks

The audit currently verifies:

- structure_overview.status = available is only used when real structure evidence exists.
- technical_release_listening_check is backed by artist_guidance.technical_overview.
- mix_translation_listening_check is backed by artist_guidance.mix_overview.
- limiter_headroom_stress_check includes limiter_stress in mix_overview.available_signal_groups.
- section_timeline_* listening guidance includes valid section timeline evidence.
- `ai_consultant` is validated as a status-only block: it must contain exactly `summary_status`, `local_summary_filename`, and `note`; `summary_status` must be `not_generated_by_engine`; `local_summary_filename` must be `ai_consultant_summary.md`; `note` must be a non-empty string.

## Read-only guarantee

The audit does not write files.

It only:

- reads existing analysis.json files
- builds artist feedback payloads in memory
- prints OK or FAIL
- exits with code 1 if any rule fails

## Expected success output

Audit passed for 10 artist feedback payload(s).

## When to run

Run this audit after changes to:

- artist_feedback_payload.py
- artist guidance builders
- section_timeline
- structure_overview
- technical_overview
- mix_overview
- listening_guidance

## Related files

- analysis_engine/audit_artist_feedback_payload.py
- analysis_engine/artist_feedback_payload.py
- analysis_engine/artist_feedback_payload_contract.md
