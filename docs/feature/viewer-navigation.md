# Feature: 3D Navigation

Status: Implemented locally; Chrome browser tests and canvas-pixel comparisons exercise rendering and camera movement. Live deployment verification remains pending.

## Goal

Navigate the shared 3D scene and frame the models currently visible.

## Scope

Include orbit, pan, zoom, and fit-to-visible-models. Exclude element selection, property inspection, clipping, measurement, and model alignment.

## Requirements

1. Provide orbit, pan, and zoom controls for the shared scene using the supported desktop input environment.
2. Provide an explicit fit-view control that frames all visible loaded models, excluding hidden or removed models.
3. Disable fit view or treat it as a harmless no-op when no models are visible; do not produce invalid camera values or an error.
4. Navigation and camera fitting must not change authored relative model placement.
5. Camera and viewport rendering must respond to container resizing without stretching the scene or overlapping controls.

## Dependencies

- [Overall architecture](../../Readme.md) and [POC scope and browser targets](../plans/Phase_0_POC_Viewer.md).
- Shared rendering controller and compatible camera controls.
- [IFC loading](ifc-loading.md) and [model controls](model-controls.md) for model bounds and visibility.

## Module Contract

- Public entrypoint: `mountNavigation` in [src/features/viewer-navigation/index.ts](../../src/features/viewer-navigation/index.ts).
- Owns fit-view UI and session/availability subscriptions. Requires visible-model summaries and an injected fit command; camera/scene state and orbit controls remain owned by the viewer adapter.
- Disposing removes the button handler, both subscriptions, and owned DOM. Camera framing has independent tests for combined bounds, hidden models, narrow viewports, finite clipping planes, and empty-scene no-op behavior.

## Acceptance Criteria

- With two representative models loaded, orbit, pan, and zoom work without losing either model's relative placement.
- Fit view frames both visible models; hide one and confirm a subsequent fit uses only the remaining visible model.
- Fit with an empty scene or all models hidden produces no error or invalid camera state.
- Resize the viewport and confirm the scene remains correctly proportioned and controls remain usable.