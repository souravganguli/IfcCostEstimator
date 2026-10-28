# Feature: First-Person Walkthrough

Status: In progress (local implementation; acceptance and deployed verification outstanding) for Phase 1A; requirements draft. Not implemented.

## Goal

Navigate the loaded model at eye level using familiar first-person movement and look controls.

## Scope

Include a switchable first-person mode, keyboard movement, and mouse look. Initial proposal uses constant eye height and no guaranteed wall/object collision or stair traversal. Exclude BIM authoring and physical simulation.

## Requirements

1. Provide explicit enter/exit controls; entering and exiting must preserve loaded models and their authored coordinates.
1a. Entry starts at the current camera's ground projection at eye height 1.7 m (user adjustable). Exit, including Escape, restores the exact previous orbit camera. Controls: W/A/S/D move, arrow keys or mouse look, Shift to run; default speed 3 m/s.
2. Support keyboard movement and mouse look with a visible control state. Pointer lock, if used, requires a user gesture and Escape or an explicit command must exit the mode.
3. Keep movement speed bounded and camera values finite; looking direction changes view orientation without unintentionally changing horizontal movement direction.
4. The initial version does not promise collision detection, floor finding, or stair navigation; communicate this limitation and prevent movement controls from trapping users.
5. Handle empty scenes, model removal, viewport resize, keyboard focus loss, and pointer-lock loss without leaving movement active.

## Dependencies

- [3D navigation](viewer-navigation.md), [IFC loading](ifc-loading.md), and [overall architecture](../architecture.md).
- Viewer adapter exposes camera pose, movement, mode switching, and lifecycle commands. The minimap consumes pose via a separate read-only contract.

## Module Contract

- Proposed public entrypoint: `mountFirstPersonWalkthrough` under `src/features/first-person-walkthrough/`.
- Owns mode controls and keyboard/pointer event subscriptions; the viewer adapter owns the camera and render loop.
- Disposal exits first-person mode and releases pointer lock and all input listeners.

## Acceptance Criteria

- Enter walkthrough, move in each supported direction, look around, and exit without changing model placement.
- Verify pointer lock is never requested without a user gesture and Escape reliably exits it.
- Verify no movement occurs after focus or pointer lock is lost and no unbounded camera values result.
- Remove all models or resize the viewport during walkthrough and verify the mode remains recoverable.
- Verify the documented no-collision/no-stair guarantee matches observed behavior.