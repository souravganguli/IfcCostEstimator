# Feature: Model Search

Status: Implemented locally with typed adapter search, bounded results, model-scoped identities, and transient UI. Browser acceptance and stale-model interaction coverage remain pending.

## Goal

Find IFC elements by human-readable or model identity data across loaded models.

## Scope

Include case-insensitive substring search across element name, GlobalId, IFC type, property names, and available property values. Exclude saved queries, fuzzy/ranked search, and search-language syntax.

## Requirements

1. Search all loaded models and report model name plus model-scoped element identity for each result.
1a. Results are grouped by model, then ordered by matched-field priority (name, GlobalId, IFC type, property), shown 100 per page with a Load more control. Results include hidden elements, flagged as hidden with an Unhide action that can unhide the full current result set.
2. Show bounded result summaries and indicate when a query has no matches; do not silently omit results without a visible limit/continuation affordance.
3. Selecting a result requests selection through the shared element-selection contract and may offer fit-to-element through an injected viewer command.
4. Clear query and results without changing model data or visibility; removal of a model removes its results.
5. Query parsed IFC metadata through the adapter's typed search capability, with cancellation or stale-result protection for rapidly changing queries.

## Dependencies

- [Element selection](element-selection.md), [Element properties](element-properties.md), [IFC loading](ifc-loading.md), and [overall architecture](../architecture.md).
- Adapter search must not treat express IDs as global IDs and should support bounded/lazy result delivery for large models.

## Module Contract

- Proposed public entrypoint: `mountModelSearch` under `src/features/model-search/`.
- Owns query input, result list, query-local state, and request cancellation. It receives search, selection, and optional fit capabilities through explicit contracts.
- Disposal cancels outstanding requests and removes handlers, subscriptions, and DOM.

## Acceptance Criteria

- Find elements by name, GlobalId, IFC type, property-set/property name, and property value.
- Verify matching is case-insensitive and spans two loaded models without identity collisions.
- Select a result and verify the corresponding element, not merely a matching express ID, is selected.
- Enter queries rapidly and verify stale responses cannot replace newer results.
- Remove a model during search and verify no stale result can select its elements.