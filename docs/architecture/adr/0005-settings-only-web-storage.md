# ADR-0005: Settings-only persistence via Web Storage

- **Status:** Accepted
- **Date:** 2026-10-30 (retroactively recorded; decision predates this ADR)
- **Deciders:** Project owner

## Context

Browser-only processing (see [ADR-0001](0001-browser-only-static-processing.md)) keeps model
data in memory. The application still needs to remember small user preferences (e.g. grid
visibility) across sessions, without compromising the privacy promise or introducing a
data store that could retain model content.

## Decision

Persist **only small, versioned viewer preferences** using `localStorage` (and
`sessionStorage` for tab-scoped settings if needed). Storage keys are namespaced to this
application and isolated by deployment subpath. The application must **not** persist IFC
binaries, geometry, properties, quantities, filenames, local paths, file handles, or project
records. Do not introduce IndexedDB, OPFS, filesystem-backed persistence, or
application-managed Cache Storage. Phase 1C estimate data leaves and re-enters the app only
through user-initiated local file downloads/imports — no upload, no app persistence. Storage
is optional: denied access, corrupt values, incompatible versions, or quota errors fall back
to safe in-memory defaults. See
[architecture.md § Settings and Storage](../../architecture.md#settings-and-storage).

## Consequences

- The privacy boundary extends to storage: no model-derived data is ever written to disk by
  the app.
- Settings reads/writes must be defensive; `src/core/settings.ts` validates the stored shape
  and falls back to defaults on any failure, which is covered by unit tests.
- Larger persistence needs (e.g. caching parsed models) are explicitly out of scope unless
  this decision is deliberately revisited.
- Same-origin GitHub Pages projects share Web Storage, so subpath namespacing is required;
  this is isolation for review convenience, not a security boundary.

## Alternatives considered

- **IndexedDB / OPFS for model or estimate caching** — rejected: would retain model-derived
  data on disk, breaking the privacy promise and the no-persistence rule.
- **No persistence at all** — rejected: losing trivial preferences like grid visibility every
  session is poor UX, and small settings carry no privacy risk.
