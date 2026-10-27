# Feature: 3D Navigation

Status: Phase 0 navigation is implemented locally; Phase 1A camera-control extensions are planned and not implemented. Chrome browser tests and canvas-pixel comparisons exercise existing rendering and camera movement. Live deployment verification remains pending.

## Goal

Navigate the shared 3D scene and frame the models currently visible.

## Scope

Include the implemented orbit, pan, zoom, and fit-to-visible-models controls, plus planned standard views, a view cube, orthographic/perspective toggle, zoom window, and home/reset controls. Exclude first-person movement, element selection, property inspection, clipping, measurement, and model alignment; those have separate specifications.

## Requirements

1. Provide orbit, pan, and zoom controls for the shared scene using the supported desktop input environment.
2. Provide an explicit fit-view control that frames all visible loaded models, excluding hidden or removed models.
3. Disable fit view or treat it as a harmless no-op when no models are visible; do not produce invalid camera values or an error.
4. Navigation and camera fitting must not change authored relative model placement.
5. Camera and viewport rendering must respond to container resizing without stretching the scene or overlapping controls.
6. Provide standard top/front/side views and a view cube; activating a face or axis must produce a stable, finite camera orientation.
7. Provide a projection toggle between perspective and orthographic modes and preserve usable framing when switching modes.
8. Provide zoom-window and home/reset actions. Home fits all currently visible loaded models, matching fit-view behavior, and must not change model placement.
9. Keep camera controls keyboard accessible with names/tooltips, and ensure added controls do not overlap existing viewer or first-person controls.

## Dependencies

- [Overall architecture](../../Readme.md) and [POC scope and browser targets](../plans/Phase_0_POC_Viewer.md).
- Shared rendering controller and compatible camera controls.
- [IFC loading](ifc-loading.md) and [model controls](model-controls.md) for model bounds and visibility.

## Phase 1A Contract Additions

- Proposed additions to `mountNavigation`: injected commands for standard views, projection, zoom-window, and home; the viewer adapter continues to own camera/scene state and controls.
- These commands must not be implemented by direct camera mutation from UI features. Existing navigation behavior remains available when the new control set is unavailable.

## Module Contract

- Public entrypoint: `mountNavigation` in [src/features/viewer-navigation/index.ts](../../src/features/viewer-navigation/index.ts).
- Owns fit-view UI and session/availability subscriptions. Requires visible-model summaries and an injected fit command; camera/scene state and orbit controls remain owned by the viewer adapter.
- Disposing removes the button handler, both subscriptions, and owned DOM. Camera framing has independent tests for combined bounds, hidden models, narrow viewports, finite clipping planes, and empty-scene no-op behavior.

## Acceptance Criteria

- With two representative models loaded, orbit, pan, and zoom work without losing either model's relative placement.
- Fit view frames both visible models; hide one and confirm a subsequent fit uses only the remaining visible model.
- Fit with an empty scene or all models hidden produces no error or invalid camera state.
- Resize the viewport and confirm the scene remains correctly proportioned and controls remain usable.
- Verify standard views, view-cube faces, projection switching, zoom-window, and home/reset with empty, single-model, and multi-model scenes; assert finite camera values, Home matches fit-visible-models, and authored placement is unchanged.