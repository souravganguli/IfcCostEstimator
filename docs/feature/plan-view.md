# Feature: 2D Architectural Plan View

Status: Assigned to Phase 1B. User-approved **Go** to build linework from the app's in-app triangle geometry (no That Open / Fragments); see the [research recommendation](../research/phase-1-viewer-market-research.md#phase-1b-drawing-gono-go-recommendation-pre-run) and the [Unattended Execution Policy](../plans/Phase_1_MVP.md#unattended-execution-policy). Requirements draft; not implemented.

## Goal

Generate and view an IFC-derived architectural floor plan as a 2D drawing, not merely a top-down 3D camera view.

## Scope

Phase 1B candidate: select an IFC building storey and generate orthographic plan linework using a configurable cut height, produced from the app's existing in-app triangle geometry (no Fragments dependency; see the research recommendation). Implement only after the `1B_02` feasibility acceptance passes; a failure is a non-blocking no-go. Exclude authoring/editing IFC, dimensions, annotations, and claims of full Revit drawing fidelity.

## Requirements

1. Offer a plan view for supported IFC storeys and identify the selected model/storey; clearly report when usable storey structure is absent.
2. Generate 2D plan representation from supported IFC geometry and preserve the source models' authored relative placement.
3. Provide a documented default cut height and an adjustable cut-height control; distinguish cut geometry from projection beyond/under the cut plane.
3a. Cut height is relative to the storey elevation (default 1.2 m). Elements without a storey appear in a separate "unassigned" group; storeys are listed per model.
4. Respect model visibility and hierarchy hides (hidden elements are not drawn), and provide a clear return to 3D without changing model state or camera placement in the 3D scene.
5. Define linework, hidden geometry, openings, and unsupported geometry behavior before claiming drawing accuracy; keep all derived linework in memory.

## Dependencies

- [IFC loading](ifc-loading.md), [model controls](model-controls.md), [3D navigation](viewer-navigation.md), and [overall architecture](../architecture.md).
- Requires adapter access to storeys, geometry, placement, and units, plus a rendering capability for a distinct 2D orthographic plan surface.
- Feasibility reference: That Open's MIT-licensed `EdgeProjector`/`TechnicalDrawing` can generate browser-side visible/hidden line projections from Fragments model items. It is not a drop-in for this app's current IFC adapter; assess model conversion/identity mapping, workers/assets, performance, and linework quality before selecting an implementation.

## Module Contract

- Proposed public entrypoint: `mountPlanView` under `src/features/plan-view/`.
- Owns plan mode controls and transient selected-storey/cut-height UI state. IFC data comes through the adapter; plan rendering remains behind a viewer contract.
- Disposal leaves the shared 3D scene and loaded models intact and releases generated linework references.

## Acceptance Criteria

- Generate a plan from a representative multi-storey IFC and verify storey selection and cut-height behavior.
- Verify the plan is visually distinct from a top-down 3D camera view and does not move authored model geometry.
- Hide a model or switch storeys and verify linework reflects current state.
- Test missing storey relations, unsupported geometry, and empty models with clear recoverable feedback.
- Verify switching between plan and 3D does not reload models or lose unrelated visibility state.

## Phase 1B Feasibility Gate

Before implementation, test a bounded prototype against the authored IFC fixture and the committed synthetic multi-storey fixtures. Record supported storey relationships, cut/projection behavior, visible/hidden line quality, and source geometry edge cases from the in-app mesh/cut-plane approach. Proceed on a passing prototype; if drawing quality is not acceptable, record a non-blocking no-go and skip the feature per the [Unattended Execution Policy](../plans/Phase_1_MVP.md#unattended-execution-policy). Do not substitute a top-down 3D camera view.