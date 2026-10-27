# Cross-Cutting Contracts

Status: Approved planning baseline. These decisions apply to every Phase 1 feature (1A, 1B, 1C). Feature specs reference this document instead of redefining these rules.

## 1. Property Value and Predicate Contract

One typed contract is shared by [Model filtering](model-filtering.md), [Model search](model-search.md), [Property coloring](property-coloring.md) and [Cost breakdown mapping](cost-breakdown-mapping.md) rules.

- **Field identity:** `PsetName.PropName` (for quantities `QsetName.QuantityName`), plus built-in fields (IFC class, name, GlobalId, type name, storey, material, classification reference). Names may collide across property sets, so a bare property name is never a field.
- **Value types:** text, number (with unit when the IFC value carries one), boolean, enumeration, list, and explicit `unset` (IFC null/`$`) distinct from `missing` (property absent).
- **Operators:** equals, in-list (OR), contains (case-insensitive, Unicode case folding), numeric range, exists, missing. Conditions combine with AND inside a rule; rule semantics (OR/first-match) are defined by each feature.
- Type mismatches (for example a numeric range on text) never match and are reported as "unsupported value" counts, never as zero or empty.
- The contract is implemented once behind the IFC adapter and reused; features do not implement their own matching.

## 2. Property Coverage

- Phase 1A adapter exposes occurrence-level and type-level (`IfcRelDefinesByType`) `IfcPropertySet` and `IfcElementQuantity` data, materials, classification references, basic identity, class, name and spatial location.
- IFC2x3 `BaseQuantities` and IFC4 `Qto_*` names are both recognised. Fields are exposed through the shared `PsetName.PropName` and `QsetName.QuantityName` identities.

## 3. Input Arbitration

- One active pointer tool at a time (select, measure, zoom-window, clip-plane edit, walkthrough). Starting a tool cancels the previous one.
- **Escape unwinds one level per press:** active tool (measure, zoom-window, clip edit) first, then walkthrough/pointer lock, then selection.
- Pointer lock requires a user gesture; losing focus or lock stops all movement.

## 4. Layout and Accessibility

- Minimum supported desktop viewport 1280x720 on desktop Chrome. This is a hard minimum: below it the layout does not reflow or stack and the viewport scrolls instead. Mobile and narrow layouts are not supported.
- Feature UIs live in the left models sidebar and a right-side `feature-dock` region, with overlays (view cube, minimap) in reserved viewport corners; the layout scaffold is produced in gate 1A_01 before feature UI is added.
- Every control is keyboard reachable, has an accessible name, and has a visible focus state; text from IFC files is rendered as text only.

## 5. Coordinate and View Conventions

- IFC is Z-up; the viewer scene is Y-up. The `web-ifc` geometry extraction already emits Y-up geometry (the IFC Z height becomes scene Y), so the IFC adapter performs no additional rotation; a test asserts this (an authored Z-extruded solid measures its height on scene Y). Any future axis handling stays inside the IFC/viewer adapters.
- Standard views are project-north based and expressed in scene (Y-up) axes: Top looks down -Y, Front looks along +Z toward -Z, Side looks along +X. Models without a project north use the scene world axes. The adapter maps these to the IFC source orientation.
- Display and takeoff units are metric. Source units that are not metric are converted (section 7).

## 6. Fixtures

Gate 1A_01 authors small synthetic IFC fixtures (committed, no third-party data): duplicate express IDs across two models, multi-storey, metre/millimetre/unknown length units, missing/malformed spatial relations, populated and empty property and quantity sets (IFC4 and IFC2x3 naming), and aggregate parent/child elements. The local Duplex files remain optional; their absence is a skip. See [test-fixtures.md](../test-fixtures.md).

## 7. Metric Normalization

- All derived quantities, rates and costs use metric units: m, m², m³, kg, count (ea). Source values in other units (mm, cm, ft, in, ft², ft³, lb and similar) are converted using exact factors; the original value and unit are retained for display and export.
- Unit labels are normalised (`m2`, `m²`, `sqm` are one unit). A rate whose unit cannot be reconciled with its quantity kind is flagged and excluded from totals, never silently zeroed.
- Models with unknown length units are labelled unknown, not assumed metric; their derived quantities are flagged "unit unknown" and excluded from totals until the user assigns a unit for that model in-session.

## 8. Numeric Defaults (confirmed)

Search result page 100; walkthrough eye height 1.7 m and speed 3 m/s with a user setting; maximum 50 viewpoints and 50 colour rules per session; measurement snapping tolerance 10 screen pixels, display precision 3 decimals; plan-view default cut height 1.2 m above storey elevation.

## 9. Unsaved Work

Estimate data (1C) is lost on reload and discarded for a removed model's manual assignments. The app warns before reload (`beforeunload`) when estimate data exists and has changed since the last file export, and asks before removing a model that holds manual assignments.
