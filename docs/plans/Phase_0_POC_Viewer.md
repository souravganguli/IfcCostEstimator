# Phase 0: POC Viewer

Phase: **0**. Major version: **0**. Baseline release: **0.00.00** (npm: `0.0.0`). Further releases within this phase use `0.<minor>.<fix>`, following [versioning.md](../versioning.md). Phase acceptance remains governed by the evidence and open gates below.

Status: **Closed (2026-10-27).** Pages Source is GitHub Actions; the `master` workflow (Ubuntu/Chrome) passes and deploys the built app. Workflow run [40483356308](https://github.com/souravganguli/IfcCostEstimator/actions/runs/40483356308) (commit `f304edf`) passed, and a manual Chrome session at the project URL loaded `tests/fixtures/box.ifc`, rendered it, and listed it in the model list; its only console error was a `/favicon.ico` 404, since fixed by adding a favicon. The three Duplex IFC2x3 models are local-only fixtures by policy ([test-fixtures.md](../test-fixtures.md)); they are verified locally and are accepted as not checked on the live site. The default branch is `master` and will not be renamed.

## Goal

Prove that users can open multiple local IFC files, view them together, and manage them entirely in a web browser hosted on GitHub Pages. Reliable viewing is the priority; additional features are secondary.

This is a delivery plan, not a statement that these capabilities are already implemented. The overall product direction and architectural boundaries are defined in [Readme.md](../../Readme.md).

## Implementation Progress

| Gate | Evidence and Remaining Work |
| --- | --- |
| Development setup | Locally verified: locked installation, strict TypeScript build, unit tests, and Chrome smoke tests against development and production-preview servers under `/IfcCostEstimator/`. The Ubuntu/Chrome default-branch deployment workflow is implemented; its hosted run remains pending. |
| IFC qualification | Synthetic IFC4 tests verify extrusion geometry, authored eight-metre relative placement, copied geometry, and parser cleanup. Additional tests cover partial-load allocation failure and initialization retry. All three supplied IFC2x3 models pass production-preview checks in Chrome. This is bounded representative-model evidence, not comprehensive schema or real-model alignment accuracy certification. Live hosting compatibility remains to be verified after deployment. |
| Viewing features | Additive/repeated-name loading, navigation, visibility/removal/reopening, collapse, invalid-file recovery, context-loss teardown, and reload recovery pass production-browser checks. Isolated camera tests verify exact combined/visible bounds and finite clipping planes. Bounded timings and JS-heap measurements for the supplied three-model workload are recorded in the development guide; no universal file-size or process/GPU-memory ceiling is claimed. |
| Settings | Grid visibility is specified and implemented with namespaced Web Storage, validation, and in-memory fallback. Unit/browser tests cover corruption, denied storage, unrelated-key preservation, and reload without model restoration; unit tests also cover quota failures. |
| Feature isolation | Implemented: five feature modules with public mount/dispose APIs and scoped styles; engine-independent session summaries/commands; separate adapters and application composition. Isolated feature/lifecycle tests and compiler-API import checks verify dependency direction, public entrypoints, and absence of cycles. |
| Default-branch deployment | The tested root build is deployed by GitHub Actions only from `master`. Hosted workflow passed and the live viewer was verified in Chrome with `box.ifc` (see Status). The Duplex models are local-only and are not required on the live site. No other branch is tested in cloud CI or published. |

## Feature Scope

Each feature has its own specification in the `docs/feature/` folder. Feature-specific requirements and acceptance criteria are maintained there; this plan defines POC scope and integration gates.

| Feature | Specification |
| --- | --- |
| Open multiple local IFC files in a shared scene | [IFC loading](../feature/ifc-loading.md) |
| Orbit, pan, zoom, and fit visible models | [3D navigation](../feature/viewer-navigation.md) |
| List, hide, show, and remove models | [Model controls](../feature/model-controls.md) |
| Present loading states and recoverable errors | [Loading and error feedback](../feature/loading-and-errors.md) |
| Retain small viewer preferences, not models | [Viewer settings](../feature/viewer-settings.md) |

The sole Phase 0 browser target is current desktop Chrome, subject to the selected engine's graphics and WebAssembly requirements. Other browsers and mobile are not POC acceptance targets.

Models will be displayed in their authored coordinates. The POC will not align unrelated models or correct coordinate systems. Internal precision adjustments must preserve relative model placement.

## Outside the POC

- Cost estimation, unit rates, pricing integrations, quantity extraction, and CSV export.
- Element selection, property inspection, clipping, and measurement tools.
- IFC editing, manual model alignment, coordinate editing, and georeferencing correction.
- Authentication, collaboration, cloud synchronization, and shared projects.
- Saved-model restoration, persistent model caches, offline reload, service workers, and PWA support.

These exclusions keep the POC focused. They are not commitments for later releases. Additional features require separate prioritization; any proposal conflicting with the overall architectural boundaries requires an explicit decision to revisit those boundaries.

## Implementation Constraints

The POC must follow the architecture in [Readme.md](../../Readme.md): TypeScript and Vite, a framework-free UI, a maintained IFC engine behind an adapter, an independent model registry, a rendering controller, and a settings store.

- Follow the [modular feature architecture](../architecture.md): feature-owned behavior, UI, local state, and styles behind public interfaces, with explicit shared-service contracts and a thin composition point. Ordinary feature changes must not routinely modify unrelated implementation files.
- Run all IFC processing and rendering in the browser, with no backend or model uploads.
- Serve every runtime asset from the application's GitHub Pages origin, without third-party CDNs, external APIs, or telemetry.
- Keep models and derived data in memory only. Persist settings in namespaced, versioned `localStorage` entries; `sessionStorage` is allowed for tab-scoped settings if needed.
- Fall back to in-memory defaults when storage is denied, corrupt, incompatible, or full. Reloading requires reopening IFC files.
- Do not add IndexedDB, OPFS, filesystem-backed persistence, or application-managed Cache Storage. Ordinary browser HTTP caching of static assets is separate from application data storage.
- Assign independent session-local model identities, including when filenames are identical. Do not treat filenames or element IDs as globally unique model identities.
- Serialize file loading initially to avoid unnecessary concurrent parsing memory peaks. Workers may be used if supported by the deployment environment.
- Release owned engine state, geometry, materials, temporary buffers, and object URLs on removal or failed loading without invalidating resources shared by other models.
- Respect the GitHub Pages project base path for JavaScript, WASM, workers, and other assets. Do not require application-controlled cross-origin-isolation headers or assume `SharedArrayBuffer`-dependent multithreading is available.

## Delivery Milestones

Development setup is the first delivery gate. No engine qualification or feature implementation is complete without the tests specified for that step. The initial application shell does not need to parse IFC files before engine qualification.

| Step | Deliverable | Required Tests and Exit Criteria |
| --- | --- | --- |
| 1. Development setup | Establish the TypeScript/Vite application shell, local development server, production build/preview, type checking, Vitest unit tests, and Playwright browser tests. Create and review the root [AGENTS.md](../../AGENTS.md) as part of setup. | From a clean checkout, install locked dependencies, pass type checking, build the shell, run at least one meaningful unit test, and pass browser smoke tests against both development and production-preview servers. Verify a nonblank shell, no application startup errors, successful static asset loading, and a GitHub Pages-style project base path. Check agent instructions and documentation links for consistency. |
| 2. IFC engine qualification | Select a maintained engine and compatible rendering/WASM/worker versions; integrate it behind the adapter with same-origin assets. | Add adapter integration tests using representative IFC fixtures. Verify parsing, multi-model identity isolation, malformed-file rejection, cleanup, and WASM/worker loading under the project base path without special cross-origin-isolation headers. Live hosting claims require a deployed smoke test before Phase 0 closure. |
| 3. Viewing features | Deliver IFC loading, navigation, model controls, loading/error feedback, and resource lifecycle according to their feature specifications. | Every feature increment adds or updates focused unit/integration tests and relevant Playwright acceptance tests before it is considered complete. Cover duplicate filenames, additive loading, visible-model camera fitting, hide/show/remove/reopen, resource ownership, empty states, and recovery after invalid files. Verify nonblank model rendering and controls visually in target browsers, not only DOM status. |
| 4. Settings persistence | Specify the preference schema and defaults in the settings feature, then implement namespaced, versioned Web Storage with in-memory fallback. | Unit-test value validation, version compatibility, denied storage, and quota failures. Browser-test preference restoration after reload, absence of model restoration, unchanged unrelated storage keys, and continued viewing with storage unavailable. |
| 5. Default-branch deployment and Phase 0 closure | Push verified Phase 0 changes to the configured default branch (`master`; not renamed); GitHub Actions runs cloud checks and deploys the tested build. | Record the commit and passing workflow. Verify the live project URL in Chrome, including asset/WASM loading, visible model rendering, controls, recovery, and network/privacy behavior. |

### Local Viewing and Test Commands

The following command contract is implemented and locally verified. See [development.md](../development.md) for browser prerequisites and production-preview test selection.

| Command | Intended Use |
| --- | --- |
| `npm ci` | Install dependencies reproducibly from the committed lockfile after setup has established it. |
| `npm run dev` | Start the local Vite server; open the printed localhost URL in a target browser. |
| `npm run build` | Produce the static production build. |
| `npm run preview` | Serve the production build locally for verification. |
| `npm run typecheck` | Check TypeScript without emitting application files. |
| `npm run test` | Run unit and integration tests once, with a failing exit code for failed tests. |
| `npm run test:e2e` | Run Playwright tests with documented development/preview server selection and lifecycle handling. |

Document the supported Node.js/npm versions, browser-test installation prerequisites, verified commands, and local URLs when setup is complete. Serve the application over localhost HTTP rather than opening HTML through `file://`; the development/preview server only serves application assets and does not receive selected IFC files for processing.

### Tests at Every Step

- For each feature increment, establish or verify the owning module boundary, declared dependencies, public interface, and cleanup. Add isolated feature/contract tests and relevant integration checks; review imports and change locality as well as runtime results.
- Start each implementation increment from its feature specification and identify the focused test that will verify the intended behavior. Add a regression test for bug fixes where practical.
- Run focused tests immediately after meaningful changes, repair local failures, and rerun before proceeding. Passing a build alone does not establish feature correctness.
- Use synthetic or explicitly shareable IFC fixtures for automation. Include valid, invalid, multiple-model, and repeated-filename cases; document fixture schemas, sizes, and provenance. Do not commit private project models or upload their contents in test artifacts or diagnostics.
- Test rendering through browser interaction and visual/canvas checks as well as application state; a successful load message alone does not prove a model is visible.
- Verify local production assets under `/IfcCostEstimator/`. Phase 0 closure requires the master workflow to pass and the deployed project URL to be smoke-tested in Chrome; local preview alone is not live hosting evidence.
- Documentation-only steps must validate local links, feature-spec structure, and consistency with the architecture; they do not require unrelated application tests.
- Record commands, results, tested environment, and any manual checks for every step. Failed, skipped, or blocked required checks leave that gate incomplete; do not mark it complete on assumptions.

Engine versions, tested IFC schemas, practical model-size limits, setup commands, and a deployment URL will be documented when verified. No arbitrary model-size or comprehensive IFC schema support guarantee is implied.

## Acceptance Criteria

- Feature modules follow the ownership, dependency, cleanup, and change-locality criteria in [architecture.md](../architecture.md). New feature integration is localized to its module and composition point; shared-contract exceptions are documented and regression-tested.
- The development-setup gate passes first: a clean checkout can run the local viewer shell, production preview, type checking, unit tests, and browser smoke tests using documented commands, with reviewed root agent instructions.
- Every delivery step has passing test evidence for its exit criteria; no required test is deferred solely to the final deployment step.
- All five in-scope feature specifications pass their acceptance criteria together in Chrome, including combined multi-model workflows and failure recovery.
- Verified work has reached `master`, its Ubuntu/Chrome cloud workflow passes, and the deployed application is verified at the project URL.
- Network inspection during local model loading shows no IFC-content or model-derived-data transmission, external API calls, or telemetry.
- Representative IFC schema fixtures and file sizes are tested before support claims are published. Unsupported graphics capabilities and recoverable loading/resource failures receive clear feedback.

### Deployed Phase 0 Acceptance

The default-branch workflow deploys the project root after passing CI. Verify the deployed project's JavaScript/WASM asset resolution, Chrome workflows, privacy, and recovery without special response-header assumptions. Record the deployed URL and commit; this is required evidence for Phase 0 closure.

## Completion Evidence

### Local Run: 2026-10-27

- Environment: Windows; Node 22.23.4; npm 10.9.9; Chrome 156.0.8078.48.
- `npm ci`: passed with the committed lockfile; npm reported zero known vulnerabilities.
- `npm run test`: 20 passing tests across four unit/integration test files, including real parser geometry extraction and failure cleanup.
- `npm run build`: passed strict TypeScript checking and production bundling. Vite reports a large-bundle warning; this is documented rather than suppressed.
- `npm run test:e2e`: 10 passing development-server browser tests in Chrome.
- `TEST_SERVER=preview npm run test:e2e`: 10 passing production-preview browser tests in Chrome after the final build. In PowerShell, set the environment variable as shown in the development guide.
- Visual evidence: desktop and narrow-screen screenshots inspected; canvas-pixel comparisons verify nonblank model rendering and camera movement. All tested runtime requests remained same-origin with no model upload; only the approved grid preference was persisted.
- Documentation link and whitespace checks passed. Live GitHub Pages execution, broader IFC fixtures, and measured memory/performance limits remain unverified. No remote publication was performed.

### Phase 0 Closure Follow-Up: 2026-10-27

- Replaced the monolithic UI entrypoint with five independently owned features and a composition root. Their public contracts and teardown obligations are recorded in each feature specification.
- Added controlled resource-failure, late-load disposal, subscriber cleanup, exact camera-bounds, graphics-context-loss, and architecture-import regression checks.
- Final local suite: 33 passing unit/contract/integration tests across eight files, strict TypeScript and production build passing, and 14 passing development-server browser checks in Chrome. The build's existing large-bundle warning remains documented.
- Production-preview runs passed 14 synthetic lifecycle/UI tests and eight supplied-model tests in Chrome, with one worker for the supplied models. No supplied fixtures were skipped in that run.
- The three supplied files total approximately 21.85 MB. Combined load was 2,409 ms in Chrome. JS heap rose to approximately 50.91 MB and returned to approximately 13.79 MB after removal and forced collection. The longest observed main-thread task was 647 ms. See [development.md](../development.md) for measurement definitions and limitations.
- These observations establish a tested workload, not maximum memory/file-size support, complete IFC semantics, or ground-truth alignment of the supplied models. Broader claims remain explicitly unsupported rather than being inferred from a visible rendering.
- Local unit/build checks and prior commit evidence are recorded. The current remaining delivery evidence is a successful default-branch workflow and a live GitHub Pages Chrome smoke test, including file loading, visibility/removal, failure recovery, and network/asset checks.

### Previous Shared Review Subpaths Design

- The earlier shared-subpath plan created separate root and `/dev/` sites with branch-aware publication. It has been replaced by the simpler default-branch deployment contract in [release-policy.md](../release-policy.md); `/dev/` is not a Phase 0 deployment target.
- The prior local verification included production-preview runs in Chrome. This historical evidence does not replace the default-branch workflow run or deployed-site check.
- GitHub Actions, repository Pages settings, and the deployed Chrome smoke test remain unverified. No remote configuration or publication has been performed for this update.

Record the verified development setup, Node.js/npm and browser/engine versions, IFC fixture schemas and sizes, deployment URL, per-step test commands and results, acceptance results, and known limitations. Distinguish automated tests, manual checks, and blocked or unverified requirements. Include checks of asset resolution, network activity, settings persistence, and model cleanup. Keep model contents and derived data out of remote diagnostics.

The POC is complete when its acceptance criteria pass, the default-branch workflow successfully deploys the build, the live site is verified in Chrome, and limitations are documented. Phase 1 feature work is a separate planning decision.