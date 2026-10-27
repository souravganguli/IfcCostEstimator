# Feature: IFC Loading

Status: Locally verified with synthetic IFC4 coverage and eight supplied-model production-preview checks in Chrome. Broader schema/geometry claims are not made. Live GitHub Pages acceptance remains pending.

## Goal

Open multiple local IFC files in one browser session without uploading or persisting model data.

## Scope

Include browser file selection, additive multi-model loading, session-local identity, and authored placement. Exclude remote URLs, model restoration, IFC editing, alignment, and georeferencing correction.

## Requirements

1. Allow users to select one or more local IFC files and add further files without replacing successfully loaded models. Cancelling file selection must leave the session unchanged.
2. Read and parse files entirely in browser memory. Do not upload file contents or persist model data or file handles.
3. Assign each load an independent session-local model identity associated with its engine handle. Identical filenames must not collide.
4. Serialize parsing initially to limit concurrent memory peaks. A failed file must not discard successful loads or prevent remaining selected files from being attempted after a recoverable failure.
5. Preserve authored relative placement. Any internal precision adjustment must apply consistently across models.
6. Release temporary loading resources and failed-load engine state. Coordinate visible status and errors with the feedback feature.

## Dependencies

- [Overall architecture](../../Readme.md) and [POC scope and browser targets](../plans/Phase_0_POC_Viewer.md).
- Qualified IFC engine, model registry, and rendering controller.
- [Loading and error feedback](loading-and-errors.md) for user-visible load outcomes.

## Module Contract

- Public entrypoint: `mountIfcLoading` in [src/features/ifc-loading/index.ts](../../src/features/ifc-loading/index.ts).
- Owns the file-open button, picker subtree, input handlers, and availability subscription. Requires `ModelSession` enqueue and `Availability`; it does not access renderer/engine internals or another feature's DOM.
- Clearing or cancelling file selection does not mutate existing models. Disposing removes handlers, the subscription, and owned DOM; model loading and asset cleanup remain owned by the shared session/adapter.

## Acceptance Criteria

- Load at least two representative IFC files together, both in a single selection and through successive selections; both remain visible.
- Select different files with the same filename and verify distinct registry identities and independent model controls.
- Cancel the picker and confirm existing models remain unchanged.
- Attempt an invalid or unsupported file between valid files; verify existing models survive and subsequent valid files are attempted after a recoverable failure.
- Confirm models retain their authored relative placement and loading releases temporary resources.
- Inspect network requests and browser storage: no IFC content or derived data is transmitted or persisted; reload requires reopening files.