# Feature: Rule-Based Property Coloring

Status: In progress (local implementation; acceptance and deployed verification outstanding) for Phase 1A; requirements draft. Not implemented.

## Goal

Color IFC elements according to user-defined rules over one or multiple IFC properties.

## Scope

Initial proposal: ordered rules, AND between conditions within a rule, and first matching rule wins. Include exact-value and numeric-range conditions where the IFC value type permits. Exclude model-data editing, saved rules, and remote sharing.

## Requirements

1. Let users create, edit, reorder, enable/disable, and remove rules; each rule has one or more property conditions and a color swatch.
2. Match all conditions within a rule using AND; evaluate enabled rules in order and apply the first matching rule.
3. Define behavior for missing/unset values, unsupported types, and unmatched elements; never silently treat missing as an arbitrary value.
4. Apply colors to model-scoped elements without changing IFC properties. Selection highlighting has visual priority over rule colors; clearing selection restores the matching rule color. Display modes must not obscure the selection highlight.
4a. Unmatched elements keep their original colour. Rules apply to all loaded models. A rule colour is combined with the model's opacity and also applies to wireframe edges in wireframe mode. Rule count is limited to 50.
5. Provide clear/reset behavior, show which rule matched when an element is inspected, and keep rules and derived colors in memory only.

## Dependencies

- [Element properties](element-properties.md), [Element selection](element-selection.md), [IFC loading](ifc-loading.md), and [overall architecture](../architecture.md).
- IFC adapter supplies typed property values; viewer adapter applies/reverts per-element display colors while respecting shared resources.

## Module Contract

- Proposed public entrypoint: `mountPropertyColoring` under `src/features/property-coloring/`.
- Owns ordered rule definitions and rule UI for the current browser session. It does not own property parsing or mutable render objects.
- Disposal removes applied colors, subscriptions, and UI; it does not persist rules.

## Acceptance Criteria

- Apply one-condition and multi-condition rules and verify AND matching and first-match precedence.
- Test numeric, string, enumeration, missing, and unsupported property values.
- Reorder, disable, and remove rules; verify colors update and reset correctly.
- Select a colored element and verify selection highlighting takes priority; clear selection and verify its rule color returns and the matching rule remains identifiable.
- Reload or dispose the feature and verify no rule or derived color is persisted or leaked.