# Cost Breakdown Structure and Element Mapping

Status: Draft. Assigned to Phase 1C in [Phase 1 MVP](../plans/Phase_1_MVP.md). Market basis: [Phase 1C research](../research/phase-1c-cost-estimation-market-research.md).

## Goal

Let users define a hierarchical cost breakdown structure (CBS) and map physical IFC items to its cost items, including location-based breakdown.

## Scope

- A user-defined, hierarchical CBS (code, name, parent) built in-session or imported through [Estimate data files](estimate-data-files.md). Classification-style codes (for example UniFormat, MasterFormat, Uniclass) are user data; none are bundled.
- Mapping is primarily rule based, using the shared predicate contract in [cross-cutting contracts](cross-cutting-contracts.md) over IFC class, type, property values or classification references, with the same rule-builder behavior as [Model search](model-search.md) and [Model filtering](model-filtering.md).
- Many-to-many: an element may be mapped to several CBS items (for example wall to masonry, plaster and paint). The initial implementation has no quantity-share allocation: each mapping is represented as mapped or unmapped, and the full applicable quantity is shown for each mapped item. The UI visibly warns when one element is mapped to multiple CBS items so users understand that grouped totals may intentionally repeat the source quantity. All matching rules apply (there is no first-match-wins); rule order only affects display.
- Manual assignment is also supported: assign the current selection, a search/filter result set or a takeoff group row. Manual assignments are always visibly marked in the UI (badge on the element, mapping row and CBS item), listed separately, and can be reviewed and cleared. Manual assignments override rule mappings for the same element and CBS item and are marked as overrides.
- Location breakdown: a grouping dimension based on the IFC spatial hierarchy (site, building, storey) from [Model hierarchy](model-hierarchy.md), available as a takeoff and cost grouping.
- Unmapped elements are listed and counted; they are never silently dropped.

## Requirements

- Mappings reference model-scoped element identities. Rules re-evaluate when models change; manual assignments for removed models are discarded.
- A mapped item draws its quantity from a chosen quantity kind of [Quantity takeoff](quantity-takeoff.md).
- Aggregate parents and their children are never both counted for the same quantity: the user chooses the counting level per rule (parent or children), with a visible warning when both are mapped.
- Removing a model asks for confirmation when it holds manual assignments.
- Mapping data lives in memory and is persisted only by explicit user export.

## Dependencies

[Quantity takeoff](quantity-takeoff.md), [Model filtering](model-filtering.md), [Model hierarchy](model-hierarchy.md).

## Acceptance Criteria

- Rules and manual assignments produce the expected CBS totals on the authored fixture; unmapped elements are reported.
- Rule order and manual-over-rule precedence are verified by tests.
- Removing a model updates mappings and totals and releases owned resources.
- Chrome checks cover CBS editing, rule evaluation and selecting mapped elements.
