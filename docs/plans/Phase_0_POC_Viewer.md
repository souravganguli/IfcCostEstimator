# Phase 0: POC Viewer

Phase: **0**. Major version: **0**. Baseline release: **0.00.00** (npm: `0.0.0`). Further releases within this phase use `0.<minor>.<fix>`, following [versioning.md](../versioning.md). Phase acceptance remains governed by the evidence and open gates below.

Status: **Local implementation and checks verified; remote `dev` integration/check evidence must be recorded before development closure. Phase 1A implementation has not started.** Under the [release contract](../release-policy.md), tested work pushed to remote `dev` closes the development gate; live production acceptance is a separate human-owned release gate and no longer blocks development closure. Local commit `9a6368f` and test evidence alone do not prove a remote push or integration-check result.

## Goal

Prove that users can open multiple local IFC files, view them together, and manage them entirely in a web browser hosted on GitHub Pages. Reliable viewing is the priority; additional features are secondary.

This is a delivery plan, not a statement that these capabilities are already implemented. The overall product direction and architectural boundaries are defined in [Readme.md](../../Readme.md).

## Implementation Progress

| Gate | Evidence and Remaining Work |
| --- | --- |
| Development setup | Locally verified: locked installation, strict TypeScript build, unit tests, and Chrome/Edge smoke tests against development and production-preview servers under `/IfcCostEstimator/`. Root agent instructions and local development documentation are present. |
| IFC qualification | Synthetic IFC4 tests verify extrusion geometry, authored eight-metre relative placement, copied geometry, and parser cleanup. Additional tests cover partial-load allocation failure and initialization retry. All three supplied IFC2x3 models pass production-preview checks in Chrome/Edge. This is bounded representative-model evidence, not comprehensive schema or real-model alignment accuracy certification. Live hosting compatibility remains a release verification item, separate from the development gate. |
| Viewing features | Additive/repeated-name loading, navigation, visibility/removal/reopening, collapse, invalid-file recovery, context-loss teardown, and reload recovery pass production-browser checks. Isolated camera tests verify exact combined/visible bounds and finite clipping planes. Bounded timings and JS-heap measurements for the supplied three-model workload are recorded in the development guide; no universal file-size or process/GPU-memory ceiling is claimed. |
| Settings | Grid visibility is specified and implemented with namespaced Web Storage, validation, and in-memory fallback. Unit/browser tests cover corruption, denied storage, unrelated-key preservation, and reload without model restoration; unit tests also cover quota failures. |
| Feature isolation | Implemented: five feature modules with public mount/dispose APIs and scoped styles; engine-independent session summaries/commands; separate adapters and application composition. Isolated feature/lifecycle tests and compiler-API import checks verify dependency direction, public entrypoints, and absence of cycles. |
| Development integration and release | Local production assets are verified under the project subpath. Record tested remote `dev` integration and required passing checks to close Phase 0 for development. Feature/dev review URLs require implementation. Production promotion and live release acceptance remain the human user's responsibility and do not hold the development gate open once its own criteria pass. |

## Feature Scope

Each feature has its own specification in the `docs/feature/` folder. Feature-specific requirements and acceptance criteria are maintained there; this plan defines POC scope and integration gates.

| Feature | Specification |
| --- | --- |
| Open multiple local IFC files in a shared scene | [IFC loading](../feature/ifc-loading.md) |
| Orbit, pan, zoom, and fit visible models | [3D navigation](../feature/viewer-navigation.md) |
| List, hide, show, and remove models | [Model controls](../feature/model-controls.md) |
| Present loading states and recoverable errors | [Loading and error feedback](../feature/loading-and-errors.md) |
| Retain small viewer preferences, not models | [Viewer settings](../feature/viewer-settings.md) |

The initial browser targets are current desktop Chrome and Edge, subject to the selected engine's graphics and WebAssembly requirements. Mobile, Firefox, and Safari are not POC acceptance targets.

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
| 2. IFC engine qualification | Select a maintained engine and compatible rendering/WASM/worker versions; integrate it behind the adapter with same-origin assets. | Add adapter integration tests using representative IFC fixtures. Verify parsing, multi-model identity isolation, malformed-file rejection, cleanup, and WASM/worker loading under the project base path without special cross-origin-isolation headers. Live hosting claims still require a deployed smoke test, but development closure follows the remote-dev contract. |
| 3. Viewing features | Deliver IFC loading, navigation, model controls, loading/error feedback, and resource lifecycle according to their feature specifications. | Every feature increment adds or updates focused unit/integration tests and relevant Playwright acceptance tests before it is considered complete. Cover duplicate filenames, additive loading, visible-model camera fitting, hide/show/remove/reopen, resource ownership, empty states, and recovery after invalid files. Verify nonblank model rendering and controls visually in target browsers, not only DOM status. |
| 4. Settings persistence | Specify the preference schema and defaults in the settings feature, then implement namespaced, versioned Web Storage with in-memory fallback. | Unit-test value validation, version compatibility, denied storage, and quota failures. Browser-test preference restoration after reload, absence of model restoration, unchanged unrelated storage keys, and continued viewing with storage unavailable. |
| 5. Development closure and production handoff | Push/integrate verified work into remote `dev` with required checks passing; hand release evidence to the human user. | Record the dev commit/check results, local preview/browser/resource evidence, and known limits. Separately, after human business approval and promotion, verify the live production URL in Chrome and Edge, network/privacy, asset resolution, removal, and failure recovery. This production release check is not a prerequisite for development closure. |

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
- Verify local production assets under the configured project subpath. Development closure requires verified remote `dev` work and passing checks. Live preview/production URLs must be smoke-tested when deployed; local preview alone must not be presented as live hosting compatibility.
- Documentation-only steps must validate local links, feature-spec structure, and consistency with the architecture; they do not require unrelated application tests.
- Record commands, results, tested environment, and any manual checks for every step. Failed, skipped, or blocked required checks leave that gate incomplete; do not mark it complete on assumptions.

Engine versions, tested IFC schemas, practical model-size limits, setup commands, and a deployment URL will be documented when verified. No arbitrary model-size or comprehensive IFC schema support guarantee is implied.

## Acceptance Criteria

- Feature modules follow the ownership, dependency, cleanup, and change-locality criteria in [architecture.md](../architecture.md). New feature integration is localized to its module and composition point; shared-contract exceptions are documented and regression-tested.
- The development-setup gate passes first: a clean checkout can run the local viewer shell, production preview, type checking, unit tests, and browser smoke tests using documented commands, with reviewed root agent instructions.
- Every delivery step has passing test evidence for its exit criteria; no required test is deferred solely to the final deployment step.
- All five in-scope feature specifications pass their acceptance criteria together in each target browser, including combined multi-model workflows and failure recovery.
- Verified work has reached remote `dev` with all required checks passing and recorded against its commit. Production promotion/business approval is not part of this development acceptance decision.
- Network inspection during local model loading shows no IFC-content or model-derived-data transmission, external API calls, or telemetry.
- Representative IFC schema fixtures and file sizes are tested before support claims are published. Unsupported graphics capabilities and recoverable loading/resource failures receive clear feedback.

### Separate Production Release Acceptance

After explicit business approval, the human user promotes from `dev` to production. Verify the deployed project's JavaScript/WASM/worker asset resolution, target-browser workflows, privacy, and recovery without special response-header assumptions. Record the deployed URL and release commit separately; this does not retroactively imply that an earlier development closure certified live production hosting.

## Completion Evidence

### Local Run: 2026-10-27

- Environment: Windows; Node 22.23.4; npm 10.9.9; Edge 156.0.4314.42; Chrome 156.0.8078.48.
- `npm ci`: passed with the committed lockfile; npm reported zero known vulnerabilities.
- `npm run test`: 20 passing tests across four unit/integration test files, including real parser geometry extraction and failure cleanup.
- `npm run build`: passed strict TypeScript checking and production bundling. Vite reports a large-bundle warning; this is documented rather than suppressed.
- `npm run test:e2e`: 10 passing development-server browser tests across Chrome and Edge.
- `TEST_SERVER=preview npm run test:e2e`: 10 passing production-preview browser tests across Chrome and Edge after the final build. In PowerShell, set the environment variable as shown in the development guide.
- Visual evidence: desktop and narrow-screen screenshots inspected; canvas-pixel comparisons verify nonblank model rendering and camera movement. All tested runtime requests remained same-origin with no model upload; only the approved grid preference was persisted.
- Documentation link and whitespace checks passed. Live GitHub Pages execution, broader IFC fixtures, and measured memory/performance limits remain unverified. No remote publication was performed.

### Phase 0 Closure Follow-Up: 2026-10-27

- Replaced the monolithic UI entrypoint with five independently owned features and a composition root. Their public contracts and teardown obligations are recorded in each feature specification.
- Added controlled resource-failure, late-load disposal, subscriber cleanup, exact camera-bounds, graphics-context-loss, and architecture-import regression checks.
- Final local suite: 33 passing unit/contract/integration tests across eight files, strict TypeScript and production build passing, and 14 passing development-server browser checks in Chrome/Edge. The build's existing large-bundle warning remains documented.
- Production-preview runs passed 14 synthetic lifecycle/UI tests and eight supplied-model tests across Chrome and Edge, with one worker for the supplied models. No supplied fixtures were skipped in that run.
- The three supplied files total approximately 21.85 MB. Combined load was 2,352 ms in Edge and 2,409 ms in Chrome. JS heap rose to approximately 50.6-50.9 MB and returned to approximately 13.8 MB after removal and forced collection. Longest observed main-thread tasks were 698 ms and 647 ms, respectively. See [development.md](../development.md) for measurement definitions and limitations.
- These observations establish a tested workload, not maximum memory/file-size support, complete IFC semantics, or ground-truth alignment of the supplied models. Broader claims remain explicitly unsupported rather than being inferred from a visible rendering.
- Local unit/build checks and final commit evidence are reported with the development-branch handoff. Under the updated release contract, the remaining development evidence is verified remote `dev` integration and passing required checks. A live GitHub Pages smoke test after the user's release remains a separate release action, including target-browser file loading, visibility/removal, failure recovery, and network/asset checks.

### Shared Review Subpaths Follow-Up

- Adopted the [release contract](../release-policy.md): feature branches target `dev`; tested remote `dev` plus passing required checks closes development. Only the human user promotes to production after explicit business approval.
- Added branch-aware validation and trusted shared-site publication for the production root and `/dev/`. Feature branches are tested locally and in CI only, without published URLs. Dev updates preserve the stored approved production build; production publication requires explicit human dispatch and a protected approval environment. Grid preferences are isolated between production and dev.
- Local evidence: 53 unit/contract/integration checks across 10 files, strict types, and production builds passed. Chrome/Edge production-preview runs passed 14 synthetic checks at a nested feature path, 14 at the dev path, and 22 at the production root, including all eight local-only supplied-model checks with no skips. Desktop/narrow screenshots were inspected; the existing bundle-size warning remains.
- Owner setup, bootstrap, real Actions/Pages execution, live browser verification, and exact remote `dev` integration/check evidence remain pending. No new commit, push, production promotion, repository-settings change, or remote publication was performed for this follow-up. This evidence does not close the remote development gate or certify production hosting.

Record the verified development setup, Node.js/npm and browser/engine versions, IFC fixture schemas and sizes, deployment URL, per-step test commands and results, acceptance results, and known limitations. Distinguish automated tests, manual checks, and blocked or unverified requirements. Include checks of asset resolution, network activity, settings persistence, and model cleanup. Keep model contents and derived data out of remote diagnostics.

The POC is complete for development when its development acceptance criteria pass, verified work reaches remote `dev` with required checks passing, and limitations are documented. Production release remains a separate human/business decision. Feature additions are a separate planning decision.