# Artist Feedback Payload Audit

This document describes the read-only audit for generated Artist Feedback Payloads.

## Purpose

`audit_artist_feedback_payload.py` verifies that artist-facing payload guidance remains internally consistent.

The audit builds payloads in memory from existing `analysis.json` files and checks important contract rules without writing or modifying payload files.

## Command

Run the audit from the project root:

```bash
python3 -m analysis_engine.audit_artist_feedback_payload

To audit one specific analysis.json file:

python3 -m analysis_engine.audit_artist_feedback_payload analysis_engine/output/<track-folder>/analysis.json
What it checks

The audit currently verifies:

structure_overview.status = available is only used when real structure evidence exists.
technical_release_listening_check is backed by artist_guidance.technical_overview.
mix_translation_listening_check is backed by artist_guidance.mix_overview.
limiter_headroom_stress_check includes limiter_stress in mix_overview.available_signal_groups.
section_timeline_* listening guidance includes valid section timeline evidence.
Read-only guarantee

The audit does not write files.

It only:

reads existing analysis.json files
builds artist feedback payloads in memory
prints OK or FAIL
exits with code 1 if any rule fails
Expected success output
Audit passed for 10 artist feedback payload(s).
When to run

Run this audit after changes to:

artist_feedback_payload.py
artist guidance builders
section_timeline
structure_overview
technical_overview
mix_overview
listening_guidance
Related files
analysis_engine/audit_artist_feedback_payload.py
analysis_engine/artist_feedback_payload.py
analysis_engine/artist_feedback_payload_contract.md
