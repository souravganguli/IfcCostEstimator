# ADR-0002: TypeScript + Vite with a framework-free UI

- **Status:** Accepted
- **Date:** 2026-10-30 (retroactively recorded; decision predates this ADR)
- **Deciders:** Project owner

## Context

The application is a browser-only static site (see [ADR-0001](0001-browser-only-static-processing.md))
built around a 3D viewport. It needs type safety across an IFC/geometry domain, fast
local iteration, and a small, dependency-light runtime served entirely from its own
origin.

## Decision

Use **TypeScript** as the implementation language and **Vite** as the dev server and
bundler. The UI is **framework-free**: no React/Vue/Angular runtime. Node.js and npm
are development and build tools only; deployed users need only a supported browser.
See [architecture.md § Technology Stack](../../architecture.md#technology-stack).

## Consequences

- Type safety spans the domain, adapters, and feature modules; `strict` is enabled.
- Minimal runtime payload and no UI-framework lock-in; interactive controls come from
  Fluent 2 Web Components instead (see [ADR-0006](0006-fluent2-web-components-ui.md)).
- Vite provides fast HMR locally and a static production build suitable for GitHub Pages.
- Without a framework, component/state conventions must be supplied by the modular
  architecture (see [ADR-0004](0004-modular-feature-isolated-architecture.md)) rather
  than by a framework's component model.
- DOM wiring in feature modules is hand-written, which raises the value of the UI-layer
  tests tracked as a gap (see [gaps.md](gaps.md)).

## Alternatives considered

- **React/Vue/Angular SPA** — rejected: adds a runtime dependency and bundle weight for
  an app whose interactivity centers on a canvas and a handful of panels; Web Components
  cover the control needs.
- **Plain JavaScript (no TypeScript)** — rejected: the IFC/geometry domain benefits
  materially from static typing.
