# Architecture Decision Records (ADRs)

This directory captures each significant architectural decision for IfcCostEstimator
as a standalone, dated record. ADRs make the _reasoning_ behind a decision durable:
what was decided, why, what was rejected, and what the consequences are.

[docs/architecture.md](../../architecture.md) remains the consolidated, current-state
architecture reference. These ADRs are the decision history that backs it. When a
decision changes, add a new ADR that supersedes the old one rather than silently
editing history, then update `architecture.md` to reflect the new current state.

## Format

Each ADR follows a lightweight [MADR](https://adr.github.io/madr/)-style template:

- **Status** — Proposed, Accepted, Superseded by ADR-XXXX, or Deprecated.
- **Context** — the forces and constraints that make a decision necessary.
- **Decision** — the position taken, stated plainly.
- **Consequences** — the trade-offs, including what becomes harder.
- **Alternatives considered** — options rejected, with the reason.

Use the [template](0000-template.md) for new records. Number ADRs sequentially with a
four-digit prefix and a short kebab-case slug: `0001-browser-only-processing.md`.

## Index

| ADR | Title | Status |
| --- | --- | --- |
| [0001](0001-browser-only-static-processing.md) | Browser-only, static-hosted processing (no backend) | Accepted |
| [0002](0002-typescript-vite-framework-free.md) | TypeScript + Vite with a framework-free UI | Accepted |
| [0003](0003-ifc-engine-and-renderer-adapters.md) | web-ifc + Three.js isolated behind engine adapters | Accepted |
| [0004](0004-modular-feature-isolated-architecture.md) | Modular, feature-isolated architecture | Accepted |
| [0005](0005-settings-only-web-storage.md) | Settings-only persistence via Web Storage | Accepted |
| [0006](0006-fluent2-web-components-ui.md) | Fluent 2 Web Components for interactive UI | Accepted |
| [0007](0007-github-pages-base-path-deployment.md) | GitHub Pages base-path-aware static deployment | Accepted |
| [0008](0008-ifc-worker-glb-json-pipeline.md) | IFC parsing in a Web Worker with GLB/JSON split | Accepted |
| [0009](0009-quality-guardrail-tooling.md) | Quality guardrails: lint, format, coverage, CI gates | Accepted |

## Identified gaps

Open architectural questions that are not yet decided are tracked in
[gaps.md](gaps.md). Resolving a gap means writing (or amending) an ADR and updating
`architecture.md`.
