# Feature: Large-Model Loading and Interaction Performance Benchmark

Status: Partially implemented locally. A Node/vitest regression guard (`tests/unit/benchmark.test.ts`) compares the median `processModel` time per fixture against `tests/artifacts/benchmark-baseline.json` (tolerance ×2.0, 3 warm runs, baseline from one Windows/Ryzen 7 desktop). A Chrome E2E (`tests/e2e/viewer.spec.ts`, "federates all three local files …") **records** combined load time, fit timing, JS heap, and long tasks as an attachment but does **not** compare them to a committed baseline. The fit timing measures click dispatch, not a rendered frame. Gates `1B_01` and `1B_05` are therefore not met for browser metrics.

## Summary

Measure two things on the committed Duplex fixtures and guard them against regressions: **load-to-ready** (file input to models reported loaded and a changed rendered frame) and **interaction-to-next-paint** for representative actions (fit, hide/show, select). Record a committed baseline per environment, compare medians of repeated runs against it with a documented tolerance, and fail only on regression. Report heap, long tasks, and fixture profile limits as observations, not guarantees. No optimisation and no change to the loading path [A1].

**Recommendation.** Keep the existing Node `processModel` guard, add a browser guard that uses the same protocol, and measure interactions with the browser's own Event Timing / INP definition (input delay + processing + presentation to the next paint), using web.dev's 200 ms "good" and 500 ms "poor" bands only as context, not as targets [S1]. Run the profile in Chrome DevTools with the recorded settings when investigating a regression [S2]. State plainly that the Duplex set is far below the 100,000–300,000-component models users report crashing web-ifc in Node [S3].

---

# Detailed Specification

## Problem

Without a reproducible browser baseline, a change that makes loading or interaction slower goes unnoticed until users complain. The current Chrome measurement is attached to test output but never compared, and its interaction timing is taken immediately after `click()` resolves, before the frame is presented, so it understates real latency [A1].

## Users

- Developers and reviewers who need a fast, trustworthy signal that a change did not regress loading or responsiveness on the supported fixtures.

## Goals

- Repeatable, documented measurement of load-to-ready and interaction-to-next-paint in desktop Chrome.
- A committed baseline per environment and a guard that fails only beyond tolerance.
- Honest reporting of variability, environment, and fixture-profile limits.

## Comparable Products (Research)

| Reference | What it provides | Docs | Video | Notes |
|---|---|---|---|---|
| web.dev / Chrome | Interaction to Next Paint (INP), Event Timing | [INP](https://web.dev/articles/inp) | n/a | Interaction latency = input delay + processing + presentation delay to next paint; good ≤ 200 ms, poor > 500 ms (p75 field) [S1]. |
| Chrome DevTools | Performance panel | [Performance](https://developer.chrome.com/docs/devtools/performance) | n/a | Incognito/clean profile, CPU throttling, long-task markers, FPS and frames [S2]. |
| web-ifc (That Open) | Large-model limits | [Issue #538](https://github.com/ThatOpen/engine_web-ifc/issues/538) | n/a | 300,000-component workloads abort; 4 GB WASM memory ceiling discussed [S3]. |

No user-facing product video applies: this is an internal quality harness, not a product feature. This is recorded as an explicit limitation of phase 5 [S4].

## What Good Looks Like (Findings)

- **Measure to the next paint.** INP's interaction latency includes input delay, handler processing, and presentation delay until the next frame [S1]. → R3 uses Event Timing `duration` (or rAF-after-handler) instead of `Date.now()` after `click()`.
- **Lab conditions are explicit.** DevTools recommends a clean profile (Incognito) and documents CPU throttling; recorded conditions make runs comparable [S2]. → R1.
- **Lab ≠ field.** web.dev notes lab INP depends on scripted interactions and is not a field measurement [S1]. → R7: results are observations on fixtures, not guarantees.
- **Memory ceilings exist.** web-ifc collaborator: "you are now hitting … a hard limit of 4GB which is what WASM can hold in memory" (27 Jan 2024) [S3]. → R6 records WASM/JS heap where available and the fixture-size gap.

## User Feedback (Forums)

- **Very large models crash.** verybigzhouhai reported web-ifc aborting on a model with 300,000 components and failing above 100,000–150,000 in a write test (25 Dec 2023–17 Feb 2024); the collaborator cited the 4 GB WASM limit and fixed a related memory leak [S3]. → R6/R7: document that the 17.5 MB / 926-element MEP fixture is the largest tested profile and claim nothing beyond it.
- **Slow-loading samples.** A web-ifc issue titled "Geometry: Sample that loads very slow, busy console + see through Slab" (#341, closed 22 Mar 2023) is listed in the issue search [S5]. → R2: load-to-ready must include geometry completion, not only parse.
- **Re-evaluation.** The existing requirements hold. Research adds next-paint interaction timing, explicit lab conditions, and a fixture-profile disclaimer.

## User Flow

No end-user UI. Developer flow:

1. Run `npm run test:unit` → Node `processModel` guard compares medians against `benchmark-baseline.json`.
2. Run the browser benchmark (Playwright, Chrome) → N = 5 runs per scenario after 1 warm-up; medians and spread compared against `benchmark-baseline.browser.json` for the matching environment key.
3. On regression, the test fails with metric, median, baseline, tolerance, and environment; the developer profiles in DevTools using the documented settings.
4. Baseline refresh is a separate, reviewed commit with the `[BENCHMARK UPDATE]` output.
- **Edge paths:** environment key missing from the baseline → reported as "no baseline for this environment" (skip, not pass); fixture missing → skip; variance above the documented bound → "unstable measurement" warning, not pass/fail.

## Wireframe / Sketch

No UI — wireframe not applicable.

## Requirements

- **R1 — Protocol.** Document browser version, headless/headed, viewport, device pixel ratio, CPU throttling (none by default), server mode (dev vs production preview), fixture names/hashes/sizes, warm-up and repetition counts, and the environment key [S2].
- **R2 — Load-to-ready.** From file-input `change` to all models `data-state=loaded` **and** the first rendered frame whose canvas differs from the empty frame [S5].
- **R3 — Interaction-to-next-paint.** For Fit, Hide/Show model, and Select element: from input event timestamp to the next presented frame, using `PerformanceEventTiming.duration` (with `durationThreshold` 16 ms) or an rAF-after-handler fallback; never `Date.now()` after `click()` resolves [S1].
- **R4 — Committed baselines.** Node baseline (`benchmark-baseline.json`, existing) and browser baseline (`benchmark-baseline.browser.json`) keyed by environment; each value is a median with spread. Baselines describe observations, not targets [A1].
- **R5 — Guard.** Fail when a median exceeds baseline × tolerance (Node ×2.0 existing; browser tolerance documented per metric). Report but do not fail on unstable measurements (spread above bound). Refresh only by explicit reviewed commit [A1].
- **R6 — Observations.** Record JS heap (CDP), long-task count/max, and, where available, WASM memory; these are reported, not guarded [S3].
- **R7 — Honest scope.** Report fixture profile (largest: 17.5 MB, 926 elements) and state that results do not establish large-model support beyond it; missing fixtures are skips [S3, A1].
- **R8 — No behaviour change and privacy.** The benchmark does not modify loading/viewing code paths, transmit or persist model data, or write model content into artifacts [A1].

## Acceptance Criteria

- [x] AC1: Given the committed fixtures, when the Node guard runs, then each fixture's median `processModel` time is compared against its committed baseline × 2.0. *(Proven by `tests/unit/benchmark.test.ts` and `tests/artifacts/benchmark-baseline.json`; 3 tests passed locally on 2026-11-08 in this dev container.)*
- [ ] AC2: Given the browser benchmark, then load-to-ready and interaction-to-next-paint medians over 5 runs are produced with spread and environment key.
- [ ] AC3: Given a browser baseline for the environment, when a metric's median exceeds baseline × tolerance, then the run fails with a diagnostic message.
- [ ] AC4: Given an injected 300 ms delay in the Fit handler (test-only), then the browser guard detects the regression.
- [ ] AC5: Given no baseline for the environment, then the run reports a skip, not a pass.
- [ ] AC6: Given any benchmark run, then no external requests occur, no model data is persisted, and attachments contain only metrics. *(Partial: the Chrome E2E asserts zero unexpected requests and settings-only storage; attachment content is not asserted.)*
- [ ] AC7: Given the report, then it states the fixture profile and the no-guarantee disclaimer.

## Test Cases (for developers)

| ID | Type | Precondition | Steps | Expected result |
|---|---|---|---|---|
| T1 | Unit (Node) | Committed fixtures | Run guard | Medians ≤ baseline × 2.0. |
| T2 | Chrome perf | Production preview, headless, 1280×720 | 1 warm-up + 5 runs load-to-ready | Medians/spread recorded. |
| T3 | Chrome perf | Loaded models | Event Timing for Fit, Hide, Select | Durations recorded per run. |
| T4 | Chrome perf | Injected delay (test flag) | Run guard | Fails with diagnostic. |
| T5 | Chrome perf | Unknown environment key | Run | Skip reported. |
| T6 | Chrome perf | Any run | Inspect requests, storage, attachments | No external requests; settings-only storage; metrics only. |

## Module Contract

- Cross-cutting test harness only: `tests/unit/benchmark.test.ts` (Node), a browser benchmark spec under `tests/e2e/`, and baselines under `tests/artifacts/`. No user-facing module; no changes to `src/` beyond an optional test-only hook already used by E2E.

## Dependencies

- [IFC loading](ifc-loading.md), [model controls](model-controls.md), [element selection](element-selection.md), [test fixtures](../test-fixtures.md), [development guide](../development.md), and [Phase 1 MVP](../plans/Phase_1_MVP.md) gates 1B_01 and 1B_05.

## Assumptions

- The committed Duplex IFC2x3 files are the approved benchmark set per [test fixtures](../test-fixtures.md); no fixtures are added unattended [A1].
- CI/browser variance is higher than local; browser tolerance may differ per metric and is documented with the baseline.

## Out of Scope

- Any optimisation, LOD, streaming, or worker changes.
- Field/RUM telemetry (would breach the local-only boundary).
- GPU memory measurement and mobile devices.

## Open Questions

- None. Benchmark-only scope with no optimisation is approved [A1].

## Sources

- **[S1]** web.dev — "Interaction to Next Paint (INP)" — https://web.dev/articles/inp. Interaction latency = input delay + processing + presentation delay to next paint; good ≤ 200 ms, poor > 500 ms at p75; lab INP depends on scripted interactions; Event Timing `durationThreshold` minimum 16 ms. Last updated 2 Sep 2025; accessed 2026-11-08.
- **[S2]** Chrome DevTools — "Analyze runtime performance" — https://developer.chrome.com/docs/devtools/performance. Clean Incognito profile, CPU throttling settings, long-task markers, FPS/frames. Based on Chrome 129; accessed 2026-11-08.
- **[S3]** web-ifc issue #538 — "The program exited abnormally while processing the super large model" — https://github.com/ThatOpen/engine_web-ifc/issues/538. verybigzhouhai, 25 Dec 2023: 300,000-component model aborts; beachtom, 27 Jan 2024: "a hard limit of 4GB which is what WASM can hold in memory"; memory leak fix 2 Feb 2024; further leak reported 17 Feb 2024.
- **[S4]** Capture note — no video was captured because this is an internal benchmark harness with no product UI; `large-model-performance/assets/README.md` records this. Recorded per the media skill's honest-unavailability rule.
- **[S5]** web-ifc issue search "slow large file" — https://github.com/ThatOpen/engine_web-ifc/issues?q=slow+large+file. Lists #341 "Geometry: Sample that loads very slow, busy console + see through Slab" (closed 22 Mar 2023) and #538. Accessed 2026-11-08.
- **[A1]** Approved decisions and local implementation (not external evidence): [Phase 1 MVP](../plans/Phase_1_MVP.md) (1B_01, 1B_05, no optimisation), [test fixtures](../test-fixtures.md), `tests/unit/benchmark.test.ts`, `tests/artifacts/benchmark-baseline.json`, and `tests/e2e/viewer.spec.ts` (resource-measurement attachment).

---

# Research

## web.dev and Chrome DevTools

- INP's definition of interaction latency is the measurement basis for R3; its thresholds are context only [S1]. DevTools settings define the investigation protocol [S2].

## web-ifc

- Reported crashes and the 4 GB WASM ceiling show why the fixture-profile disclaimer (R7) is necessary [S3, S5].
