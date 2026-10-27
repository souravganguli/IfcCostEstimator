# Feature: Model Hierarchy

Status: Planned for Phase 1A; requirements draft. Not implemented.

## Goal

Browse IFC spatial structure and manage element visibility from a navigable tree.

## Scope

Include a model-rooted spatial hierarchy with element selection, hide/show, and isolate actions. Exclude editing IFC containment, reparenting, and authoring new groups.

## Requirements

1. Present loaded models independently, then their available project/site/building/storey/spatial containment and contained elements.
2. Use stable model-scoped element identities; duplicate names and repeated express IDs must remain distinguishable.
3. Provide expand/collapse, select, hide/show, and isolate/restore actions for supported nodes; isolation must be reversible and must not remove data. Model-level visibility is the outer visibility gate; hierarchy isolation adds a reversible element-level mask, and restoring isolation must never reveal a model hidden by Model Controls.
3a. Hidden elements and nodes remain listed in the tree with a clear hidden state (for example a dimmed row and a hidden icon with an accessible label); a node whose descendants are partly hidden shows a mixed state. Users can unhide any hidden node or element directly from the tree, and a "Show all" action restores every element hidden by the hierarchy across all models. Show all clears hierarchy hides and isolation only; it never reveals a model hidden by Model Controls. A count of hidden elements is shown, and hidden elements can be reached through tree navigation, [search](model-search.md) and [filter](model-filtering.md) results (which must indicate hidden state) so they can be selected or unhidden. Hide adds to a hidden set; isolate temporarily hides everything outside the node and restoring returns the prior hidden set unchanged; Show all clears the hidden set and any isolation.
4. Clearly handle absent, incomplete, cyclic, or unsupported spatial relationships without hanging or hiding the whole model.
5. Keep hierarchy queries behind the IFC adapter and virtualize or lazily expand large trees to avoid unbounded DOM work.

## Dependencies

- [IFC loading](ifc-loading.md), [Element selection](element-selection.md), [Model controls](model-controls.md), and [overall architecture](../architecture.md).
- Viewer visibility changes use one authoritative composed model/element visibility contract; features do not mutate scene nodes directly. Model-level visibility dominates element-level hierarchy isolation; [Filter](model-filtering.md) is non-visual and never writes to visibility.

## Module Contract

- Proposed public entrypoint: `mountModelHierarchy` under `src/features/model-hierarchy/`.
- Owns tree UI, expansion state, and tree event handlers. Model visibility and selection remain owned by their shared capabilities.
- Disposal removes subscriptions and DOM and restores only temporary isolation state owned by this feature.

## Acceptance Criteria

- Browse two models with overlapping names and express IDs and verify their tree branches remain distinct.
- Expand/collapse storeys, select an element, and verify selection targets the correct model-scoped element.
- Hide/show and isolate/restore nodes without deleting or reloading geometry.
- Hide a model in Model Controls, apply and clear hierarchy isolation, and verify the model stays hidden until its model-level visibility is explicitly restored.
- Hide several elements and nodes, verify they stay listed with a hidden state (mixed state on parents), unhide one individually, then use Show all and verify every hierarchy-hidden element returns while a model hidden in Model Controls stays hidden.
- Load a model with missing or malformed spatial relations and verify bounded, understandable fallback behavior.
- Expand a large hierarchy and verify the UI remains responsive and disposal leaves no subscriptions.