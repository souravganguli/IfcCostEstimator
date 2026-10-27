# Unit Rates, Assemblies and Cost Calculation

Status: Draft. Assigned to Phase 1C in [Phase 1 MVP](../plans/Phase_1_MVP.md). Market basis: [Phase 1C research](../research/phase-1c-cost-estimation-market-research.md).

## Goal

Turn mapped quantities into costs using user-supplied unit rates and simple assemblies.

## Scope

- Each CBS item carries a unit, a unit rate and a quantity source (from [Quantity takeoff](quantity-takeoff.md)), with optional manual quantity override and a markup percentage.
- Assemblies: a named set of component lines (component, unit, rate, quantity per assembly unit) that yields a derived unit rate for a CBS item.
- Roll-up of costs through the CBS hierarchy and through the location breakdown.
- A single free-text currency label; no currency conversion and no bundled price data. Money shows 2 decimals and quantities 3 decimals, with English-locale number formatting.

## Requirements

- Calculations use decimal arithmetic (a fixed-precision decimal type, not binary floating point) with documented rounding per line, so money and quantity totals are exact at their displayed precision.
- Quantities and rates are metric (see [cross-cutting contracts](cross-cutting-contracts.md)); compatible non-metric inputs are converted with exact factors and the original is retained. Unresolvable unit mismatches are flagged and excluded from totals until resolved.
- Markup is additive per line (cost = quantity x rate x (1 + markup)); compounding and nested markups are out of scope. Assemblies may include a waste factor per component; nesting is not supported in 1C, so cycles are impossible. Lump-sum and allowance lines with no model quantity are supported.
- Rounding: each line is rounded half away from zero to its documented precision (money 2 decimals, quantities 3 decimals). Exported formulas wrap each line in `ROUND(..., precision)` so the workbook, computed in Excel's double precision, matches the app's decimal totals at the displayed precision.
- Missing quantities or rates produce visible warnings, not zero costs.
- All inputs are in-memory and persisted only by explicit export.

## Dependencies

[Quantity takeoff](quantity-takeoff.md), [Cost breakdown and mapping](cost-breakdown-mapping.md).

## Acceptance Criteria

- Unit tests cover rate x quantity, markup, assembly roll-up, hierarchy totals, rounding, unit mismatch and missing inputs.
- App totals equal the exported workbook's recalculated totals (see export spec).
- Chrome checks cover rate entry, warnings and totals updating when mappings or models change.
