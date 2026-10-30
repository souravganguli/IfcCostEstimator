# ADR-0007: GitHub Pages base-path-aware static deployment

- **Status:** Accepted
- **Date:** 2026-10-30 (retroactively recorded; decision predates this ADR)
- **Deciders:** Project owner

## Context

The application is static and browser-only (see [ADR-0001](0001-browser-only-static-processing.md)).
It is hosted on a GitHub Pages **project** site served from a subpath
(`https://souravganguli.github.io/IfcCostEstimator/`), not the domain root. Asset references
(JS imports, WASM, worker URLs) that assume root deployment would break there.

## Decision

Build static assets for the GitHub Pages project site with a configured base path
(default `/IfcCostEstimator/`, overridable via `VITE_BASE_PATH`). All asset references — JS,
CSS, WASM, worker URLs — must respect the base path and must not assume root deployment. The
application must work **without** application-controlled cross-origin-isolation headers;
engine selection must not require `SharedArrayBuffer`-based multithreading. WASM and worker
loading must be verified on the deployed project path, not only on a local dev server.
Deployment is by a GitHub Actions workflow on pushes to `master`, which tests then publishes
only `dist/`. See
[architecture.md § GitHub Pages Deployment](../../architecture.md#github-pages-deployment) and
[release-policy.md](../../release-policy.md).

## Consequences

- Single-threaded WASM is used (consistent with [ADR-0003](0003-ifc-engine-and-renderer-adapters.md)),
  avoiding COOP/COEP headers GitHub Pages cannot set.
- Only `master` pushes run cloud checks and deploy; other branches are validated locally.
- The post-deploy smoke check verifies HTTP availability and an asset, not browser rendering
  or IFC/WASM loading, so live-site rendering remains a manual verification step.
- The CI workflow is covered by `tests/unit/workflows.test.ts`, which asserts gate ordering
  and deploy conditions.
- Root-path-only asset references are prohibited and would break the project-site deployment.

## Alternatives considered

- **Deploy from a branch (Pages "Deploy from a branch" source)** — rejected: it publishes
  repository source instead of the Vite build (this previously caused a missing app); the
  source must be GitHub Actions.
- **Multithreaded WASM with cross-origin isolation** — rejected: GitHub Pages cannot set the
  required headers.
