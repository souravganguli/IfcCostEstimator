# Modular Feature Architecture

## Direction and Status

The application must use feature-isolated modules so features can be developed, tested, extended, and removed without routinely changing unrelated implementation files. This direction applies across all phases and inherits the browser-only processing, runtime asset, storage, and privacy boundaries in [Readme.md](../Readme.md).

The Phase 0 implementation now separates the five feature UI modules under `src/features/`, shared session/contracts under `src/core/`, parser and rendering integrations under `src/adapters/`, and application composition under `src/app/`. The application entrypoint only mounts the app and registers development teardown. This document also governs future work; it does not authorize later-phase features or imply live deployment acceptance.

## Module Organization

Organize application behavior by feature rather than scattering each feature across shared UI, state, and event-handler files. The implemented module boundaries follow this organization:

```text
src/
  app/                 Application shell and explicit feature composition
  features/
    <feature-name>/     Public entrypoint, implementation, local UI/styles/state
  core/                Shared domain contracts and session services
  adapters/            Engine, rendering, and browser integration implementations
tests/
  unit/                Isolated module and contract tests
  e2e/                 Cross-feature browser workflows
docs/
  feature/             One specification per feature
  plans/               Phase delivery plans
```

A feature may contain several cohesive files, but should not require unrelated files to change. Start small: a feature does not need a package, build pipeline, service container, or plugin framework of its own. Introduce internal files or shared abstractions only when they remove real complexity or represent established reuse.

## Phase 0 Public Contracts

The feature entrypoints are `mountIfcLoading`, `mountModelControls`, `mountNavigation`, `mountSettings`, and `mountFeedback`. Each returns a disposable handle. Features receive their mounting elements and narrow capabilities from application composition; they do not construct the IFC parser or renderer or import other feature implementations.

Shared contracts are defined in [src/core/contracts.ts](../src/core/contracts.ts). `ModelSession` exposes read-only model summaries, subscriptions, and explicit load/toggle/remove commands. Engine/render objects stay behind the private `ModelAsset` boundary; features never receive mutable model groups or parser handles. Settings accepts a storage capability, a grid command, and a notice callback. Feedback receives session/availability observations and exposes a notice operation; a fatal availability error takes precedence over informational notices.

The session disposes late load results after teardown and stops queued work. The viewer removes its observer, animation loop, context-loss listener, controls, grid, scene references, and canvas on disposal. A lost context ends the current session and requires reload; it is not misrepresented as a recoverable graphics resource in the same session.

Isolated DOM tests verify feature cleanup without creating an engine or renderer. The architecture regression tests parse imports with the TypeScript compiler API to check dependency direction, public feature entrypoints, forbidden direct engine dependencies, and cycles. These checks complement browser tests and code review rather than replace them.

## Ownership and Dependencies

| Boundary | Ownership and Rule |
| --- | --- |
| Feature module | Owns its use cases, local state, UI elements, interaction handlers, and styles. Exposes only the operations and types needed by consumers. |
| Public interface | One documented entrypoint per module. Importers must not reach into another module's internal files, DOM, or mutable state. Keep engine-specific types behind the appropriate integration boundary. |
| Application shell | Owns layout and lifecycle orchestration. Composes features and supplies their dependencies; it must not become the home for model loading, settings, or other feature logic. |
| Composition point | An explicit feature registration/composition location. Adding a normal feature requires its own module and at most one small registration change, rather than new handlers and conditionals scattered across the shell. |
| Shared services | Own truly shared session/model identity, model lifecycle, and rendering state through narrow contracts. Do not duplicate those responsibilities inside features to achieve apparent independence. |
| Adapters | Implement contracts for the IFC engine, rendering, and browser integrations. Features request capabilities through those contracts rather than constructing or configuring third-party engines directly. |
| Shared primitives | Include only demonstrated reuse. A shared utility, component, or stylesheet must not become a dumping ground for unrelated feature behavior. |

Dependencies flow from application composition to feature public interfaces, from features to explicit contracts, and from adapters to the contracts they implement. Core contracts must not import feature implementations. Avoid circular dependencies.

Prefer injected services, typed callbacks, and narrow commands/read-only state views for collaboration. When shared events are necessary, define their payloads and subscription ownership explicitly. Do not introduce a global event bus by default or use untyped events to hide coupling.

## UI, State, and Lifecycle

- Features own their UI subtree and use locally scoped or feature-prefixed styles. They must not query or alter another feature's private DOM or introduce global CSS overrides for feature-specific behavior.
- The shell supplies mounting locations and dependencies; feature modules expose a mount/initialization operation and cleanup when they own resources or subscriptions. Use simple functions where a larger lifecycle abstraction is unnecessary.
- Cleanup must remove feature-owned listeners, subscriptions, timers, DOM, and other resources. Shared model/GPU resources remain governed by their owning service so disabling a feature cannot invalidate another feature's resources.
- Keep feature-local state private. Shared state must have a single owner and be changed through explicit operations, not direct mutation from multiple features.
- Persist only the small settings permitted by the overall architecture. Modularization does not authorize new storage systems or persistence of models and derived data. Phase 1C estimate data is exchanged only through explicit user file import and download, not stored by the app.
- Removing a feature's registration must not break unrelated features; any genuine dependency must be declared in its specification and supplied explicitly.

## Feature Specifications

Each specification under `docs/feature/` must describe the feature's scope, numbered requirements, and acceptance criteria, plus its module ownership, public interface, required capabilities, UI contribution, state/resource ownership, and cleanup obligations. These can be concise additions to the existing dependency section; do not create a second specification for the same feature.

Document public contracts when they are designed; proposed interfaces are not evidence of an implemented API. Cross-feature dependencies must point to a capability or public contract rather than rely on knowledge of another implementation.

## Change Locality

A normal feature addition or change should modify only:

1. Its feature module and feature-owned styles or assets.
2. Its tests under `tests/` and its specification under `docs/feature/`.
3. One composition/registration location when introducing or removing a feature, plus genuinely needed delivery-plan evidence.

Changing established feature behavior should not require repeated edits to a central entrypoint, global stylesheet, or unrelated modules. If an ordinary feature needs such edits, treat that as a boundary problem and improve the owning boundary within the authorized scope before building further coupling.

Some changes legitimately span modules: shared contract evolution, security fixes, or a requested application-wide redesign. Identify the affected consumers, explain why the shared change is necessary, update contracts and documentation, and add integration/regression tests. Do not use modularization as a pretext for an unrelated repository-wide rewrite.

## Verification Criteria

- Unit-test a feature through its public interface with controlled dependencies, without bootstrapping unrelated feature implementations.
- Test shared-service and adapter contracts, including failure and cleanup behavior, independently of feature UI.
- Add browser integration tests for new interactions between features and for their combined lifecycle. Relevant existing workflows must continue to pass.
- When a module owns resources or subscriptions, test that mounting/unmounting or enabling/disabling it does not leak resources or damage another feature's state.
- Review imports and the change set for internal-module imports, circular dependencies, duplicated shared state, and unexpected edits outside the feature boundary. Passing tests alone does not demonstrate feature isolation.
- Keep test code, configuration, fixtures, and generated artifacts under `tests/`; keep authored documentation under `docs/` except the root README and agent instructions.

The intended outcome is localized change, not a large file count, a new framework, or literal one-file-only development.