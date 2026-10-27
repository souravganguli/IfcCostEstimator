# Development and Verification

## Prerequisites

Use Node.js 22.12 or newer and npm. Local verification used Node 22.23.4 and npm 10.9.9 on Windows. The lockfile pins tested dependencies. Browser tests use desktop Chrome through Playwright's `chrome` channel, launched with software (SwiftShader) WebGL so headless Linux CI runners match local rendering; install Chrome normally if missing (CI uses `npx playwright install --with-deps chrome`). A downloaded Playwright Chromium browser is not required.

## Local Viewing

```powershell
npm ci
npm run dev
```

Open the printed URL, normally `http://127.0.0.1:5173/IfcCostEstimator/`. If that port is occupied, Vite prints another port. Choose **Open IFC** and select local `.ifc` files. Model contents stay in browser memory. Reloading requires reopening files; only grid visibility is persisted.

The [synthetic IFC4 box](../tests/fixtures/box.ifc) can be used without private model data. Fixture provenance and limitations are in [test-fixtures.md](test-fixtures.md).

The viewport supports orbit with a primary-button drag, pan with a secondary-button drag, wheel zoom, and fit to visible models. Individual eye and trash controls toggle visibility and remove models. Local servers serve static application assets only; they do not provide a model-processing backend.

## Feature Development

Follow the [modular feature architecture](architecture.md) for all new work. Start from the feature specification, identify the owning module and public contracts, and keep implementation changes local to that feature. A new feature should normally need only its own module, tests, specification, and one registration change. Existing shared entrypoint code is not a precedent for adding more feature logic there.

Before implementation, record required capabilities, UI contribution, state/resource ownership, and cleanup in the specification. Test feature behavior through its public interface with controlled dependencies, then run relevant cross-feature browser checks. Inspect the diff for unrelated-module edits and imports of private internals. Shared-contract changes require an explicit impact review and regression tests; an ordinary local change does not justify broad refactoring.

The implemented module organization and public contracts are described in the architecture document. Each Phase 0 feature has its own disposable UI module; parser/rendering implementations live in adapters and the shared model session does not expose render objects to features. Tests stay under `tests/` rather than being colocated with application modules. Unit tests use Node for domain/adapter checks and Happy DOM for isolated UI/lifecycle checks; actual rendering is still verified in browsers, not Happy DOM.

## Build and Tests

```powershell
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Unit/integration tests cover the actual parser with synthetic geometry, model identity and lifecycle, serialized failure recovery, settings validation/storage failures, and deployment paths. Browser tests run in Chrome and start/stop their own strict-port development server on port 5174. That port must be free.

All test code, configuration, and artifacts live under `tests/`: unit/integration tests in `tests/unit/`, browser tests in `tests/e2e/`, fixtures in `tests/fixtures/`, and the Vitest/Playwright configurations directly in `tests/`. Authored guides, fixture provenance, feature specifications, and the delivery plan live under `docs/`; only the project README and agent instructions remain at the root. The npm scripts select the test configurations; run them from the repository root.

To run the same browser suite against the built production assets:

```powershell
npm run build
$env:TEST_SERVER = 'preview'
npm run test:e2e
Remove-Item Env:TEST_SERVER
```

Preview tests use port 4174. For interactive production viewing, run `npm run preview` and open its printed URL. Browser tests include multi-model operations, invalid-file recovery, privacy/storage checks, denied storage, graphics failure, and canvas-pixel assertions for actual geometry and camera movement. Screenshots and runner output are written under ignored `tests/results/`, including desktop and narrow-screen views. HTML reports use `tests/reports/`; coverage output, if enabled with the required provider, uses `tests/coverage/`. Prior generated root-level artifacts have been relocated to ignored `tests/artifacts/`.

### Supplied Duplex Models

The three user-supplied IFC2x3 models are saved locally in Git-ignored `tests/fixtures/duplex/`, separately from the project-authored fixture. They are test-only and must not be committed or published. A fresh checkout or CI run without all three files explicitly skips the Duplex checks; skipped checks are not passing real-model evidence. Run their focused suite with one worker to avoid competing large-model parsing workloads:

```powershell
npm run test:e2e -- --grep "Duplex IFC2x3 models" --workers=1
```

On 2026-10-27, all eight supplied-model production-preview checks passed after feature isolation in Chrome: individual loading/rendering, hide/show/removal for architecture, MEP, and electrical, plus combined loading, sidebar collapse, independent visibility/removal, reopening, no model persistence, and no external requests/uploads. Pixel checks operate in memory; these tests disable screenshot, video, and trace artifacts. The full suite runs these checks when the local files are available, alongside the synthetic tests. See [fixture provenance](test-fixtures.md) for the local-only file policy.

## Deployment

Phase 0 uses the [default-branch Pages workflow](../.github/workflows/pages.yml). The workflow runs on pushes to `master` (the default branch, which is not renamed). On Ubuntu it installs Chrome, runs unit tests and a production build, tests the built preview in Chrome, then deploys only `dist/` to `https://souravganguli.github.io/IfcCostEstimator/`. Other branches and pull requests are checked locally; they do not run cloud tests or deploy.

The default base is `/IfcCostEstimator/`. Set `VITE_BASE_PATH` before starting or building only when testing another same-origin deployment path. Do not add root-path-only asset references. See [release-policy.md](release-policy.md) for the one-time GitHub Pages Actions-source setup and post-deployment Chrome smoke test. The workflow's HTTP check is not proof of browser rendering or IFC/WASM loading. Local files must not be uploaded.

The single-threaded engine emits same-origin WASM through Vite; no worker, external CDN, or `SharedArrayBuffer` is used. Static asset requests still reach the hosting origin, but local model contents must not be uploaded.

### Previously recorded local browser verification

- 53 unit/contract/integration tests passed across 10 files; legacy publisher checks passed before the old shared-subpath publisher was removed.
- Historical local Chrome runs passed 14 synthetic checks at the `/dev/` base and 22 at the production root, including all eight local-only Duplex checks with none skipped. `/dev/` is no longer a deployed Phase 0 destination.
- Canvas-pixel assertions verify geometry and navigation; desktop and narrow-screen screenshots were inspected. The original settings key and scoped-subpath settings passed persistence checks. The existing large-bundle warning remains.
- These local browser checks are not live Pages evidence. GitHub Actions execution, deployment settings, and live browser rendering still require verification. No remote content or settings were changed as part of those local checks.

## Validation Limits

The authored metre-unit IFC4 extrusion, translated/repeated-name variants, and three supplied Duplex IFC2x3 files have been exercised locally. The supplied files are approximately 2.38 MB (architecture), 17.87 MB (MEP), and 1.60 MB (electrical), using decimal megabytes. Their focused checks passed against production preview. This is not comprehensive IFC2x3/IFC4/IFC4x3, georeferencing, material, transparency, or large-model validation. Synthetic adapter/framing tests establish authored eight-metre relative placement and exact visible-model bounds; no ground-truth alignment or complete geometry comparison has been established for the supplied real models. Add appropriately licensed representative fixtures before making further support claims.

### Bounded Resource Measurement

One sequential local production-preview run of the three supplied files (approximately 21.85 MB combined), with the grid disabled and the tested browser viewport, produced:

| Browser | Combined Load | Fit Interaction | JS Heap Before | JS Heap Loaded | JS Heap After Removal and Forced GC | Longest Observed Main-Thread Task |
| --- | --- | --- | --- | --- | --- | --- |
| Chrome | 2,409 ms | 160 ms | 13.30 MB | 50.91 MB | 13.79 MB | 647 ms |

Values are decimal megabytes from CDP's `JSHeapUsedSize`, not total process, WASM-heap, or GPU memory. Fit timing includes test-driver overhead; long-task observations include the buffered page workload. Results are one-run observations on the local machine, not a benchmark distribution, production latency guarantee, or maximum supported input size. Numeric-only measurement attachments are kept in ignored test output; no model content, geometry, property data, or model screenshots are attached.

Parsing is serialized on the browser's main thread and can pause interaction, as the measured long tasks demonstrate. The tested workload is the qualification envelope for this run, not a hard size cap; total process/GPU memory and an exhaustion ceiling have not been established. Removing models closes parser state and disposes owned GPU resources, but a WASM heap may retain its high-water capacity. Simulated recoverable allocation failures are tested; deliberately exhausting the browser process is not required or represented as a successful recovery path. Browser-process termination cannot be recovered in-session.

The production build currently warns about bundle size, primarily from the parser and renderer. Local privacy tests found no external runtime requests, model uploads, or persisted model data. A real GitHub Pages deployment smoke test is still outstanding; local preview is not a substitute.