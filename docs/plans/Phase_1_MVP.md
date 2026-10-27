# Phase 1: MVP

Phase: **1**. Major version: **1**. Baseline release: **1.00.00** (npm: `1.0.0`). This plan defines Phase 1A as the first delivery tranche; it does not change the package version or claim implementation or release completion.

Status: **Planned.** The Phase 1A draft baseline is approved for implementation. No Phase 1A runtime feature is implemented or verified.

## Goal

Add familiar model-inspection, navigation, and appearance workflows to the browser-based local IFC viewer while retaining reliable multi-model viewing and the project's privacy and resource boundaries (Phase 1A), IFC-derived plan and plan-section drawings plus large-model performance (Phase 1B), and quantity takeoff, cost estimation and Excel export (Phase 1C).

This delivery plan sets scope, sequence, and evidence gates. Phase 1A feature behavior is defined in the linked specifications; candidate research and Phase 1B assignments are in [Phase 1 viewer market research](../research/phase-1-viewer-market-research.md).

## Unattended Execution Policy

Phase 1A, 1B and 1C are authorized to run in order without pausing for interactive approval. The following pre-authorized rules replace the former human gates:

- **Drawing go/no-go (1B_02):** user-approved **Go (2026-10-27)** to implement drawings from the app's in-app triangle geometry without adopting That Open / Fragments; see the [Phase 1B drawing go/no-go recommendation](../research/phase-1-viewer-market-research.md#phase-1b-drawing-gono-go-recommendation-pre-run). If drawing implementation fails its automated `1B_02`/`1B_03` acceptance, the agent records a no-go, skips plan-view and plan-section, and continues to 1C. A drawings no-go is non-blocking.
- **Drawing dependency:** adding an MIT, BSD or Apache-2.0, same-origin drawing library is pre-approved only as a fallback if the in-app approach fails; otherwise no drawing dependency is added.
- **Excel library (1C):** ExcelJS is pre-approved if its licence is MIT and its bundle cost is acceptable at `1C_01`; otherwise fall back to a hand-written minimal XLSX writer with no dependency.
- **Estimate schema (1C):** the agent defines, versions and documents the estimate JSON and CSV schema and continues.
- **Manual verification:** acceptance steps are satisfied by automated equivalents (headless formula recalculation, Playwright rendering/console/network assertions). Live GitHub Pages verification is a deferred human step and is not an unattended gate; phase closure is not claimed on local evidence alone.
- **Git policy:** work is committed locally on the `dev` branch only. The run never pushes to any remote, so no auto-deploy to `master` occurs.
- **Fixtures:** the agent never expands fixture scope unattended; an unrepresentative fixture profile is recorded as a documented limitation and the run continues.
- **Failure handling:** when a feature fails its automated acceptance, the agent records the failure, skips that feature, and continues with the rest of the tranche; it does not silently pass an unmet gate.
- **Boundaries preserved:** all privacy, no-upload, no-persistence, metric, identity-isolation and same-origin boundaries remain hard constraints and are never relaxed to pass a gate.

## Phase 1A Scope

Phase 1A includes the following selected capabilities:

| Capability | Specification |
| --- | --- |
| Select and highlight IFC elements | [Element selection](../feature/element-selection.md) |
| Inspect IFC element properties | [Element properties](../feature/element-properties.md) |
| Search elements across loaded models | [Model search](../feature/model-search.md) |
| Filter elements with structured criteria | [Model filtering](../feature/model-filtering.md) |
| Browse spatial/model hierarchy and manage element visibility | [Model hierarchy](../feature/model-hierarchy.md) |
| Measure geometry | [Model measurement](../feature/model-measurement.md) |
| Clip the 3D scene | [3D section and clipping](../feature/section-clipping.md) |
| Add standard camera controls to existing navigation | [3D navigation](../feature/viewer-navigation.md) |
| Navigate in first person | [First-person walkthrough](../feature/first-person-walkthrough.md) |
| Show position and heading in first person | [First-person minimap](../feature/first-person-minimap.md) |
| Change per-model wireframe/opacity display | [Display controls](../feature/display-controls.md) |
| Apply ordered color rules over IFC properties | [Rule-based property coloring](../feature/property-coloring.md) |
| Save temporary camera viewpoints | [Temporary viewpoints](../feature/viewer-viewpoints.md) |

The approved Phase 1A baseline uses conservative behavior: selection is single-select; Search uses case-insensitive text matching; Filter uses AND across criteria and OR within a criterion without changing visibility; hierarchy isolation composes as a reversible element-visibility mask below model-level visibility and Show all unhides all hierarchy-hidden elements across all models; property inspection includes occurrence- and type-level IFC property and quantity sets plus materials and classifications, but not calculated or aggregated takeoff; measurements use metric conversion; clipping starts with one adjustable plane with cap faces and separate pick geometry; walkthrough does not guarantee collision detection; the minimap uses an independent, display-only footprint of the camera's containing storey; Home fits currently visible models; viewpoints are camera-only and session-local; and coloring uses ordered AND rules with first-match precedence, below selection highlighting. Plan and plan-section drawings are assigned to Phase 1B and are not Phase 1A exit gates.

The [research report](../research/phase-1-viewer-market-research.md) records the That Open projection implementation, integration constraints, and criteria for the Phase 1B drawing feasibility decision. The approved behavior baseline is recorded above; implementation details and fixture coverage still require the evidence in the delivery gates.

## Phase 1B Assigned Features

The following selected features are assigned to the later Phase 1B tranche. Assignments do not authorize implementation before the applicable scope and feasibility gates are complete:

- [2D architectural plan view](../feature/plan-view.md)
- [Plan section lines and views](../feature/plan-section-views.md)
- [Large-model loading and interaction performance benchmark](../feature/large-model-performance.md): record a committed baseline on existing fixtures and add a regression guard. Optimization is out of scope for this tranche.

The pre-run drawing go/no-go is recorded in the [research recommendation](../research/phase-1-viewer-market-research.md#phase-1b-drawing-gono-go-recommendation-pre-run): implement plan/section linework from the app's existing in-app triangle geometry rather than adopting That Open / Fragments, which stays a reference and a pre-approved fallback dependency. The `1B_02` gate validates this prototype against the committed fixtures; a failure is a non-blocking no-go per the [Unattended Execution Policy](#unattended-execution-policy). Failure to qualify these drawings does not block Phase 1A or Phase 1C. Other candidates marked Defer in the research report are not assigned to Phase 1B by this plan unless listed above.

Phase 1A and Phase 1B are tranches of Phase 1 and do not establish separate major versions or release authorization. No package version change or release is implied by planning or completing a tranche.

## Phase 1C Assigned Features (Cost Estimation and Quantity Takeoff)

Research: [Phase 1C cost estimation market research](../research/phase-1c-cost-estimation-market-research.md). Approved scope:

- [Quantity takeoff](../feature/quantity-takeoff.md)
- [Cost breakdown structure and element mapping](../feature/cost-breakdown-mapping.md), including location breakdown
- [Unit rates, assemblies and cost calculation](../feature/unit-rates-costing.md)
- [Estimate Excel export](../feature/estimate-excel-export.md) with cell formulas
- [Estimate data files](../feature/estimate-data-files.md) (user-supplied import/export of CBS, rules, rates)

Approved boundary changes: takeoff and user-initiated local file export are allowed; the app still has no backend or upload, and estimate data is never persisted by the app. Variance between model versions is not assigned. An open-source client-side XLSX library is approved in principle, subject to licence review before any dependency is added.

## Exclusions

- Cloud collaboration, authentication, model upload, shared projects, and server-side processing.
- Application-managed persistence of models, model-derived data, viewpoints, rules, drawings, estimates, or caches. Phase 1C estimate data is persisted only through explicit user file export.
- IFC authoring/editing, clash detection, model comparison, and model-data export. Quantity takeoff, cost estimation, unit rates, and user-initiated estimate file/Excel export are assigned to Phase 1C only; Phases 1A and 1B do not include them. Variance between model versions is not assigned.
- Local model markups/annotations, multi-select, collision-aware walking, route planning, and advanced saved drawing annotations unless separately prioritized.
- Guarantees of complete IFC schema, geometry, material, or architectural drawing fidelity beyond tested fixtures.
- IFC schema expansion and non-IFC formats; the current IFC schema coverage remains unchanged. Browser targets beyond the current desktop Chrome baseline for this tranche; broader browser/mobile support was not selected.

All Phase 0 boundaries remain in force: local IFC processing in the browser, same-origin runtime assets, no backend or telemetry, model-derived data in memory only, and Web Storage for small settings only. New work must follow [the modular feature architecture](../architecture.md).

## Delivery Sequence and Gates

| Step | Deliverable | Required evidence and exit criteria |
| --- | --- | --- |
| 1A_01. Contracts, fixtures and layout | Adopt [cross-cutting contracts](../feature/cross-cutting-contracts.md): shared predicate contract, input arbitration, panel layout (1280x720 minimum), coordinate/view conventions, and the synthetic fixture set. | Authored fixtures are committed with provenance notes in [test-fixtures.md](../test-fixtures.md); layout design and numeric defaults are reviewed; contract tests for predicate matching and Z-up to Y-up conversion pass. |
| 1A_02. Semantic and selection foundation | Model-scoped element picking, selected-state/highlight lifecycle, property and quantity-set queries, and supported spatial hierarchy. | Adapter/contract tests prove `(modelId, expressId)` isolation; representative property/quantity-set and hierarchy fixtures cover unset, missing, and duplicate identity cases; feature tests cover selection, cleanup, and model removal. |
| 1A_03. Search and filtering | Separate Search and Filter features over adapter-provided IFC metadata. | Tests prove text fields, model-scoped results, AND/OR filter semantics, stale-query cancellation, bounded results, bulk unhide behavior, and no implicit visibility changes. |
| 1A_04. 3D inspection tools | Navigation additions, distance measurement, and one-plane 3D clipping. | Unit/contract tests verify camera bounds/finite values, known measurement values/units, clipping orientation/reset, cap faces, separate pick geometry, and resource cleanup. Chrome tests verify actual geometry interaction and overlays. |
| 1A_05. First-person navigation and minimap | First-person movement, plus its independent lightweight footprint minimap. | Browser tests cover enter/exit, keyboard focus, pointer-lock lifecycle if used, mode cleanup, camera pose, containing-storey minimap position/heading, unavailable source geometry, and responsive overlay layout. The minimap must not require the deferred plan-view feature. |
| 1A_06. Display and property coloring | Per-model wireframe/opacity controls and rule-driven property colors. | Adapter tests cover reversible appearance ownership and shared material cleanup; rule tests cover typed values, missing data, multi-condition matches, order/precedence, reset, transparent picking, and selection highlight. Browser tests verify selection highlight wins while a rule color is active. |
| 1A_07. Temporary viewpoints | Session-local camera-only viewpoint capture and restoration. | Tests cover duplicate labels, capture/restore, invalid or removed model targets, independence from visibility/selection, and no persistence after reload. |
| 1A_08. Integrated acceptance | Run all 13 active Phase 1A features together against synthetic and appropriately licensed representative IFC fixtures. | Chrome Playwright workflows verify visible rendering, cross-feature interactions, resource cleanup, resize/layout, composed visibility, no model upload, no external runtime requests, and no model-derived persistence. Record limitations and skipped fixtures explicitly. |

Every step starts from its feature specification, adds focused unit/contract tests, and includes relevant browser verification before advancing. Shared contracts require impact review across consumers. Do not mark a feature complete from a successful build or DOM-only assertion; verify actual rendering where geometry or camera behavior changes.

### 1A_02 implementation evidence

The semantic foundation is implemented locally in commits `21aa7bd` and `6ab54fd`. The IFC adapter now exposes model-scoped metadata, occurrence/type property sets, source quantity sets, and a bounded spatial hierarchy; rendered meshes retain their express IDs for adapter-owned picking. Shared selection state, highlight cleanup, property inspection, and hierarchy browsing are wired into the application. Validation completed: 53 unit tests, typecheck, production build, and the focused Chrome workflows for model loading, settings, layout, and context-loss recovery. Full hierarchy visibility actions and the remaining cross-feature acceptance coverage remain to be completed before the gate is closed.

## Phase 1B Delivery Sequence and Gates

Phase 1B begins after Phase 1A's delivery gates are complete. Its assigned workstreams have independent gates: drawing implementation is conditional on feasibility approval, and the performance workstream records a baseline and a regression guard only, with no optimization in this tranche.

| Step | Deliverable | Required evidence and exit criteria |
| --- | --- | --- |
| 1B_01. Performance baseline and regression guard | Inventory existing fixtures, define a repeatable desktop Chrome benchmark for load-to-ready and representative interaction responsiveness, record a committed baseline, and add a regression guard. | Use the authored synthetic box and any available local user-supplied Duplex fixtures described in [test-fixtures.md](../test-fixtures.md); do not add or publish fixture files. Record fixture availability, size, provenance, supported model structure, browser/device conditions, repetitions, and baseline results. Measure from load start to complete plus first usable rendered frame, and from documented user action to rendered response. Commit the baseline and a regression guard that flags metrics worse than baseline beyond a documented tolerance; the guard does not require optimization and baselines are refreshed only by explicit review. Missing local-only fixtures are recorded as skips. Do not change the loading/viewing path to improve a metric; optimization is out of scope for this tranche. |
| 1B_02. Drawing feasibility and requirements approval | Evaluate plan-view and linked-section feasibility using the existing fixture set and the constraints in their feature specifications. | Demonstrate or explicitly fail to demonstrate adequate storey/geometry coverage; assess the IFC geometry/identity bridge, candidate libraries and licenses, same-origin worker/WASM assets, Three.js compatibility, bundle/runtime impact, linework fidelity, and marker-to-view linkage. Apply the approved defaults: visible edges only, openings represented by gaps where supported, section depth 10 m on each side of the marker, vertical extent equal to full model/storey bounds, and linked plan/section selection state. Follow the pre-run go/no-go in the research doc and the [Unattended Execution Policy](#unattended-execution-policy): implement plan/section linework from the existing in-app triangle geometry; a drawing dependency is only a pre-approved fallback. If feasibility fails automated acceptance, record a non-blocking no-go, skip drawings, and continue to 1C. Record the gap if fixtures lack storey/geometry coverage; do not expand fixtures unattended. |
| 1B_03. Plan-view implementation | Implement IFC-derived 2D plan view only after a positive feasibility decision and approved requirements. | Focused adapter/contract/unit tests cover model/storey identity, cut height, visibility, hierarchy hides, invalidation, unsupported geometry, and cleanup. Chrome tests verify rendered linework is a real 2D drawing, not a top-down 3D view, and preserves authored placement and unrelated 3D state. |
| 1B_04. Linked plan-section implementation | Implement section markers and linked orthographic views only after plan-view acceptance and separate approval of section-specific feasibility. | Tests verify marker direction/range, generated output, marker-to-view navigation, multiple markers, model removal/invalidation, unsupported geometry feedback, and cleanup. Chrome tests inspect rendered section geometry and return navigation. |
| 1B_05. Performance regression verification | Confirm the committed baseline and regression guard hold after the 1B drawing work; do not optimize. | Re-run the benchmark on the same fixtures, browser conditions, and protocol. Confirm no metric regressed beyond tolerance against the committed baseline without changing the loading/viewing path, and that Phase 1A correctness, visible rendering, model-scoped identity, privacy boundaries, and resource cleanup are intact. Report any regression and unsupported/absent fixtures explicitly; a regression is recorded for a future optimization tranche, not fixed here. |
| 1B_06. Integrated Phase 1B acceptance | Verify the approved Phase 1B scope and its interactions with Phase 1A. | Chrome workflows verify plan/section transitions, multi-model visibility and removal, resize/layout, performance results, resource cleanup, no model upload or external runtime requests, and no model-derived persistence. Record all fixture provenance, checks, limitations, and skips. If feasibility is rejected, record the no-go and revised authorized scope; do not claim the drawing feature complete. |

Do not treat an uncommitted baseline, infeasible drawing prototype, absent fixture, or successful build alone as a passing gate. Preserve the current IFC schema coverage, desktop Chrome target, local-only processing, and no-persistence boundaries.

## Phase 1C Delivery Sequence and Gates

Phase 1A, 1B and 1C are executed in that order. Phase 1C begins after Phase 1A and Phase 1B gates are complete; it relies on 1A selection, properties, filtering and hierarchy, and takeoff aggregation is observed by the 1B performance regression guard. It does not use the drawing features.

| Step | Deliverable | Required evidence and exit criteria |
| --- | --- | --- |
| 1C_01. Evidence and design approval | Verify the items marked unverified in the research (IFC quantity-set coverage on fixtures, XLSX library licence/formula support/bundle size); fix the estimate file format and rounding rules. | Record findings; user approves the library dependency and file format before implementation. |
| 1C_02. Quantity takeoff | Implement [Quantity takeoff](../feature/quantity-takeoff.md). | Unit tests for grouping, units, missing data, identity; Chrome table and selection checks; geometry-derived fallback is off by default; Duplex checks skipped if the fixture is absent. |
| 1C_03. CBS and mapping | Implement [CBS and mapping](../feature/cost-breakdown-mapping.md). | Rule precedence, manual override, mapped/unmapped many-to-many reporting, aggregate handling and model-removal tests; Chrome checks. |
| 1C_04. Rates, assemblies, costing | Implement [Unit rates and costing](../feature/unit-rates-costing.md). | Calculation, rounding, mismatch, missing-input, lump-sum and allowance tests; Chrome checks. |
| 1C_05. Estimate data files | Implement [Estimate data files](../feature/estimate-data-files.md). | JSON and CSV round-trip and invalid-file tests; no network or storage writes. |
| 1C_06. Excel export | Implement [Estimate Excel export](../feature/estimate-excel-export.md). | Formula recalculation equals app totals using a headless spreadsheet engine; opens in two readers; no network requests. |
| 1C_07. Integrated Phase 1C acceptance | End-to-end estimate workflow. | Chrome workflow from takeoff to export on available fixtures; documentation, Readme and architecture updated to the approved boundaries; fixtures, checks, limits and skips recorded. |

Do not treat an unmapped, mismatched or missing-quantity result as zero cost, or a successful build alone as a passing gate. Totals are estimates from source-provided IFC quantities; no accuracy guarantee is made.

## Acceptance Criteria

- All 13 active Phase 1A capabilities pass the acceptance criteria in their specifications and the integrated workflows above.
- Equal IFC express IDs and duplicate filenames remain isolated by model identity throughout selection, properties, search, filtering, hierarchy, display rules, and removal.
- Plan and plan-section drawings are assigned to Phase 1B, subject to their separate technology/fixture feasibility assessment and go/no-go review; they do not block Phase 1A completion.
- Model visibility and hierarchy isolation compose without Filter changing visibility; model-level hidden state cannot be overridden by element isolation or restoration.
- When a selected element matches a property-color rule, selection highlighting remains the top visual priority and the rule color returns when selection clears.
- Feature disposal, model removal, and failure paths release owned listeners, subscriptions, temporary linework, overlays, and GPU resources without invalidating resources shared by other models.
- No IFC contents, model-derived properties, coordinates, rules, viewpoints, or generated drawings are sent to a server or persisted. Existing settings-only storage behavior is unchanged.
- Tests, browser target, fixture provenance, commands, results, and unsupported cases are recorded. No broad IFC compatibility, memory ceiling, or drawing fidelity claim is made without corresponding evidence.

## Completion Evidence

### Gate 1A_01 (contracts, fixtures, layout)

- Shared predicate contract ([src/core/predicate.ts](../../src/core/predicate.ts)) and metric normalization ([src/core/units.ts](../../src/core/units.ts)) added as pure core modules; both respected by the architecture-boundary test.
- Coordinate convention verified empirically: `web-ifc` emits Y-up geometry (an authored Z-extruded solid measures its height on scene Y), so the IFC adapter needs no added rotation. Contract wording in [cross-cutting-contracts.md](../feature/cross-cutting-contracts.md) corrected to match.
- Eight committed synthetic fixtures under `tests/fixtures/1a/` (duplicate express IDs across two models, multi-storey IFC4, multi-storey IFC2x3 with BaseQuantities and an empty Pset, millimetre and unknown units, malformed spatial relations, aggregate parent/child). Provenance in [test-fixtures.md](../test-fixtures.md). All load through `web-ifc`.
- Dockable layout scaffold: a right-side `feature-dock` region added to the app shell and a hard 1280x720 desktop minimum (no reflow/stacking below it; viewport scrolls). Two former 390px mobile e2e assertions retargeted to the supported 1280x720 minimum.
- Checks (Chrome via Playwright, Node 22.23.4 on Windows): `npm run typecheck` clean; `npm run test` 52 passed (12 files); `npm run build` succeeded with the known pre-existing bundle-size warning; `npm run test:e2e` 7 passed, 4 Duplex skipped (local-only fixtures absent). Committed on `dev`; not pushed. Live-site verification deferred per the Unattended Execution Policy.

Phase 1A remains planned until each step's evidence is recorded. Record the source commit, focused/unit/build/browser test outcomes, tested browser, fixture schema and provenance, manual rendering checks, privacy/storage observations, performance/resource limits, failures/skips, and known limitations. Do not change the package version, publish, or mark Phase 1 complete without separate release authorization and its required gates.

Phase 1B completion additionally requires the committed performance baseline and a working regression guard (no optimization); drawing feasibility decisions and, for each approved drawing feature, implementation and rendering evidence; integrated Phase 1B browser results; fixture availability/provenance and skips; and known limitations. A no-go decision is evidence for changing scope, not evidence that an unimplemented feature passed.

Phase 1C completion additionally requires the C1 findings and approvals, per-feature unit and browser results, workbook recalculation evidence, privacy checks (no upload, no app persistence), fixture provenance and skips, and known limitations.