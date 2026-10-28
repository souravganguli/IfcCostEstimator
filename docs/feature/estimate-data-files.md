# Estimate Data Files (Import and Export)

Status: In progress (local implementation; acceptance and deployed verification outstanding). Assigned to Phase 1C in [Phase 1 MVP](../plans/Phase_1_MVP.md). Market basis: [Phase 1C research](../research/phase-1c-cost-estimation-market-research.md).

## Goal

Let users save and reload their CBS, mapping rules, unit rates and assemblies as local files, since the app itself never persists them.

## Scope

- Export and import a versioned estimate-definition file in JSON, plus CSV import/export for rates and CBS. It contains the CBS, mapping rules, rates, assemblies, currency label and units, not model data.
- Manual element assignments are stored by model-disambiguated identity (GlobalId plus model name and load order); GlobalId may be missing or duplicated, so unmatched or ambiguous identities are reported on import. Rules referencing fields absent from the loaded models are kept and flagged "no matches". Import with no model loaded is allowed and rules evaluate once models load.
- The app warns before reload when estimate data has changed since the last export (see [cross-cutting contracts](cross-cutting-contracts.md)).
- Import is validated against a schema; invalid or unsupported-version files are rejected with an error and leave current state unchanged.

## Requirements

- Files are read and written by explicit user action through local file picker and download only. No upload, no storage in IndexedDB/OPFS or Web Storage.
- Imported text is treated as data; no formula or script is ever executed, and spreadsheet-injection prefixes are neutralised in any CSV or workbook output.
- Model data and IFC contents are never included.

## Dependencies

[Cost breakdown and mapping](cost-breakdown-mapping.md), [Unit rates and costing](unit-rates-costing.md).

## Acceptance Criteria

- Export followed by import restores identical definitions (round-trip test).
- Malformed, oversized and wrong-version files are rejected without changing state.
- Unmatched GlobalIds are reported. No network or storage writes occur.
