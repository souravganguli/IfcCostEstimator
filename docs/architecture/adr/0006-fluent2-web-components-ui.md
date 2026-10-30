# ADR-0006: Fluent 2 Web Components for interactive UI

- **Status:** Accepted
- **Date:** 2026-10-30 (retroactively recorded; decision predates this ADR)
- **Deciders:** Project owner

## Context

The app is framework-free (see [ADR-0002](0002-typescript-vite-framework-free.md)) but still
needs consistent, accessible interactive controls (buttons, menus, checkboxes, trees, tabs).
Hand-building accessible controls is costly and error-prone, and the same-origin runtime rule
(see [ADR-0007](0007-github-pages-base-path-deployment.md)) forbids loading UI assets from a CDN.

## Decision

Use the official **Fluent 2 Web Components** (`@fluentui/web-components`) for interactive UI
controls to the greatest extent possible, bundled with the application and using system fonts
with no external UI asset loading at runtime. A custom (non-Fluent) component requires explicit
user approval with a stated reason before creation; once approved it lives under
`src/components/` and holds no feature behavior. Use the Fluent text-size and spacing scale and
record every deviation in the design-system specification's Recorded Deviations table. See
[architecture.md § Module Organization](../../architecture.md#module-organization) and the
[Fluent 2 design system policy](../../feature/fluent2-design-system.md#design-policy).

## Consequences

- Accessible, visually consistent controls without a UI framework runtime.
- Web Components integrate with the framework-free DOM wiring but expose state on DOM
  properties (e.g. a Fluent checkbox's `checked`), which tests must address via property
  access rather than role helpers — a pattern already encoded in the e2e suite.
- All UI assets ship from the app origin, satisfying the same-origin runtime rule.
- Deviations are governed: custom components are the exception, not the default, keeping the
  UI surface uniform.

## Alternatives considered

- **Hand-rolled HTML controls** — rejected: re-implements accessibility and styling that
  Fluent provides, and drifts visually over time.
- **A third-party component library over a CDN** — rejected: violates the same-origin runtime
  dependency rule.
