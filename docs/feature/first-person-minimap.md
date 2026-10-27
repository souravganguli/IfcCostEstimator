# Feature: First-Person Minimap

Status: Planned for Phase 1A; requirements draft. Not implemented.

## Goal

Show the user's position and heading in a compact map while navigating in first-person mode.

## Scope

Include a display-only side minimap using an independent simplified footprint derived from the relevant loaded model geometry. It must not depend on the deferred 2D plan-view feature. Exclude click-to-teleport, level switching, route planning, and a second full interactive viewer.

## Requirements

1. Show a compact simplified model footprint with a camera-position marker and heading indicator while first-person mode is active.
2. Keep the map synchronized with camera movement and show the footprint of the storey containing the camera (determined from camera elevation against storey elevations across visible models, with the storey label shown), retaining authored model coordinates. When no storey structure exists, fall back to a combined top-down footprint of all visible geometry and label it as such.
3. Generate the footprint independently from full 2D plan-view linework. Hide or disable the map with an understandable state when model geometry cannot provide a reliable footprint; never show a misleading position.
4. Keep the overlay within the viewport, readable at supported desktop sizes, and visually subordinate to the main scene.
5. The minimap is informational only and must not change camera pose, model visibility, or plan selection.

## Dependencies

- [First-person walkthrough](first-person-walkthrough.md), [IFC loading](ifc-loading.md), and [overall architecture](../architecture.md).
- Requires a read-only camera-pose subscription and a bounded footprint projection from loaded model geometry; it does not depend on [deferred plan-view generation](plan-view.md).

## Module Contract

- Proposed public entrypoint: `mountFirstPersonMinimap` under `src/features/first-person-minimap/`.
- Owns its compact overlay and pose/context subscription; the plan and walkthrough features retain ownership of their state.
- Disposal removes the overlay and releases subscriptions and resize observers.

## Acceptance Criteria

- Move and rotate in walkthrough mode with multiple visible models and verify position and heading update correctly, and that the footprint follows the camera's storey (changes when moving between storeys) with a labelled combined fallback when no storeys exist.
- Verify it appears only in the intended mode and does not intercept navigation input.
- Test unavailable/insufficient footprint geometry and verify the map is hidden or clearly unavailable rather than inaccurate; verify it works without mounting Plan View.
- Resize the viewport and confirm the map remains compact, legible, and non-overlapping.
- Dispose the feature and verify its overlay and observers are removed.