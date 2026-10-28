# Feature: Large-Model Loading and Interaction Performance Benchmark

Status: Implemented. Benchmark and regression guard are in place using the committed benchmark models in `tests/fixtures/benchmarkmodels/`.

## Goal

Establish a repeatable baseline of load-to-usable-view and interaction responsiveness for representative local IFC models, and guard that baseline against future regressions. This tranche does not change or optimize the loading or viewing path.

## Scope

Benchmark the IFC loading path against the committed benchmark models in `tests/fixtures/benchmarkmodels/` (three IFC2X3 Duplex files: architecture, MEP, electrical). The unit benchmark measures `processModel` (geometry streaming + metadata extraction) directly in Node/vitest. The E2E benchmark measures browser load-to-rendered using Playwright + Chrome. Keep all models local. Optimization is explicitly out of scope; the guard detects regressions only.

## Requirements

1. Define and document a repeatable desktop Chrome benchmark procedure, including browser/device conditions, fixture identity/provenance, repetitions, and the events used to measure load-to-ready and interaction responsiveness.
2. Measure load-to-ready time from the application's load-start event until loading is reported complete and the first usable rendered frame is observed. Measure interaction responsiveness from a documented user action to its rendered visual response using the same browser instrumentation and procedure across runs.
3. Record and commit a baseline result set with the existing fixtures. The baseline is the reference the regression guard compares against; it is descriptive, not a performance target or guarantee.
4. Add a regression guard that re-runs the benchmark and fails when a measured metric is worse than its committed baseline by more than a documented tolerance (to absorb measurement noise). The guard reports a regression; it does not require or trigger optimization. Baseline values are refreshed only by an explicit, reviewed update, not silently.
5. Measure only metrics that can be collected repeatably in the supported environment; explain measurement noise and distinguish observed results from guarantees.
6. Do not alter correct local IFC parsing, visible rendering, multi-model isolation, cancellation/removal behavior, or cleanup; this feature observes, it does not change the loading/viewing path.
7. Keep IFC files and model-derived data in memory and on-device only; do not transmit or persist them. Do not place local-only fixtures in source control, deployment artifacts, or diagnostic outputs.
8. Report missing local-only fixtures as skips, not passing qualification. If the existing fixtures do not represent the intended large-model profile, document the gap as a limitation and continue; fixtures are never expanded unattended (see the [Unattended Execution Policy](../plans/Phase_1_MVP.md#unattended-execution-policy)). Do not claim large-model compatibility beyond the tested fixture profile.

## Dependencies

- [IFC loading](ifc-loading.md), [model controls](model-controls.md), [overall architecture](../architecture.md), and [IFC test fixtures](../test-fixtures.md).
- Phase 1A acceptance must establish a correct baseline implementation before the benchmark is recorded.

## Module Contract

- This is a cross-cutting quality harness; it does not introduce a user-facing performance-control module, alter feature ownership boundaries, or modify the loading/viewing path.
- Benchmark and regression-guard scripts and outputs must follow the repository's test-artifact and local-only fixture policies.

## Acceptance Criteria

- The benchmark procedure runs on the approved existing fixture set and reports fixture availability, environment, repetitions, baseline measurements, variability, and whether the available fixture profile meaningfully represents larger models.
- A committed baseline exists and the regression guard reproducibly flags a metric that regresses beyond the documented tolerance, using the same fixture profile and protocol.
- Running the benchmark does not change model content and does not break Phase 1A tests or relevant Chrome rendering/interaction workflows.
- Tests and observations confirm no model upload, external runtime request, model-derived persistence, or fixture content leakage into committed/generated artifacts.
- Absent fixture profiles, measurement limits, observed regressions, and known constraints are documented; no optimization is performed and no broader performance guarantee is inferred.
