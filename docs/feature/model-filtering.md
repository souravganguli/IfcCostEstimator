# Feature: Model Filtering

Status: Planned for Phase 1A; requirements draft. Not implemented.

## Goal

Narrow loaded IFC elements using explicit structured property criteria.

## Scope

Include criteria on IFC type and available property values. Default logic is AND between criteria and OR between selected values for the same criterion. Filtering is result-only and never writes visibility state. Exclude arbitrary expression languages, saved filters, and implicit changes to model visibility.

## Requirements

1. Let users add, edit, remove, and reset criteria over fields available in the loaded models.
1a. Results include hidden elements, flagged as hidden with an Unhide action that can unhide the full current result set; Filter itself still never changes visibility except through that explicit action.
2. Combine different criteria with AND; multiple chosen values within one criterion match with OR.
3. Show matching element counts and model-scoped result identities; distinguish zero matches from unavailable property data.
4. Filtering returns matching identities/counts only; it must not alter source IFC data, model visibility, hierarchy isolation, or selection unless the user explicitly selects a result. Clearing filters preserves existing visibility state.
5. Query values through the adapter's typed property capability; handle missing, unset, and differently typed values explicitly.

## Dependencies

- [Element selection](element-selection.md), [Element properties](element-properties.md), [IFC loading](ifc-loading.md), and [overall architecture](../architecture.md).
- Filter state is local to this feature and transient; no model-derived data is persisted.

## Module Contract

- Proposed public entrypoint: `mountModelFiltering` under `src/features/model-filtering/`.
- Owns criteria UI and transient filter state. It receives a typed query capability and selection command; it does not own model visibility or parser state.
- Disposal cancels queries and removes listeners, subscriptions, and DOM.

## Acceptance Criteria

- Apply one and multiple criteria and verify the documented AND/OR behavior.
- Include unset and mixed-type values and verify they are handled predictably.
- Confirm filter results do not hide elements, change hierarchy isolation, or change selection without an explicit user action; clearing filters preserves all prior visibility state.
- Reset all criteria and verify the complete result set returns.
- Remove a loaded model during filtering and verify its results are removed and query resources are released.