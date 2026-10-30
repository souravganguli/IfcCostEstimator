# ADR-0008: IFC parsing in a Web Worker with GLB/JSON split

- **Status:** Accepted
- **Date:** 2026-10-30 (recorded from commit `a71f2a6`, "replace in-thread web-ifc with Worker + GLB/JSON split")
- **Deciders:** Project owner

## Context

Parsing large IFC files with web-ifc on the main thread blocks interaction: measured runs show
multi-hundred-millisecond long tasks during load (see
[development.md § Bounded Resource Measurement](../../development.md#bounded-resource-measurement)).
The viewer must stay responsive, and the no-cross-origin-isolation constraint
(see [ADR-0007](0007-github-pages-base-path-deployment.md)) rules out `SharedArrayBuffer`-based
threading.

## Decision

Run IFC parsing in a **dedicated Web Worker** (`src/adapters/ifc/worker.ts`, loaded as a module
worker via `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })`). The worker
produces two artifacts: **GLB geometry** (built by `glb-builder.ts`) and a **metadata JSON**
(properties, hierarchy, schema) which is gzip-compressed with `CompressionStream` and transferred
back. The pure processing logic lives in `ifc-processor.ts` so it can be unit-tested in Node
without a real worker, `CompressionStream`, or a `GLTFLoader`. The main-thread adapter
(`src/adapters/ifc/index.ts`) decompresses the metadata and loads the GLB into Three.js. See
[architecture.md § Data Flow](../../architecture.md#data-flow).

## Consequences

- Parsing moves off the main thread, improving responsiveness during load.
- The GLB/JSON split cleanly separates geometry (for the renderer) from metadata (for
  element/property/hierarchy features), transferred efficiently as `Transferable`s.
- Separating `ifc-processor.ts` from the worker entry point keeps the heavy logic unit-testable
  in Node/vitest; `worker.ts` itself is browser-only and is excluded from unit coverage, verified
  instead by the e2e suite.
- The worker still runs single-threaded web-ifc (no `SharedArrayBuffer`), consistent with
  [ADR-0007](0007-github-pages-base-path-deployment.md); it improves responsiveness, not raw
  parse throughput.
- Worker and WASM URLs must respect the deployment base path and be verified on the deployed site.

## Alternatives considered

- **In-thread parsing (previous approach)** — rejected: blocked interaction on large models.
- **Multithreaded web-ifc via SharedArrayBuffer** — rejected: requires cross-origin-isolation
  headers unavailable on GitHub Pages.
