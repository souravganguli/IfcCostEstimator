# Feature: Temporary Viewpoints

Status: Planned for Phase 1A; requirements draft. Not implemented.

## Goal

Save and restore named camera viewpoints during the current browser session.

## Scope

Initial proposal: capture camera pose and projection for the current 3D view in memory. Exclude persisted bookmarks, model visibility/filter state, clipping, selection, generated plan/section view state, and sharing.

## Requirements

1. Create a named viewpoint from the current 3D camera pose and projection, list it, restore it, rename it, and delete it.
1a. Capture works in perspective and orthographic modes (pose, projection and ortho extent). Walkthrough pose is not saved: restoring a viewpoint while in walkthrough exits to orbit mode. Maximum 50 viewpoints, with a clear message at the limit.
2. Keep viewpoint identity separate from filenames and model element IDs; handle duplicate names without overwriting another viewpoint.
3. Restore only camera state and do not silently alter model visibility, selection, display rules, or source geometry.
4. Keep viewpoints in memory only and clear them on reload; do not persist camera coordinates or model-derived data.
5. Handle empty scenes and removal of the model that informed the camera target without producing invalid camera values.

## Dependencies

- [3D navigation](viewer-navigation.md), [IFC loading](ifc-loading.md), and [overall architecture](../architecture.md).
- Viewer adapter exposes a validated serializable camera-pose value without exposing mutable camera objects.

## Module Contract

- Proposed public entrypoint: `mountViewerViewpoints` under `src/features/viewer-viewpoints/`.
- Owns the in-memory viewpoint list and list UI; it requests camera capture/restore through an injected typed viewer capability.
- Disposal clears transient viewpoints and removes handlers, subscriptions, and DOM.

## Acceptance Criteria

- Save, rename, restore, and delete multiple viewpoints, including duplicate display names.
- Move the camera after saving and verify restore returns to the saved pose and projection.
- Change visibility or selection before restoring and verify those states are not unexpectedly changed.
- Remove models or clear the scene and verify restore remains safe or gives a clear unavailable-state message.
- Reload and verify no viewpoint or camera state is restored.