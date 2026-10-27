# Feature: Viewer Settings

Status: Implemented locally with unit and Chrome/Edge browser coverage. Live deployment verification remains pending.

## Goal

Retain small viewer preferences without storing model files or making persistence necessary for viewing.

## Scope

Include preference validation, versioning, namespaced Web Storage, and graceful failure handling. Exclude model restoration, project records, model-specific state, cloud settings, and alternative persistence systems. The preference schema below defines the supported control and defaults.

## Requirements

### Preference Schema

Use the key `ifccostestimator:settings:v1` with a JSON object containing only `version: 1` and `showGrid: boolean`. The default is `showGrid: true`. A labeled checkbox toggles the scene grid. Invalid or incompatible records use defaults; writes include only these approved fields. No camera, model, or filename state is saved.

Production retains this existing key. The development review build at `/dev/`, beneath the configured project root, appends `:<deployment-base>` to the key. Production and dev therefore restore independent grid preferences. Feature branches are not published and use the local/default preference behavior during tests. This separates ordinary preferences, not origin security or sensitive data access.

1. Store only explicitly defined, small viewer preferences in application-namespaced, versioned `localStorage` entries. Use `sessionStorage` only if a preference explicitly requires tab-scoped behavior.
2. Validate stored values and version compatibility before use. Missing, invalid, or incompatible values must use safe defaults.
3. Handle denied storage access and read/write quota errors without preventing model loading or navigation; keep usable preferences in memory for the active session.
4. Do not persist IFC binaries, geometry, properties, quantities, filenames, local paths, file handles, or project/model records.
5. Reloading may restore valid preferences but must not restore models. Do not use IndexedDB, OPFS, filesystem-backed persistence, or application-managed Cache Storage.
6. Storage operations must affect only this application's keys, not other GitHub Pages applications sharing the origin.
7. Production and development must not overwrite one another's preferences. Keep compatibility with existing production preferences and do not migrate or copy model state between paths.

## Dependencies

- [Overall storage boundaries](../../Readme.md) and [POC scope and browser targets](../plans/Phase_0_POC_Viewer.md).
- Settings store and an explicitly specified preference schema before implementation.

## Module Contract

- Public entrypoint: `mountSettings` in [src/features/viewer-settings/index.ts](../../src/features/viewer-settings/index.ts).
- Owns the grid checkbox, in-session preference state, change handler, and feature styles. Receives storage read/write operations, a grid-visibility command, and a notice callback rather than importing another feature or the viewer adapter.
- Persistence validation is implemented by the shared settings service. Disposing removes handlers and owned DOM without clearing application or unrelated origin storage. Detached controls cannot continue changing settings.
- Composition supplies deployment-scoped storage through the shared settings service; the feature does not inspect deployment URLs or hosting channels itself.

## Acceptance Criteria

- For each defined preference, change it and reload; verify a valid value is restored while models must be reopened.
- Test absent, corrupt, invalid, and incompatible stored values; verify safe defaults and a usable viewer.
- Simulate denied reads/writes and quota errors; verify loading and navigation remain usable with in-memory settings.
- Inspect stored entries after model loading and preference changes; confirm only approved preference fields are present.
- Place an unrelated origin storage key before testing and confirm settings operations leave it unchanged.
- Change the grid preference in production and development; verify each restores its own value, with no inherited review preference or change to the original production key.