# ADR-0001: Browser-only, static-hosted processing (no backend)

- **Status:** Accepted
- **Date:** 2026-10-30 (retroactively recorded; decision predates this ADR)
- **Deciders:** Project owner

## Context

The product opens local IFC construction models and views them in a shared 3D scene.
A core product promise is that model data stays private: opening a file must not be a
network upload. The project also needs low operating cost and simple hosting.

## Decision

All IFC parsing, model management, and rendering run in the browser. There is no
application server, API, database, or server-side processing. The application is
deployed as static assets on GitHub Pages. Users explicitly choose local files
through browser file APIs; model contents are held in browser memory only and are
never transmitted. See [architecture.md § Boundaries](../../architecture.md#boundaries).

## Consequences

- Strong privacy guarantee: IFC contents and model-derived data are not sent anywhere.
  The privacy boundary is that model data is not transmitted, not that the app makes no
  network requests (static assets still load from the hosting origin).
- Zero backend operating cost and trivial hosting.
- Browser memory and GPU limits bound how many/large models can be viewed together;
  there is no server-side offloading.
- Model data is session-local: users must reopen files after a reload.
- No server means no server-side telemetry, analytics, or external APIs at runtime.

## Alternatives considered

- **Server-side IFC processing / conversion service** — rejected: breaks the privacy
  promise (uploads model data) and adds operating cost and infrastructure.
- **Desktop/Electron application** — rejected: higher distribution friction; a static
  web app meets the viewing need with the simplest hosting.
