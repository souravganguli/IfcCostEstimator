# Feature: Element Properties

Status: Planned for Phase 1A; requirements draft. Not implemented.

## Goal

Inspect the IFC properties of the currently selected model element.

## Scope

Include read-only IFC property-set and quantity-set inspection for one selected element. Exclude calculated or aggregated quantity takeoff (covered by [Quantity takeoff](quantity-takeoff.md) in Phase 1C), editing, property authoring, bulk comparison, and persistence.

## Requirements

1. Show the selected element's IFC identity, type, name, and available property and quantity sets, clearly labeling quantity data as source-provided IFC quantities rather than a calculated takeoff.
2. Display property names and values without silently dropping units, enumerations, or IFC null/unset states; safely render untrusted text as text.
3. Identify the owning loaded model when different models contain the same express ID.
4. Update when selection changes and show a useful empty state when no element is selected or no properties are available.
5. Keep all parsed property data in memory and request it through a typed adapter capability, not direct `web-ifc` imports from the feature.

## Dependencies

- [Element selection](element-selection.md), [IFC loading](ifc-loading.md), and [overall architecture](../architecture.md).
- IFC adapter must expose `IfcPropertySet` and `IfcElementQuantity` data keyed by model-scoped element identity, with lazy retrieval considered for large models. Do not calculate, aggregate, or export quantities.

## Module Contract

- Proposed public entrypoint: `mountElementProperties` under `src/features/element-properties/`.
- Owns the property panel, rendering of returned values, and selection subscription. The adapter owns parsing/query handles; the feature owns no parser state.
- Disposal removes DOM and subscriptions and releases references to the last property result.

## Acceptance Criteria

- Select elements with populated, empty, missing property values and source-provided quantity sets; verify each state is distinguishable and quantities are not calculated or aggregated.
- Select equal express IDs from different models and verify properties come from the selected model.
- Change and clear selection; verify stale values are not shown.
- Verify long/untrusted property text renders safely and does not create markup or escape the panel.
- Verify the feature uses only the public property-query contract and releases its subscription on disposal.