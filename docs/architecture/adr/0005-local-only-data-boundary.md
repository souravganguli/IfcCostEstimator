# ADR-0005: Local-only data boundary (no transmission; local persistence permitted)

- **Status:** Accepted
- **Revision:** 2
- **Date:** 2026-10-30 (revision 2); original decision predates revision 1
- **Deciders:** Project owner

## Context

Browser-only processing (see [ADR-0001](0001-browser-only-static-processing.md)) keeps IFC
data on the user's machine. The application needs a clear, durable rule for what it may and
may not do with that data — stored and transmitted.

The governing principle is:

> **No user data may leave the user's device. Nothing else is the constraint.**

This is a **transmission** boundary, not a **persistence** boundary. Uploading model data to a
server is forbidden because it leaves the device; caching model data on the user's own disk is
not, because it does not. At-rest data on a shared computer is treated as the user's own
responsibility, not something this application must guard against.

(Revision 1 of this ADR framed the boundary as persistence-based — "settings-only, nothing on
disk, no IndexedDB/OPFS." That was stricter than the real intent and mislabeled harmless
local-only optimizations as privacy violations. See Change history.)

## Decision

Adopt a **local-only data boundary**:

- **No transmission.** IFC contents and all model-derived data (geometry, properties,
  quantities, estimates, filenames, paths) must never be transmitted off the user's device.
  No upload, no backend, no external API, no third-party CDN for runtime data, no analytics,
  no telemetry on model content. This is the core, non-negotiable rule and is consistent with
  [ADR-0001](0001-browser-only-static-processing.md) and the external-services boundary.
- **Local persistence is permitted.** The application **may** store any data — including model
  geometry, properties, quantities, estimate data (CBS, rates, workbooks), and user rate/CBS
  libraries — using local browser storage (`localStorage`, `sessionStorage`, IndexedDB, OPFS,
  or application-managed Cache Storage), provided the data never leaves the device.
- **Permit, not require.** This ADR removes the prohibition on local persistence; it does not
  mandate any caching or recovery feature. In practice the application remains memory-only
  until such a feature is deliberately specified, so models currently require reopening after a
  reload.
- **Storage is optional and defensive.** Denied access, corrupt values, incompatible versions,
  and quota errors must fall back to safe in-memory defaults without preventing viewing.
- **Namespacing.** Local keys/stores are namespaced to this application. GitHub Pages projects
  on the same origin share Web Storage, so isolation by deployment subpath is used for review
  convenience; it is not a security boundary.
- **Shared-device at-rest data is out of scope.** The boundary protects against transmission,
  not against another user of the same device reading locally cached data. A feature that
  caches model data should state so plainly to users; it need not encrypt or purge at-rest
  data to satisfy this boundary.

See [architecture.md § Boundaries](../../architecture.md#boundaries) and § Settings and Storage
for the current-state wording.

## Consequences

- **The privacy claim is "your data never leaves your device,"** not "nothing is ever written
  to disk." This matches how comparable browser viewers (e.g. ifcvieweronline.eu) position
  themselves and is accurate under local caching.
- **Local-only optimizations are now available** as deliberate, specifiable features: OPFS or
  IndexedDB geometry caching for faster reloads, crash/accidental-reload session recovery, and
  locally persisted rate/CBS libraries. Each still needs its own feature spec, tests, and a
  user-facing note; none is implemented by this ADR.
- **The deciding line is local vs. transmitted**, not settings vs. model data. "Settings-only"
  is no longer the operative limit.
- **The no-upload / no-backend / no-telemetry rules are unchanged** and remain enforced by the
  browser-only architecture.
- **New at-rest consideration:** cached model data on a shared device is readable by other users
  of that device. This is an accepted trade-off, not a defect.
- **Settings reads/writes remain defensive;** `src/core/settings.ts` validates stored shape and
  falls back to defaults on any failure, covered by unit tests.

## Alternatives considered

- **Persistence-based boundary (revision 1: memory-only, nothing on disk, no IndexedDB/OPFS)**
  — rejected: stricter than the real intent; forbids harmless local optimizations and forces
  re-parsing every session for a guarantee the owner did not require.
- **No transmission AND no cross-session persistence (in-session local only, cleared on close)**
  — rejected: would protect shared-device at-rest privacy, but the owner decided at-rest data is
  the user's responsibility; it would needlessly block session recovery and local rate libraries.

## Change history

- **Revision 2 (2026-10-30):** Re-based the boundary from persistence to transmission. The rule
  is now "no data leaves the device; local persistence (incl. IndexedDB/OPFS/Cache Storage) is
  permitted." Lifted the prior blanket prohibition on local disk storage of model/estimate data.
  No code change; the app remains memory-only in practice. Title changed from "Settings-only
  persistence via Web Storage."
- **Revision 1 (original):** "Settings-only persistence via Web Storage." Permitted only small
  versioned preferences in Web Storage; forbade persisting any model-derived data and explicitly
  prohibited IndexedDB, OPFS, filesystem-backed persistence, and application-managed Cache
  Storage.
