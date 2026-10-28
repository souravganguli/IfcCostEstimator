# Feature: Element Properties

Status: Implemented locally with selection-driven, categorized property inspection in a scrollable, right-side pane that can be resized or closed independently of the left tool pane. Pane interactions are verified in Chrome E2E; deployed verification remains pending.

## Goal

Inspect the IFC properties of the currently selected model element.

## Scope

Include read-only IFC property-set and quantity-set inspection for one selected element. Present the inspector as a categorized, scrollable, independently shown/hidden pane fixed to the right of the viewport and resizable within bounded widths. A close control lets users reclaim viewport space. Exclude left docking, calculated or aggregated quantity takeoff (covered by [Quantity takeoff](quantity-takeoff.md) in Phase 1C), editing, property authoring, bulk comparison, and persistence.

## Requirements

1. Show the selected element's IFC identity, type, name, and available property and quantity sets, clearly labeling quantity data as source-provided IFC quantities rather than a calculated takeoff.
2. Display property names and values without silently dropping units, enumerations, or IFC null/unset states; safely render untrusted text as text.
3. Identify the owning loaded model when different models contain the same express ID.
4. Update when selection changes and show a useful empty state when no element is selected or no properties are available.
5. Keep all parsed property data in memory and request it through a typed adapter capability, not direct `web-ifc` imports from the feature.
6. Group identity and property/quantity values into collapsible categories; display each property as a readable name/value row and preserve units, enumerations, and unset states.
7. Let the user independently show or hide the property pane with its rail toggle or close control; keep it on the right side of the viewport, separate from the left tool pane. Its close control must reclaim space for the viewport without closing the left pane.
8. Resize the property pane with a pointer divider or keyboard. Width is bounded between 260px and 560px; left tool-pane width is independently resizable between 240px and 520px. Widths are session-local and are not persisted.
9. Resizing, hiding, or showing the property pane must preserve selection, model visibility, camera pose, and property content.

## Dependencies

- [Element selection](element-selection.md), [IFC loading](ifc-loading.md), and [overall architecture](../architecture.md).
- IFC adapter must expose `IfcPropertySet` and `IfcElementQuantity` data keyed by model-scoped element identity, with lazy retrieval considered for large models. Do not calculate, aggregate, or export quantities.

## Module Contract

- Proposed public entrypoint: `mountElementProperties` under `src/features/element-properties/`.
- Owns categorized property rendering and the selection/session subscriptions. The application shell owns dock position, visibility, and resizing; the adapter owns parsing/query handles; the feature owns no parser state.
- Disposal removes DOM and subscriptions and releases references to the last property result.

## Acceptance Criteria

- Select elements with populated, empty, missing property values and source-provided quantity sets; verify each state is distinguishable and quantities are not calculated or aggregated.
- Select equal express IDs from different models and verify properties come from the selected model.
- Change and clear selection; verify stale values are not shown.
- Verify long/untrusted property text renders safely and does not create markup or escape the panel.
- Verify the feature uses only the public property-query contract and releases its subscription on disposal.
- Verify category expansion/collapse, readable value rows, empty/unset values, and safe rendering of untrusted text.
- Verify the pane stays to the right of the viewport and is a sibling of the left tool pane; it must never move into the left pane.
- Open and close the property pane while the left tool pane is both open and closed. Verify its close control reclaims viewport space without changing left-pane visibility or selection.
- Resize with pointer and keyboard to both bounds, and verify selection, camera, model visibility, and values remain unchanged.