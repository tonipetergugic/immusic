# Audio Ingest (IMUSIC) — Module Overview

This folder contains the technical audio ingestion + analysis utilities used by the IMUSIC AI Track Check pipeline.
The goal is strict separation of responsibilities: small, testable modules instead of a single monolith.

## Entry Points

### ✅ Preferred (new)
- `src/lib/audio/ingest/index.ts`
  - Central re-export "orchestrator" for the ingest module layer.
  - Import from here to avoid deep imports.

### ✅ Compatibility facade (legacy but stable)
- `src/lib/audio/ingestTools.ts`
  - Thin facade that re-exports from `@/lib/audio/ingest`.
  - Kept to avoid widespread refactors in callers.

## Modules

### `metadata.ts`
- `ffprobeDurationSeconds`
- Pure ffprobe-based metadata extraction (duration).
- No business logic.

### `wav-conversion.ts`
- `writeTempWav`
- `transcodeWavFileToMp3_320`
- Pure file IO + transcode helpers.
- No analysis/metrics.

### `pcm-stream-analysis.ts`
PCM streaming analysis using `spawn("ffmpeg", ...)` and `-f f32le` (pipe).
- `ffmpegDetectTruePeakOvers`
- `ffmpegDetectPhaseCorrelation`
- `ffmpegDetectTransientPunchMetrics`
- `ffmpegDetectPhaseCorrelationEvents`
Also owns the local types required by these functions:
- `TruePeakOverWindow`
- `PhaseCorrEvent`
- `TransientPunchMetrics`

### `ffmpeg-stderr-analysis.ts`
Analysis that runs ffmpeg via exec + parses `stderr` output (no PCM piping).
Includes functions like:
- silence detection
- astats parsing
- ebur128 parsing (LUFS / true peak / LRA)
Also owns related local types:
- `SilenceSegment`
- `TruePeakOverEvent`

## Principles (Hard Rules)

- **No business logic** in ingest modules.
- No queue updates, no decisions, no credits, no unlock logic.
- Ingest modules are purely technical utilities.
- Callers (AI Track Check worker) decide how results are used.

## Local Testing (Smoke)
After changes:
- `npx tsc --noEmit`
- Upload a track → processing → feedback page → unlock → verify no errors and no leaks.

---
