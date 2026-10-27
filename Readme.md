# IfcCostEstimator

A browser-only application for opening and viewing construction 3D models.

This document defines the intended scope and architecture, not a claim that the described capabilities have already been delivered.

## Product Direction

The intended experience is to open local IFC models, view them together in a shared 3D scene, and manage them without sending model data to a server. Reliable viewing, clear feedback, and responsible use of browser resources take priority over additional analysis features.

Release-specific scope, delivery steps, browser targets, and acceptance criteria belong in phase plans under `docs/plans/`. The current plan is [Phase 0: POC Viewer](docs/plans/Phase_0_POC_Viewer.md). This README defines the overall product direction and architectural boundaries. Agent workflow is governed separately by [AGENTS.md](AGENTS.md); architectural decisions do not belong there.

## Phases and Versions

Each delivery phase corresponds to a major version: Phase 0 is POC Viewer (`0.00.00` baseline), Phase 1 is MVP (`1.00.00` baseline), and subsequent phases advance the major number. Versions follow **major.minor.fix**. Plan naming, increment rules, and the equivalent npm version format are defined in [docs/versioning.md](docs/versioning.md).

Phase 0 is developed directly on `master`, the default branch (it will not be renamed). Only pushes to `master` run Ubuntu/Chrome cloud checks and deploy the tested build to the GitHub Pages project URL; changes on other branches are checked locally. See [docs/release-policy.md](docs/release-policy.md) for the deployment contract and setup.

## Feature Specifications

Each feature must have its own Markdown file in the `docs/feature/` folder, named with a descriptive kebab-case filename. That file is the source of truth for the feature's specifications and requirements; the delivery plan links to it rather than duplicating those details.

Each specification must state its planned or implemented status, goal, scope and exclusions, numbered requirements, dependencies, and testable acceptance criteria. A feature must have a specification before implementation. Changes to behavior must update the corresponding specification and acceptance criteria.

The viewing features are [IFC loading](docs/feature/ifc-loading.md), [3D navigation](docs/feature/viewer-navigation.md), [model controls](docs/feature/model-controls.md), [loading and error feedback](docs/feature/loading-and-errors.md), and [viewer settings](docs/feature/viewer-settings.md). These specifications inherit the architectural boundaries below; they do not override them.

The selected Phase 1A feature requirements are linked from the [Phase 1 MVP plan](docs/plans/Phase_1_MVP.md). They are planned capabilities, not claims of implementation.

## Local Development

Use Node.js 22.12 or newer; Node 22.23.4 and npm 10.9.9 were verified locally.

```powershell
npm ci
npm run dev
```

Open the printed localhost URL, normally `http://127.0.0.1:5173/IfcCostEstimator/`, and choose **Open IFC**. Multiple files can be opened together. Files are parsed locally, not uploaded. The authored test fixture is available at [tests/fixtures/box.ifc](tests/fixtures/box.ifc).

See [docs/development.md](docs/development.md) for production preview, unit tests, browser tests, deployment configuration, and known validation limits.

## Boundaries

| Area                 | Decision                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Hosting              | Static deployment on GitHub Pages.                                                                                  |
| Processing           | All IFC parsing, model management, and rendering run in the browser.                                                |
| Backend              | No application server, API, database, server-side processing, or backend service.                                   |
| File access          | Users explicitly choose local files through browser file APIs; opening a file is not a network upload.              |
| Runtime dependencies | All JavaScript, CSS, WASM, workers, and other runtime assets are served from the application's GitHub Pages origin. |
| External services    | No runtime third-party CDNs, external APIs, analytics, or telemetry.                                                |
| Model data           | Held in browser memory only; users must reopen files after a reload or new session.                                 |
| Persistence          | Settings only, using Web Storage as described below.                                                                |

Static asset requests will still reach GitHub Pages. The privacy boundary is that IFC contents and model-derived data must not be transmitted, not that the application makes no network requests.

## Target Architecture

The application uses **TypeScript and Vite**, with a framework-free UI. Node.js and npm are development and build tools only; deployed users need only a supported browser.

Development must follow a **modular, feature-isolated architecture**. Each feature owns its behavior, UI, local state, and styling behind a small public interface. Changes to a feature should remain inside that feature's module, its tests, and its specification rather than require edits throughout the application. New features should integrate through a single composition/registration point, not through changes to existing feature implementations.

Shared capabilities must be accessed through explicit contracts, not feature internals or shared mutable globals. Cross-cutting contract changes are an explicit exception requiring impact review and integration tests; feature isolation is not a promise that every change fits in one file. The five Phase 0 UI features are isolated under `src/features/`, with shared contracts/session state under `src/core/`, engine integrations under `src/adapters/`, and composition under `src/app/`. Detailed boundaries and validation rules are defined in [docs/architecture.md](docs/architecture.md); local verification and the open deployment gate are recorded in the phase plan.

The local implementation uses **web-ifc 0.0.78** for parsing and **Three.js** for rendering, isolated behind an engine adapter. Single-threaded WASM is bundled from the installed parser package and loaded from the application origin. No worker or cross-origin-isolation headers are required. Live GitHub Pages compatibility, broader IFC schema coverage, and practical file-size limits remain verification gates in the plan.

These are logical responsibilities, not a requirement for separate packages or a large framework:

| Component            | Responsibility                                                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| UI shell             | Application layout and composition of independently owned feature UI; no feature business logic.                  |
| Model registry       | Session-local model identities, read-only summaries, load state, visibility commands, and asset lifecycle ownership. |
| IFC engine adapter   | Parsing, loading, unloading, and integration with the renderer; isolate library-specific APIs from application code. |
| Rendering controller | Shared scene, camera controls, model visibility, fit-to-view behavior, and rendering resource cleanup.               |
| Settings store       | Read and validate small versioned preferences, with in-memory defaults when persistence is unavailable.              |

### Data Flow

1. The user selects local IFC files through the browser File API.
2. The application reads each file into transient memory and passes it to the IFC engine.
3. Successfully loaded models are registered and rendered together in the shared scene.
4. Model controls address individual registry entries, not filenames or a fixed engine model ID.
5. Removing a model releases its engine resources and rendering resources without affecting other models.

Parsing and rendering must respect browser memory and GPU limits. Workers may improve responsiveness, provided they work within the hosting constraints. Rendering must preserve authored relative model placement, including when internal precision adjustments are needed.

Each loaded model must have its own session-local identity, even when filenames are identical. Engine handles remain associated with that identity. Any future element-level features must identify elements within their owning model rather than treating element IDs as globally unique.

The registry, adapter, and rendering controller must have explicit cleanup ownership. Removal and failed loads must release owned geometry, materials, temporary buffers, and engine state; object URLs must be revoked when no longer needed. Shared resources must remain available to models still in use.

### Settings and Storage

- Use `localStorage` for small, versioned viewer preferences. `sessionStorage` is permitted for tab-scoped settings if needed.
- Namespace storage keys to this application because GitHub Pages projects on the same origin share Web Storage. Isolate non-sensitive review preferences by deployment subpath; this is not a security boundary.
- Do not persist IFC binaries, geometry, model properties, quantities, filenames, local paths, file handles, or project records in application-managed storage. Phase 1C estimate data (CBS, rules, rates, workbooks) leaves the app only as user-initiated local file downloads and re-enters only through user-selected file imports; there is no upload and no app persistence.
- Do not introduce IndexedDB, OPFS, filesystem-backed persistence, or application-managed Cache Storage. Ordinary browser HTTP caching of static assets is separate from application data storage.
- Treat storage as optional: denied access, corrupt values, incompatible versions, or quota errors must fall back to safe in-memory defaults without preventing viewing.

Web Storage is suitable for small preferences, not model storage. Browser memory and GPU limits will bound the size and number of models that can be viewed together.

### GitHub Pages Deployment

The build will produce static assets suitable for a GitHub Pages project site. JavaScript imports, WASM locations, worker URLs, and other asset references must respect the configured project base path rather than assume deployment at the domain root.

The application must work without application-controlled cross-origin-isolation headers. Engine selection must not assume that `SharedArrayBuffer`-dependent multithreading will be available on GitHub Pages. WASM and worker loading must be verified on the deployed project path, not only on a local development server.

Dependency installation and builds may use package registries; this does not relax the same-origin runtime dependency policy.

## Evolution

Additional viewing and analysis capabilities will require explicit prioritization. They must preserve the browser-only processing, same-origin runtime assets, and settings-only Web Storage boundaries unless those architectural decisions are deliberately revisited.

Feature additions and revisions must also follow the module boundaries and change-locality criteria in [docs/architecture.md](docs/architecture.md); extending the application must not require routinely editing unrelated feature implementations.

Verified setup commands are maintained in [docs/development.md](docs/development.md). A deployed URL will be documented once verified. Delivery scope and validation details are maintained in [Phase 0: POC Viewer](docs/plans/Phase_0_POC_Viewer.md), with future phase plans added under `docs/plans/`.
