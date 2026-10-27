# Feature: Model Measurement

Status: Planned for Phase 1A; requirements draft. Not implemented.

## Goal

Measure spatial distances on loaded model geometry.

## Scope

Initial proposal: point-to-point 3D distance and its horizontal/vertical components, with geometry snapping where reliable. Defer angle, area, volume, and saved measurement annotations pending separate priority and accuracy requirements.

## Requirements

1. Let users pick two points on visible geometry and display the 3D distance plus horizontal and vertical components.
2. Display metric: convert each model's declared length unit to metres. When units are missing or unsupported, display the measured model-coordinate value with the unit labeled "unknown" rather than assuming a unit. A measurement between points on different models is allowed only when both units are known; otherwise it is labelled unknown. Measurement uses the separate clip pick geometry, so visually clipped-away geometry remains measurable when its source mesh supports reliable picking; precision is 3 decimals.
3. Provide clear start/end/reset/cancel states and distinguish measurement overlays from model geometry.
4. Keep measurements transient and in memory; do not persist or export model-derived coordinates.
5. Identify snapping behavior and tolerance, and never imply survey-grade accuracy or fabricate precision beyond the available geometry.

## Dependencies

- [IFC loading](ifc-loading.md), [3D navigation](viewer-navigation.md), and [overall architecture](../architecture.md).
- Viewer adapter supplies ray picking, optional snapping, and an owned overlay lifecycle; unit metadata comes through the IFC adapter.

## Module Contract

- Proposed public entrypoint: `mountModelMeasurement` under `src/features/model-measurement/`.
- Owns measurement mode, picked points, labels, and transient line overlays. The adapter owns raycasting and renderer resources.
- Disposal cancels measurement mode and removes owned overlays, handlers, and subscriptions.

## Acceptance Criteria

- Measure known synthetic 3D, horizontal, and vertical distances and verify values and units within a documented tolerance.
- Test metre, millimetre, unsupported-unit, and missing-unit inputs; ensure the displayed unit is never ambiguous and unknown units are not silently treated as metres.
- Cancel, reset, hide, or remove involved geometry and verify measurement state is cleaned up safely.
- Confirm snapping behavior on known vertices and report when no reliable snap point is available.
- Verify measurement overlays are not included in model bounds, IFC data, persistence, or network requests.