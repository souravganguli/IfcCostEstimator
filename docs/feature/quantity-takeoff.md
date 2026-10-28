# Quantity Takeoff

Status: In progress (local implementation; acceptance and deployed verification outstanding). Assigned to Phase 1C in [Phase 1 MVP](../plans/Phase_1_MVP.md). Market basis: [Phase 1C research](../research/phase-1c-cost-estimation-market-research.md).

## Goal

Aggregate element quantities from loaded IFC models into grouped takeoff tables that feed cost mapping and export.

## Scope

- Source quantities are the read-only IFC quantity sets exposed by [Element properties](element-properties.md) (IFC4 `Qto_*BaseQuantities`, IFC2x3 `BaseQuantities`, other `IfcElementQuantity` data), with a documented per-class quantity-kind table (for example net vs gross volume, net side area).
- Geometry-derived fallback: when an element lacks the needed IFC quantity, volume and surface area may be computed from its tessellated geometry. Such values are always labelled "geometry-derived (approximate)", reported separately from source-provided values, never summed silently with them, and included in totals only when the user enables the fallback. Mesh quality limits (open or non-manifold meshes) are reported per element, and the fallback is validated against known fixture solids before use.
- Metric normalization follows [cross-cutting contracts](cross-cutting-contracts.md); elements are included regardless of viewer visibility unless the user scopes the takeoff to visible models.
- Group by user-chosen properties (IFC class, type name, storey, material, classification reference, any property-set value), with sums and element counts per group and per quantity kind (count, length, area, volume, weight).
- Scope the takeoff to all visible models, a chosen model, or the current [filter](model-filtering.md) result.
- Selecting a group row selects/highlights its elements through [Element selection](element-selection.md).

## Requirements

- Every row is traceable to model-scoped element identities (model id plus express ID); duplicate express IDs across models never merge.
- Elements lacking the requested quantity are counted and listed as "missing quantity", never treated as zero.
- Units are converted to metric per [cross-cutting contracts](cross-cutting-contracts.md); if the model unit is unavailable, label it "unknown" and exclude it from totals until the user assigns a unit in-session.
- Net and gross quantities are separate quantity kinds and are never summed together.
- Results are derived in memory and are recomputed when models are added or removed. Nothing is persisted.

## Dependencies

[Element properties](element-properties.md), [Model filtering](model-filtering.md), [Large-model performance](large-model-performance.md) (aggregation must not block the UI on large models).

## Module Contract

Feature module under `src/features/`, reading model data only through the IFC adapter's property/quantity queries; exposes a takeoff result model consumed by [Cost breakdown and mapping](cost-breakdown-mapping.md).

## Acceptance Criteria

- Totals on the authored fixture match hand-computed values; the local Duplex fixture reports missing quantities explicitly (skipped when the fixture is absent).
- Group totals equal the sum of their element quantities; missing-quantity elements are listed.
- Model removal updates or clears all groups and releases owned resources.
- Unit tests cover grouping, units, missing data and identity isolation; Chrome checks cover table rendering and row-to-selection behavior.
