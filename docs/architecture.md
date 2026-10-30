# Architecture

This document is the authoritative record of the **current-state** architecture for IfcCostEstimator. The [README](../Readme.md) covers product direction and local development; this file covers every decision about boundaries, technology choices, module structure, data flow, storage, deployment, and evolution.

The _reasoning and history_ behind each decision — context, alternatives, and consequences — is captured as dated [Architecture Decision Records](architecture/adr/README.md). Open architectural questions are tracked in [architecture/adr/gaps.md](architecture/adr/gaps.md). When a decision changes, add or supersede an ADR and update this document to match.

## Boundaries

| Area                 | Decision                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Hosting              | Static deployment on GitHub Pages.                                                                                  |
| Processing           | All IFC parsing, model management, and rendering run in the browser.                                                |
| Backend              | No application server, API, database, server-side processing, or backend service.                                   |
| File access          | Users explicitly choose local files through browser file APIs; opening a file is not a network upload.              |
| Runtime dependencies | All JavaScript, CSS, WASM, workers, and other runtime assets are served from the application's GitHub Pages origin. |
| External services    | No runtime third-party CDNs, external APIs, analytics, or telemetry.                                                |
| Model data           | Must never leave the user's device. May be held in memory or cached locally; today it is memory-only, so users reopen files after a reload. |
| Persistence          | Local-only. Any data may be stored locally provided it is never transmitted; see Settings and Storage below.        |

Static asset requests will still reach GitHub Pages. The privacy boundary is **local-only data**: IFC contents and model-derived data must not be transmitted off the user's device. It is not a persistence rule — local storage of model data is permitted; the application simply makes no transmission of it. See [ADR-0005](architecture/adr/0005-local-only-data-boundary.md).

## Technology Stack

The application uses **TypeScript and Vite**, with a framework-free UI. Node.js and npm are development and build tools only; deployed users need only a supported browser.

The local implementation uses **web-ifc 0.0.78** for IFC parsing and **Three.js** for rendering, both isolated behind engine adapters. Single-threaded WASM is bundled from the installed parser package and loaded from the application origin. No worker or cross-origin-isolation headers are required.

## Module Organization

Development follows a **modular, feature-isolated architecture**. Each feature owns its behavior, UI, local state, and styling behind a small public interface. Changes to a feature should remain inside that feature's module, its tests, and its specification rather than require edits throughout the application. New features integrate through a single composition/registration point.

Shared capabilities are accessed through explicit contracts, not feature internals or shared mutable globals. Cross-cutting contract changes are an explicit exception requiring impact review and integration tests.

```text
src/
  app/               Application shell and explicit feature composition
  features/
    <feature-name>/  Public entrypoint, implementation, local UI/styles/state
  core/              Shared domain contracts and session services
  components/        Custom (non-Fluent) reusable UI components, token-aligned
  adapters/          Engine, rendering, and browser integration implementations
tests/
  unit/              Isolated module and contract tests
  e2e/               Cross-feature browser workflows
docs/
  feature/           One specification per feature
  plans/             Phase delivery plans
```

Interactive UI uses the official Fluent 2 Web Components to the greatest extent possible per the [Fluent 2 design system policy](feature/fluent2-design-system.md#design-policy). A custom (non-Fluent) component requires explicit user approval with a stated reason before it is created; once approved it lives under `src/components/` and never holds feature behavior.

## Component Responsibilities

These are logical responsibilities, not a requirement for separate packages or a large framework:

| Component            | Responsibility                                                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| UI shell             | Viewport, layout, ribbon, and tool rail. Composes features and supplies their dependencies.                          |
| Model registry       | Session-local model identities, read-only summaries, load state, visibility commands, and asset lifecycle ownership. |
| IFC engine adapter   | Parsing, loading, unloading, and integration with the renderer; isolates library-specific APIs from application code.|
| Rendering controller | Shared scene, camera controls, model visibility, fit-to-view behavior, and rendering resource cleanup.               |
| Settings store       | Read and validate small versioned preferences, with in-memory defaults when persistence is unavailable.              |

## Data Flow

1. The user selects local IFC files through the browser File API.
2. The application reads each file into transient memory and passes it to the IFC engine.
3. Successfully loaded models are registered and rendered together in the shared scene.
4. Model controls address individual registry entries, not filenames or a fixed engine model ID.
5. Removing a model releases its engine resources and rendering resources without affecting other models.

Parsing and rendering must respect browser memory and GPU limits. Workers may improve responsiveness, provided they work within the hosting constraints. Rendering must preserve authored relative model placement, including when internal precision adjustments are needed.

Each loaded model must have its own session-local identity, even when filenames are identical. Engine handles remain associated with that identity. Element-level features must identify elements within their owning model rather than treating element IDs as globally unique.

The registry, adapter, and rendering controller must have explicit cleanup ownership. Removal and failed loads must release owned geometry, materials, temporary buffers, and engine state; object URLs must be revoked when no longer needed. Shared resources must remain available to models still in use.

## Ownership and Dependencies

| Boundary | Ownership and Rule |
| --- | --- |
| Feature module | Owns its use cases, local state, UI elements, interaction handlers, and styles. Exposes only the operations and types needed by consumers. |
| Public interface | One documented entrypoint per module. Importers must not reach into another module's internal files, DOM, or mutable state. Keep engine-specific types behind the appropriate integration boundary. |
| Application shell | Owns layout and lifecycle orchestration. Composes features and supplies their dependencies; it must not become the home for model loading, settings, or other feature logic. |
| Composition point | An explicit feature registration/composition location. Adding a normal feature requires its own module and at most one small registration change. |
| Shared services | Own truly shared session/model identity, model lifecycle, and rendering state through narrow contracts. Do not duplicate those responsibilities inside features. |
| Adapters | Implement contracts for the IFC engine, rendering, and browser integrations. Features request capabilities through those contracts rather than constructing or configuring third-party engines directly. |
| Shared primitives | Include only demonstrated reuse. A shared utility, component, or stylesheet must not become a dumping ground for unrelated feature behavior. |

Dependencies flow from application composition to feature public interfaces, from features to explicit contracts, and from adapters to the contracts they implement. Core contracts must not import feature implementations. Avoid circular dependencies.

Prefer injected services, typed callbacks, and narrow commands/read-only state views for collaboration. Do not introduce a global event bus or use untyped events to hide coupling.

## Settings and Storage

The boundary is **local-only data, not transmission**: see [ADR-0005](architecture/adr/0005-local-only-data-boundary.md).

- **Never transmit** IFC contents or model-derived data (geometry, properties, quantities, estimates, filenames, paths) off the user's device. No upload, no backend, no external API, no third-party runtime CDN, no analytics, and no telemetry on model content.
- **Local persistence is permitted.** The application may store any data — including model geometry, properties, quantities, and Phase 1C estimate data (CBS, rules, rates, workbooks) — using `localStorage`, `sessionStorage`, IndexedDB, OPFS, or application-managed Cache Storage, provided the data never leaves the device. This is a permission, not a requirement.
- **Current practice is memory-only.** No local persistence of model or estimate data is implemented yet; models require reopening after a reload, and Phase 1C estimate data moves only through user-initiated local file downloads/imports. Any caching or session-recovery feature must be deliberately specified, tested, and disclosed to users before it ships.
- Namespace local keys/stores to this application; GitHub Pages projects on the same origin share Web Storage, so isolation by deployment subpath is for review convenience, not a security boundary.
- Treat storage as optional: denied access, corrupt values, incompatible versions, or quota errors must fall back to safe in-memory defaults without preventing viewing.
- Shared-device at-rest data is out of scope: the boundary guards transmission, not another user of the same device reading locally cached data.

Browser memory and GPU limits will bound the size and number of models that can be viewed together.

## GitHub Pages Deployment

The build produces static assets for a GitHub Pages project site. JavaScript imports, WASM locations, worker URLs, and other asset references must respect the configured project base path rather than assume deployment at the domain root.

The application must work without application-controlled cross-origin-isolation headers. Engine selection must not assume that `SharedArrayBuffer`-dependent multithreading will be available on GitHub Pages. WASM and worker loading must be verified on the deployed project path, not only on a local development server.

Dependency installation and builds may use package registries; this does not relax the same-origin runtime dependency policy.

## UI, State, and Lifecycle

- Features own their UI subtree and use locally scoped or feature-prefixed styles. They must not query or alter another feature's private DOM or introduce global CSS overrides for feature-specific behavior.
- The shell supplies mounting locations and dependencies; feature modules expose a mount/initialization operation and cleanup when they own resources or subscriptions.
- Cleanup must remove feature-owned listeners, subscriptions, timers, DOM, and other resources. Shared model/GPU resources remain governed by their owning service so disabling a feature cannot invalidate another feature's resources.
- Keep feature-local state private. Shared state must have a single owner and be changed through explicit operations, not direct mutation from multiple features.
- Persist only the small settings permitted by the overall architecture. Modularization does not authorize new storage systems or persistence of models and derived data.
- Removing a feature's registration must not break unrelated features; any genuine dependency must be declared in its specification and supplied explicitly.

## Feature Specifications

Each specification under `docs/feature/` must describe the feature's scope, numbered requirements, and acceptance criteria, plus its module ownership, public interface, required capabilities, UI contribution, state/resource ownership, and cleanup obligations.

Document public contracts when they are designed; proposed interfaces are not evidence of an implemented API. Cross-feature dependencies must point to a capability or public contract rather than rely on knowledge of another implementation.

## Change Locality

A normal feature addition or change should modify only:

1. Its feature module and feature-owned styles or assets.
2. Its tests under `tests/` and its specification under `docs/feature/`.
3. One composition/registration location when introducing or removing a feature, plus genuinely needed delivery-plan evidence.

Some changes legitimately span modules: shared contract evolution, security fixes, or a requested application-wide redesign. Identify the affected consumers, explain why the shared change is necessary, update contracts and documentation, and add integration/regression tests.

## Verification Criteria

- Unit-test a feature through its public interface with controlled dependencies, without bootstrapping unrelated feature implementations.
- Test shared-service and adapter contracts, including failure and cleanup behavior, independently of feature UI.
- Add browser integration tests for new interactions between features and for their combined lifecycle.
- When a module owns resources or subscriptions, test that mounting/unmounting it does not leak resources or damage another feature's state.
- Review imports and the change set for internal-module imports, circular dependencies, duplicated shared state, and unexpected edits outside the feature boundary.
- Keep test code, configuration, fixtures, and generated artifacts under `tests/`; keep authored documentation under `docs/` except the root README and agent instructions.

## Evolution

Additional viewing and analysis capabilities will require explicit prioritization. They must preserve the browser-only processing, same-origin runtime assets, and settings-only Web Storage boundaries unless those decisions are deliberately revisited.

Feature additions must follow the module boundaries and change-locality criteria above; extending the application must not require routinely editing unrelated feature implementations.

Delivery scope and validation details are maintained in phase plans under [docs/plans/](plans/).
