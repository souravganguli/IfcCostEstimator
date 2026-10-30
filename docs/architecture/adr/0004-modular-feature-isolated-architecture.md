# ADR-0004: Modular, feature-isolated architecture

- **Status:** Accepted
- **Date:** 2026-10-30 (retroactively recorded; decision predates this ADR)
- **Deciders:** Project owner

## Context

The viewer accumulates many features (loading, navigation, hierarchy, search, filtering,
measurement, clipping, viewpoints, costing, estimate export, and more). Without clear
boundaries, feature logic tends to collect in a shared shell and changes in one area break
others — a primary quality concern for this project.

## Decision

Adopt a **modular, feature-isolated architecture**. Each feature under `src/features/<name>/`
owns its behavior, UI, local state, and styling behind a single public entrypoint. Shared
capabilities are reached through explicit contracts (`src/core/`), not feature internals or
shared mutable globals. Adapters (`src/adapters/`) implement engine/rendering/browser
contracts. The application shell (`src/app/`) only composes features and supplies their
dependencies via one registration point. Dependencies flow app → feature public interfaces
→ contracts, and adapters → contracts; core must not import feature implementations, and
circular dependencies are disallowed. See
[architecture.md § Module Organization](../../architecture.md#module-organization) and
§ Ownership and Dependencies.

## Consequences

- A normal feature change touches only its module, its tests/spec, and at most one
  registration line (see [architecture.md § Change Locality](../../architecture.md#change-locality)).
- The boundaries are **enforced in CI** by `tests/unit/architecture.test.ts`: it fails on
  cross-feature private imports, features importing adapters/app or engines, core importing
  implementation layers, and import cycles.
- No global event bus; collaboration uses injected services, typed callbacks, and narrow
  read-only state views.
- The shell must not become a home for feature logic, model loading, or settings.
- Feature UI is DOM-wired by hand (see [ADR-0002](0002-typescript-vite-framework-free.md)),
  so per-feature behavioral tests matter; the current UI-layer coverage gap is tracked in
  [gaps.md](gaps.md).

## Alternatives considered

- **Shared "god" shell / layered-only architecture** — rejected: concentrates feature logic
  and causes the cross-feature breakage this decision prevents.
- **A UI framework's component/module system** — rejected with [ADR-0002](0002-typescript-vite-framework-free.md);
  the contract-based module boundary provides isolation without a framework runtime.
