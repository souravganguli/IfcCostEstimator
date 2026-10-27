# Feature: 3D Section and Clipping

Status: Planned for Phase 1A; requirements draft. Not implemented.

## Goal

Inspect the 3D scene through a controllable clipping plane.

## Scope

Initial proposal: one active adjustable plane with orientation presets and reset. Include cap faces and clip-aware picking. Exclude multi-plane stacks, section-box editing, saved clipping states, and generated 2D section drawings; those are separate decisions/features.

## Requirements

1. Create, move, and orient a plane through the visible scene and communicate which side is clipped.
2. Support a small defined set of orientations (horizontal and principal vertical directions) plus user adjustment; always offer reset/disable.
2a. Draw cap faces on the cut so solid elements appear closed; caps are viewer-owned, belong to the cut element for picking, and are not IFC geometry or bounds. Separate pick geometry keeps visually clipped-away geometry selectable and measurable while preserving the clipping display. Cap generation limits for open or non-manifold meshes are documented, with an uncapped fallback.
3. Apply clipping consistently to loaded models without changing authored coordinates or source geometry.
4. Handle an empty scene, hidden models, and model removal without stale clipping references or invalid camera values.
5. Keep plane state session-local and ensure clipping resources are released when the feature is disabled or disposed.

## Dependencies

- [IFC loading](ifc-loading.md), [3D navigation](viewer-navigation.md), and [overall architecture](../architecture.md).
- Rendering adapter exposes a typed clipping capability; the feature does not configure renderer internals directly.

## Module Contract

- Proposed public entrypoint: `mountSectionClipping` under `src/features/section-clipping/`.
- Owns clipping controls and the current plane parameters. The viewer adapter owns applying/disabling clipping and any GPU state.
- Disposal disables its plane and removes UI, handlers, and subscriptions.

## Acceptance Criteria

- Clip known geometry with horizontal and vertical planes and verify orientation and cut side.
- Adjust and reset the plane without changing model placement or IFC source data.
- Hide/remove models and clear the scene while clipping; verify no stale references or render errors.
- Verify cap faces render on cut solids, picking selects the cut element via its cap or separate pick geometry, and clipped-away geometry remains associated with the correct model-scoped element.
- Confirm the feature does not create plan or section drawings; those are covered by separate specifications.