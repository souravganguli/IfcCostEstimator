# Feature: Loading and Error Feedback

Status: Locally verified with isolated feature tests, simulated recoverable allocation/initialization failures, and Chrome/Edge initialization/context-loss browser checks. Real process-level memory exhaustion is not claimed recoverable. Live deployment verification remains pending.

## Goal

Make loading outcomes and recoverable failures understandable without disrupting models already loaded.

## Scope

Include queued/loading outcomes, empty states, and recoverable file, parsing, graphics, and resource-limit errors. Exclude remote diagnostics, analytics, crash recovery guarantees, and recovery from browser process termination.

## Requirements

1. Show distinguishable queued, loading, successful, and failed outcomes for attempted loads, including when filenames repeat.
2. Do not display invented progress percentages. Use indeterminate status unless the engine exposes meaningful progress.
3. Provide concise, actionable error messages for invalid or unsupported files and detectable graphics or resource failures. Never leave failed operations in a permanent loading state.
4. A recoverable per-file failure must preserve successfully loaded models and allow another loading attempt.
5. Present an understandable empty state when no models are loaded and an unavailable-viewer state when required graphics capabilities are missing.
6. Keep model contents and derived data out of remote diagnostics. Do not introduce telemetry or external error-reporting services.

## Dependencies

- [Overall architecture](../../Readme.md) and [POC scope and browser targets](../plans/Phase_0_POC_Viewer.md).
- [IFC loading](ifc-loading.md), engine error reporting, and renderer capability checks.

## Module Contract

- Public entrypoint: `mountFeedback` in [src/features/loading-and-errors/index.ts](../../src/features/loading-and-errors/index.ts).
- Owns the empty/error overlay, status/footer summary, and session/availability subscriptions. Requires read-only observations and exposes a notice callback to application composition; it does not mutate model or graphics state.
- A fatal viewer error remains authoritative over later settings notices. Disposing removes both subscriptions and owned DOM without modifying sibling features. Model-row file error presentation belongs to the model-controls module through the shared model summary.

## Acceptance Criteria

- Load multiple files and verify their statuses follow actual operations, including distinct outcomes for repeated filenames.
- Load invalid and unsupported files; verify a clear error replaces loading status and a subsequent valid file can load.
- Simulate a detectable graphics initialization failure and a recoverable parser/resource failure; verify clear feedback without a false success state.
- Confirm recoverable file errors preserve models already loaded and status UI does not overlap viewer controls.
- Inspect network traffic and confirm no diagnostic requests transmit model contents or derived data.