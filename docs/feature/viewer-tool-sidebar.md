# Feature: Viewer Tool Sidebar

Status: Implemented locally with an ACC-inspired vertical tool rail and expandable contextual pane. Core navigation and pane interactions are verified in Chrome E2E; deployed verification remains pending.

## Goal

Give the viewer a compact, discoverable tool rail that opens task-oriented side panes without covering model geometry.

## Scope

Include a thin top application ribbon for opening IFC files, viewing Properties, and accessing Settings, alongside a persistent vertical icon rail, one expandable left tool pane, and a separate right-side property pane. Include grouped access to the viewer's model and analysis tools, active-tool indication, and close/reopen interactions. Icons use the project's installed icon library; Autodesk branding and proprietary artwork are not used. Exclude ACC integration, copied product assets, and remote model services.

## Requirements

1. Keep a narrow, persistent tool rail at the left edge of the workspace while the side pane is open or closed.
2. Provide labeled, keyboard-accessible controls for Model browser, Levels and hierarchy, Element properties, Viewpoints, Search and filter, Appearance, Measurement, Section clipping, Quantity takeoff, Cost estimate, and Plan and section drawings. First person is a viewport floating-toolbar toggle rather than a rail pane.
3. Selecting a tool opens its contextual side pane, updates a visible pane title, and marks the active rail control using an accessible pressed/current state.
4. Selecting the active rail control or the pane close button closes the pane; selecting another rail control switches panes and reopens it.
5. Closing the pane returns its width to the 3D viewport without unloading models, changing model visibility, resetting feature state, or changing the camera.
6. Preserve the existing model-list collapse control and ensure it does not remove access to the persistent rail.
7. Keep pane content scrollable at the supported minimum viewport; it must not cover the canvas or cause horizontal overflow.
8. Tool content remains owned by its feature module. The shell only selects which feature group is visible and does not duplicate feature state or behavior.
9. Keep the tool pane and property pane independently resizable using bounded pointer and keyboard controls; resizing one must not change the other pane's configured width.
10. Keep the property pane on the right side of the viewport and outside the left tool pane. Its close control must return its width to the viewport without closing the left pane. Pane visibility and resizing do not persist model-derived state.
11. Keep the top ribbon at 22px high and available above the workspace. Its Open action uses the local IFC file picker, View > Properties toggles the right-side property pane, and Settings exposes the existing viewer preferences. Ribbon actions and their corresponding rail/pane controls stay synchronized.

## Dependencies

- [Overall architecture](../architecture.md), [Fluent 2 Design System](fluent2-design-system.md), [Model controls](model-controls.md), [3D navigation](viewer-navigation.md), and the feature specifications for the tools exposed in the rail.

## Module Contract

- The application shell owns rail selection, pane visibility, labels, and layout.
- Tool feature modules mount into their own pane content slots and retain responsibility for state, subscriptions, and disposal.
- Pane switching does not dispose features or clear transient state.

## Acceptance Criteria

- Open and close the pane with the rail; switch among several tools and verify the correct content and active state are shown.
- Use keyboard focus and activation on rail items and the close button; verify accessible names and pressed states.
- Load a model, switch panes, close/reopen the side pane, and verify model state, visibility, selection, and camera remain unchanged.
- At 1280x720 and a larger desktop viewport, verify the rail remains visible, pane content scrolls, and no horizontal overflow occurs.
- Confirm each tool panel is mounted only once and remains disposable through the feature lifecycle.
- Verify the ribbon/header is 22px high, Open launches the existing local file picker, View > Properties opens/closes the right pane, and Settings exposes the grid preference without changing the viewer layout.
