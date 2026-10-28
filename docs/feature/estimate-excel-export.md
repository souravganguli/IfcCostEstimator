# Estimate Excel Export

Status: In progress (local implementation; acceptance and deployed verification outstanding). Assigned to Phase 1C in [Phase 1 MVP](../plans/Phase_1_MVP.md). Market basis: [Phase 1C research](../research/phase-1c-cost-estimation-market-research.md).

## Goal

Export the takeoff and estimate to an Excel workbook whose costs are live cell formulas, so users can cross-check calculations manually.

## Scope

- A user-initiated `.xlsx` download generated entirely in the browser; no upload and no server.
- Sheets: takeoff (grouped quantities), element list (model, express ID, GlobalId, mapped CBS item, quantities), CBS estimate (quantity, unit, rate, markup, cost), assemblies, and a notes sheet recording units, currency label, models and generation settings.
- Cost cells are formulas referencing quantity and rate cells, and CBS totals are SUM formulas over children; inputs (quantities, rates) are plain values.
- Written files include cached values so viewers that do not recalculate still show results.

## Requirements

- Library choice is approved in principle: an open-source client-side XLSX writer bundled same-origin. Licence, formula support, bundle size and maintenance must be reviewed and approved before adding a dependency; hand-written XLSX is the fallback.
- Spreadsheet-injection prefixes (`=`, `+`, `-`, `@`) in any exported text cell (element names, CBS names, notes) are neutralised. The notes sheet excludes local file names and paths; models are identified by their in-session label only.
- The workbook has a bounded row count: the element list is capped at the Excel row limit (1,048,576) and generation is chunked or cancelable for large models, with a visible message when truncated.
- Formulas must recompute to the same totals as [Unit rates and costing](unit-rates-costing.md); unit-mismatch and missing-input rows are flagged in the workbook.

## Dependencies

[Quantity takeoff](quantity-takeoff.md), [Cost breakdown and mapping](cost-breakdown-mapping.md), [Unit rates and costing](unit-rates-costing.md).

## Acceptance Criteria

- Generated workbook opens without repair prompts in Excel and a second spreadsheet reader, formulas present and recalculating to the app's decimal totals at the displayed precision (money 2 decimals, quantities 3 decimals), verified by headless formula recalculation in tests. A live Excel open is a deferred, non-blocking manual check and is not required for unattended acceptance.
- Edited rate cells change dependent costs and totals.
- No network requests occur during export; no persistence occurs.
