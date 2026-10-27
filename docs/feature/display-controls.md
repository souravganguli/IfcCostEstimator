# Feature: Display Controls

Status: Planned for Phase 1A; requirements draft. Not implemented.

## Goal

Adjust model rendering for inspection without modifying IFC data.

## Scope

Initial proposal: per-model normal/wireframe mode and opacity control. Exclude property-driven coloring, material editing, saved display profiles, and changes to source IFC materials.

## Requirements

1. Let users choose the display mode and opacity for an individual loaded model, with a clear normal-rendering reset.
2. Keep controls associated with model identity, including duplicate filenames; other models retain their display settings.
3. Apply changes only to viewer-owned rendering state and restore original appearance when reset or removed.
4. Keep display state in memory only; do not persist model-specific appearance or derived model data.
5. Keep selected-element highlighting, clipping, and measurement overlays legible over changed display modes.

## Dependencies

- [IFC loading](ifc-loading.md), [model controls](model-controls.md), and [overall architecture](../architecture.md).
- Rendering adapter exposes typed per-model display commands and owns cloned/shared material lifecycle.

## Module Contract

- Proposed public entrypoint: `mountDisplayControls` under `src/features/display-controls/`.
- Owns display controls and transient per-model choice state; it never mutates parser-owned materials.
- Disposal resets feature-applied display state and removes listeners, subscriptions, and DOM.

## Acceptance Criteria

- Change one model to wireframe and partial opacity and verify other models are unaffected.
- Reset display and verify original appearance returns without reload or source-material mutation.
- Remove a model while altered and verify render resources are released.
- Exercise selection, measurement, and clipping overlays with altered display modes and verify they remain understandable.
- Verify no display choices or model-derived state are persisted across reload.