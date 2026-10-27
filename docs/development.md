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

On 2026-10-27, all eight supplied-model production-preview checks passed after feature isolation: individual loading/rendering, hide/show/removal for architecture, MEP, and electrical, plus combined loading, sidebar collapse, independent visibility/removal, reopening, no model persistence, and no external requests/uploads, in both Chrome and Edge. Pixel checks operate in memory; these tests disable screenshot, video, and trace artifacts. The full suite runs these checks when the local files are available, alongside the synthetic tests. See [fixture provenance](test-fixtures.md) for the local-only file policy.

## Deployment

Follow the [development/review/production contract](release-policy.md): feature branches integrate into `dev` and are tested without publishing; `dev` has the stable review URL. Tested work pushed to remote `dev` with required checks passing closes a phase for development. Only the human user promotes from `dev` to production with explicit business approval; deployment success or passing CI does not supply that approval.

The default base is `/IfcCostEstimator/`. Set `VITE_BASE_PATH` before starting or building to use another same-origin deployment path. Browser tests use that same base. Do not add a root-path-only asset reference. For a nested review build:

```powershell
$env:VITE_BASE_PATH = '/IfcCostEstimator/dev/'
$env:TEST_SERVER = 'preview'
try {
	npm run build
	if ($LASTEXITCODE -eq 0) { npm run test:e2e -- --grep-invert 'Duplex IFC2x3 models' }
} finally {
	Remove-Item Env:VITE_BASE_PATH, Env:TEST_SERVER
}
```

The selected layout is production at the project root and development at `/dev/`. The [validation workflow](../.github/workflows/pages.yml) tests feature branches and PRs without publishing privileges or creating branch artifacts. Only successful remote `dev` pushes publish a review build. The [trusted publisher](../.github/workflows/pages-publish.yml) stores that tested application build on `pages-artifacts` and deploys the latest combined site, preserving production. Per-path `_deployment.json` and the Actions run summary identify the reviewed commit. Production publication is manual and approval-protected; automatic dev publication cannot promote source branches or rebuild production.

The [owner setup and bootstrap instructions](release-policy.md#human-owner-setup) are required before these URLs work. In particular, preserve the existing approved production artifact when initializing the store; do not enable an empty production destination for an existing live site. Settings are non-sensitive and isolated by review base path, but same-origin subpages are not security boundaries. GitHub settings, remote runs, and live URLs have not been changed or verified locally.

Live URL verification remains required before advertising preview or production hosting as working, but production business approval and deployment are separate from development phase closure. The single-threaded engine emits a same-origin WASM asset through Vite; no worker, external CDN, or `SharedArrayBuffer` is used. Static asset requests still reach the hosting origin, but local files must not be uploaded.

### Local Subpath Verification

- 53 unit/contract/integration tests passed across 10 files. Publisher-specific checks were rerun after final path guards; strict TypeScript checking passed.
- The stable `/IfcCostEstimator/dev/` base passed 14 synthetic Chrome/Edge checks. The production root passed 22 checks, including all eight local-only Duplex checks with none skipped. Feature branches use the ordinary local project base for CI tests and do not produce Pages URLs or uploadable build artifacts.
- Canvas-pixel assertions verify geometry and navigation; desktop and narrow-screen screenshots were inspected. The original production settings key and scoped dev settings pass persistence checks. The existing large-bundle warning remains.
- These 36 local browser checks are not live Pages evidence. Workflow parsing and mocked GitHub responses verify local contracts; actual Actions triggers, protected-environment permissions, artifact-store pushes, and remote deployment remain unverified. No remote content or settings were changed.

## Validation Limits

The authored metre-unit IFC4 extrusion, translated/repeated-name variants, and three supplied Duplex IFC2x3 files have been exercised locally. The supplied files are approximately 2.38 MB (architecture), 17.87 MB (MEP), and 1.60 MB (electrical), using decimal megabytes. Their focused checks passed against production preview. This is not comprehensive IFC2x3/IFC4/IFC4x3, georeferencing, material, transparency, or large-model validation. Synthetic adapter/framing tests establish authored eight-metre relative placement and exact visible-model bounds; no ground-truth alignment or complete geometry comparison has been established for the supplied real models. Add appropriately licensed representative fixtures before making further support claims.

### Bounded Resource Measurement

One sequential local production-preview run of the three supplied files (approximately 21.85 MB combined), with the grid disabled and the tested browser viewport, produced:

| Browser | Combined Load | Fit Interaction | JS Heap Before | JS Heap Loaded | JS Heap After Removal and Forced GC | Longest Observed Main-Thread Task |
| --- | --- | --- | --- | --- | --- | --- |
| Edge | 2,352 ms | 141 ms | 13.32 MB | 50.64 MB | 13.82 MB | 698 ms |
| Chrome | 2,409 ms | 160 ms | 13.30 MB | 50.91 MB | 13.79 MB | 647 ms |

Values are decimal megabytes from CDP's `JSHeapUsedSize`, not total process, WASM-heap, or GPU memory. Fit timing includes test-driver overhead; long-task observations include the buffered page workload. Results are one-run observations on the local machine, not a benchmark distribution, production latency guarantee, or maximum supported input size. Numeric-only measurement attachments are kept in ignored test output; no model content, geometry, property data, or model screenshots are attached.

Parsing is serialized on the browser's main thread and can pause interaction, as the measured long tasks demonstrate. The tested workload is the qualification envelope for this run, not a hard size cap; total process/GPU memory and an exhaustion ceiling have not been established. Removing models closes parser state and disposes owned GPU resources, but a WASM heap may retain its high-water capacity. Simulated recoverable allocation failures are tested; deliberately exhausting the browser process is not required or represented as a successful recovery path. Browser-process termination cannot be recovered in-session.

The production build currently warns about bundle size, primarily from the parser and renderer. Local privacy tests found no external runtime requests, model uploads, or persisted model data. A real GitHub Pages deployment smoke test is still outstanding; local preview is not a substitute.