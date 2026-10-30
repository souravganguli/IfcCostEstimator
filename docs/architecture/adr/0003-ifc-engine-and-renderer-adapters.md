# ADR-0003: web-ifc + Three.js isolated behind engine adapters

- **Status:** Accepted
- **Date:** 2026-10-30 (retroactively recorded; decision predates this ADR)
- **Deciders:** Project owner

## Context

Browser-only processing (see [ADR-0001](0001-browser-only-static-processing.md)) requires
an in-browser IFC parser and a 3D renderer. Both are specialized third-party libraries
with large, evolving APIs. The application must be able to swap or upgrade either without
rippling library-specific types through feature code.

## Decision

Use **web-ifc 0.0.78** for IFC parsing and **Three.js** for rendering. Both are isolated
behind engine/rendering **adapters** under `src/adapters/`. Features request capabilities
through explicit contracts in `src/core/contracts.ts` and must not import `three` or
`web-ifc` directly. Single-threaded WASM is bundled from the installed parser package and
loaded from the application origin. See
[architecture.md § Technology Stack](../../architecture.md#technology-stack).

## Consequences

- Engine-specific types stay behind the adapter boundary; features depend on contracts,
  keeping library churn local to the adapters.
- The boundary is enforced automatically by `tests/unit/architecture.test.ts`, which
  fails the build if a feature imports an engine directly.
- Swapping or upgrading the parser or renderer is a localized adapter change.
- The adapter is the one place where untyped engine values (`any`) legitimately appear;
  those are narrowed at the boundary (see [ADR-0009](0009-quality-guardrail-tooling.md)).
- Single-threaded WASM avoids cross-origin-isolation headers (see
  [ADR-0007](0007-github-pages-base-path-deployment.md)).

## Alternatives considered

- **Using Three.js / web-ifc types directly in features** — rejected: couples feature
  code to library APIs and makes upgrades a cross-cutting edit.
- **A different IFC engine or renderer** — not chosen now; the adapter boundary keeps
  this reversible if requirements change.
