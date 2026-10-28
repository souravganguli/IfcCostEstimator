# IFC Test Fixtures

The [box fixture](../tests/fixtures/box.ifc) was authored for this project: a minimal IFC4 rectangular extrusion, four metres wide, one metre deep, and three metres tall, using metre units. It contains no customer or third-party model data. Tests derive translated variants by changing its local placement.

This fixture verifies a narrow geometry path only. It is not evidence of comprehensive IFC4, IFC2x3, IFC4x3, georeferencing, or large-model compatibility. Additional representative fixtures and measured limits are required before publishing those support claims.

## Phase 1A Synthetic Fixtures

The `tests/fixtures/1a/` folder holds small project-authored IFC fixtures created for Phase 1A gate 1A_01. They contain no customer or third-party data and are safe to commit and publish in tests. Each loads through `web-ifc`:

- `duplicate-ids-a.ifc` and `duplicate-ids-b.ifc`: two IFC4 models that reuse the same express IDs and GlobalIds-by-shape, for model-scoped identity isolation.
- `multistorey-ifc4.ifc`: IFC4 site/building with two storeys, walls contained per storey, a `Pset_WallCommon` property set, and a `Qto_WallBaseQuantities` quantity set.
- `multistorey-ifc2x3.ifc`: IFC2x3 equivalent with a `BaseQuantities` quantity set and an empty property set, for schema-naming coverage.
- `units-millimetre.ifc` and `units-unknown.ifc`: millimetre length units, and no unit declaration, for metric-normalization and unknown-unit handling.
- `malformed-spatial.ifc`: an element outside any spatial containment, for bounded hierarchy fallback.
- `aggregate-parent-child.ifc`: an aggregate parent wall decomposed into a child, for parent/child double-count handling.

These are narrow structural fixtures, not comprehensive IFC validation.

## Benchmark Models

The `tests/fixtures/benchmarkmodels/` folder contains three committed IFC2x3 files used for performance benchmarking and E2E regression testing:

- `Ifc2x3_Duplex_Architecture.ifc` (2.3 MB, 728 meshes, 232 elements)
- `Ifc2x3_Duplex_MEP.ifc` (17.5 MB, 1717 meshes, 926 elements)
- `Ifc2s3_Duplex_Electrical.ifc` (1.6 MB, 258 meshes, 103 elements)

These are committed to the repository and run unconditionally in all CI and local environments. They are the authoritative IFC2X3 test surface for regression detection.

**Performance baseline:** `tests/artifacts/benchmark-baseline.json` records the committed `processModel` baseline timings measured on a representative desktop (Node/vitest, warm runs). The regression guard in `tests/unit/benchmark.test.ts` fails if the median processing time for any fixture exceeds its baseline by more than the documented tolerance multiplier (×2.0). The baseline must be updated intentionally and with review; it is never auto-updated to pass a guard.

**E2E tests:** The Playwright `Duplex IFC2x3 benchmark models` describe block in `tests/e2e/viewer.spec.ts` loads each model in a real Chrome instance and asserts geometry renders, model controls work, and no JS errors or external requests occur. The federation test also measures combined load time, JS heap delta, and long-task count, attaching the result as a JSON artifact.

These files are not served as application assets, uploaded to external services, or included in the production bundle. IFC data remains in browser memory only during the test run.