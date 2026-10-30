# Architecture Decision Records (ADRs)

This directory captures each significant architectural decision for IfcCostEstimator
as a standalone, dated record. ADRs make the _reasoning_ behind a decision durable:
what was decided, why, what was rejected, and what the consequences are.

[docs/architecture.md](../../architecture.md) remains the consolidated, current-state
architecture reference. These ADRs are the decision history that backs it.

## Changing a decision: rewrite in place, bump the revision

**An ADR's number is its stable identity; its content may change.** When a decision
changes, **rewrite the existing ADR in place** — keep the same ADR number and filename
stem, update the title/body to the new decision, bump the **Revision**, and append a
dated entry to that ADR's **Change history** summarizing what changed and why. Then
update `architecture.md` to match.

**Do not create a separate "superseding" ADR, and do not leave `Superseded` records in
this directory.** There must be exactly **one current text per ADR** so that an agent or
reader skimming a single ADR always sees the authoritative, in-force decision and cannot
act on an outdated one. Prior reasoning is preserved in the Change history section and in
git history, not in a stale parallel file.

## Format

Each ADR follows a lightweight [MADR](https://adr.github.io/madr/)-style template:

- **Status** — Proposed, Accepted, or Deprecated. (No `Superseded`: see above.)
- **Revision** — integer, starting at 1, bumped on each in-place rewrite.
- **Context** — the forces and constraints that make a decision necessary.
- **Decision** — the position taken, stated plainly.
- **Consequences** — the trade-offs, including what becomes harder.
- **Alternatives considered** — options rejected, with the reason.
- **Change history** — dated revision log for this ADR.

Use the [template](0000-template.md) for new records. Number ADRs sequentially with a
four-digit prefix and a short kebab-case slug: `0001-browser-only-processing.md`. If a
rewrite changes the title, the filename stem may be renamed to match while the number is
kept (for example ADR-0005).

## Index

| ADR | Title | Status |
| --- | --- | --- |
| [0001](0001-browser-only-static-processing.md) | Browser-only, static-hosted processing (no backend) | Accepted |
| [0002](0002-typescript-vite-framework-free.md) | TypeScript + Vite with a framework-free UI | Accepted |
| [0003](0003-ifc-engine-and-renderer-adapters.md) | web-ifc + Three.js isolated behind engine adapters | Accepted |
| [0004](0004-modular-feature-isolated-architecture.md) | Modular, feature-isolated architecture | Accepted |
| [0005](0005-local-only-data-boundary.md) | Local-only data boundary (no transmission; local persistence permitted) | Accepted (rev 2) |
| [0006](0006-fluent2-web-components-ui.md) | Fluent 2 Web Components for interactive UI | Accepted |
| [0007](0007-github-pages-base-path-deployment.md) | GitHub Pages base-path-aware static deployment | Accepted |
| [0008](0008-ifc-worker-glb-json-pipeline.md) | IFC parsing in a Web Worker with GLB/JSON split | Accepted |
| [0009](0009-quality-guardrail-tooling.md) | Quality guardrails: lint, format, coverage, CI gates | Accepted |

## Identified gaps

Open architectural questions that are not yet decided are tracked in
[gaps.md](gaps.md). Resolving a gap means writing (or amending) an ADR and updating
`architecture.md`.
