# Feature: Model Controls

Status: Implemented locally; unit and Chrome browser tests cover model identity, visibility, removal, cleanup ownership, and reopening. Live deployment verification remains pending.

## Goal

Manage each loaded model independently in a shared scene.

## Scope

Include a collapsible model list, per-model visibility, removal, and cleanup. Exclude element-level controls, model editing, saved projects, and alignment.

## Requirements

1. List each successfully loaded model with its display name and an unambiguous session-local distinction when display names repeat.
2. Provide independent hide/show controls bound to model identities, not filenames. Hiding must retain the model in memory for showing again.
3. Provide a remove control that unregisters the model and releases its owned engine and rendering resources without affecting other models or shared resources still in use.
4. Remove all references that would keep a removed model active in rendering, model controls, or future camera fitting.
5. Allow a removed file to be reopened as a new model instance. After removing the last model, present a usable empty state.
6. Provide a keyboard-accessible models-panel toggle in the header, with an action tooltip, accessible name, `aria-controls`, and current `aria-expanded` state. The panel starts expanded; its collapse state is not persisted.
7. Collapsing the panel must reclaim its width for the 3D viewport without unloading models or changing visibility. The canvas must resize to the available space, and hidden model controls must leave the keyboard focus order.
8. Keep the application chrome compact: a 44px header and 24px footer, retaining the file-open action, loading status, and model summary without overlap at desktop and narrow viewport sizes.

## Dependencies

- [Overall architecture](../../Readme.md) and [POC scope and browser targets](../plans/Phase_0_POC_Viewer.md).
- [IFC loading](ifc-loading.md), model registry, engine adapter, and rendering controller.
- [3D navigation](viewer-navigation.md) must use current model visibility and lifecycle state.

## Module Contract

- Public entrypoint: `mountModelControls` in [src/features/model-controls/index.ts](../../src/features/model-controls/index.ts).
- Owns the list rows, model summary heading, per-model action handlers, panel-toggle UI/state, and model-list subscription. Requires read-only session summaries and toggle/remove commands; layout collapse is requested through an injected callback.
- Disposing removes row/toggle handlers and the session subscription, clears owned DOM, and resets layout collapse without unloading another feature's resources. Asset disposal remains the session's responsibility.

## Acceptance Criteria

- Load two models with identical filenames and toggle each independently without affecting the other.
- Hide and show a model without reparsing its file.
- Remove one model and verify its registry entry and owned resources are released while the other remains usable.
- Confirm removed models do not affect fit view; reopen a removed file successfully.
- Remove all models, then load another file without refreshing the application.
- Collapse and expand the panel using the mouse and keyboard; verify accessible state, unchanged loaded models/visibility, and canvas resizing in both directions.
- At desktop and narrow viewport sizes, verify the 44px header and 24px footer, no horizontal overflow or overlapping controls, and visible model rendering with the panel expanded and collapsed.