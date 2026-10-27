# Feature: Element Selection

Status: Planned for Phase 1A; requirements draft. Not implemented.

## Goal

Select and visibly identify an IFC element in the shared model scene.

## Scope

Include pointer-based single selection, a clear-selection action, and a visible selected state. Use model-scoped IFC element identity. Exclude multi-selection, model editing, and selection persistence in the initial scope.

## Requirements

1. Selecting visible geometry identifies its owning model and IFC element; express IDs must never be treated as globally unique across loaded models.
1a. Picking follows what is rendered: all rendered geometry is pickable, including transparent and wireframe-mode geometry and `IfcSpace`/opening geometry when rendered. Transparent geometry remains pickable at any opacity above zero. Hidden elements are reached through the hierarchy tree, search or filter. Geometry removed visually by a [clipping](section-clipping.md) plane remains available through separate pick geometry; cap faces and clipped-away geometry pick the owning element. Clipping never exposes geometry from a different model.
2. Highlight the selected element without mutating its IFC data or permanently changing its source material.
3. Selecting another element replaces the current selection. Clicking empty scene space or pressing Escape clears it.
4. Hiding a model may retain its selection but must not present it as visible; removing its model clears that model's selection.
5. Selection state must be observable through an explicit typed capability so property inspection, search, filtering, and hierarchy features can act on the same selected element without reaching into feature internals.

## Dependencies

- [Overall architecture](../architecture.md), [IFC loading](ifc-loading.md), and [model controls](model-controls.md).
- IFC adapter must provide a stable mapping from rendered geometry to `(modelId, expressId)`; the feature must not import `web-ifc` directly.
- Viewer adapter must provide a selection/highlight command and cleanup-safe ownership of temporary highlight resources.

## Module Contract

- Proposed public entrypoint: `mountElementSelection` under `src/features/element-selection/`.
- Owns selection input handling and selection feedback UI; selection identity is shared through a typed application contract, while render objects and highlight resources remain adapter-owned.
- Disposing removes handlers, subscriptions, and owned UI and clears only feature-owned transient selection effects.

## Acceptance Criteria

- Select elements in two loaded models that reuse the same express ID and verify the correct model/element is selected independently.
- Select a second element, click empty space, and press Escape; verify replacement and clearing behavior.
- Hide a selected model and remove it; verify the selection is accurately represented and then cleared on removal.
- Verify highlighting does not change source IFC data or remain after clearing, removal, or feature disposal.
- Verify selection can be observed through the public contract without exposing renderer or parser internals.