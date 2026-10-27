# Feature: Plan Section Lines and Views

Status: Assigned to Phase 1B, dependent on plan-view feasibility. Governed by the [Unattended Execution Policy](../plans/Phase_1_MVP.md#unattended-execution-policy); a failure is a non-blocking no-go. Requirements draft; not implemented.

## Goal

Place section markers in a plan and open their corresponding 2D architectural section drawings.

## Scope

Phase 1B candidate: a plan-placed section line and a linked generated orthographic 2D section view. Implement only after plan-view acceptance and the `1B_04` section feasibility pass; a failure is a non-blocking no-go. Exclude editing section drawings, dimensions/annotations, and substituting a live 3D clipping view for the drawing.

## Requirements

1. Let users place a section marker using two plan points; display its direction and section-view identity in the plan.
2. Define section direction, depth/range, and vertical extent; provide understandable defaults and controls before generating the view.
3. Generate section linework from the supported IFC geometry and open the corresponding orthographic section view when the marker is activated.
4. Preserve a clear link between marker and view so users can return to the originating plan and identify which marker produced the view.
5. Keep markers and generated linework session-local; changing or removing source models invalidates affected views safely.
6. If geometry cannot support a reliable 2D section, report the limitation rather than present an incomplete view as a complete architectural section.

## Dependencies

- [2D plan view](plan-view.md), [IFC loading](ifc-loading.md), and [overall architecture](../architecture.md).
- Requires geometry/placement queries and a viewer contract for 2D orthographic linework; distinct from [3D section and clipping](section-clipping.md).
- The assessed That Open drawing APIs support generated projections and multiple viewports but do not provide the required built-in plan section marker to linked section-view workflow; that relationship would be custom application behavior.

## Module Contract

- Proposed public entrypoint: `mountPlanSectionViews` under `src/features/plan-section-views/`.
- Owns section-marker UI, transient marker/view linkage, and navigation between plan and section. Generated geometry and camera state remain adapter-owned.
- Disposal clears temporary markers/views owned by the feature and removes subscriptions and UI.

## Acceptance Criteria

- Place a section line on a known plan, open its corresponding section, and verify direction, position, and extents against synthetic geometry.
- Navigate from the section view back to the correct plan and marker.
- Create multiple markers and verify each opens the correct section.
- Remove or hide source model geometry and verify affected views are invalidated or updated without stale data.
- Test unsupported geometry and verify the feature reports an explicit limitation instead of a misleading complete drawing.

## Phase 1B Feasibility Gate

Implementation depends on the [plan-view Phase 1B feasibility gate](plan-view.md#phase-1b-feasibility-gate) establishing reliable IFC-derived linework. The assessment must also demonstrate marker placement/orientation, view-range semantics, generated section output, marker-to-view navigation/linkage, and invalidation when source models change. Proceed only after a go decision. A 3D clipping plane is not an acceptable substitute.