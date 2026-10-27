# Phase 1C Cost Estimation Market Research

Status: Draft. Informs [Phase 1C planning](../plans/Phase_1_MVP.md). It makes no market-size or adoption claims.

## Evidence Limits

- Sources are public vendor pages and summaries. Vendor claims are marketing-level and unverified against the products.
- Searches for IFC quantity-set pitfalls, other tools and Excel libraries failed (tool errors). Those rows are marked **Unverified** and need a follow-up check before a spec relies on them.
- Viewer, estimating and CDE capabilities are kept separate; this document covers estimating only.

## Evidence Matrix

| Tool | Signals observed | Evidence | Limits |
| --- | --- | --- | --- |
| Autodesk Assemble | Model-based takeoff; Model Inventory grouped and sorted by user-defined parameters (bid package, location, phase, work activity code); version comparison showing added, deducted and changed items; Excel export of inventory and change reports with filtering, grouping and column choice | Autodesk product pages and support article | Summary level; cloud and Autodesk-ecosystem based |
| Trimble Vico Office | Takeoff that updates on model change; Location Breakdown Structure; Cost Planner built from assemblies and components with spreadsheet-style editing and UniFormat/MasterFormat structures; Excel export | Trimble and Vico marketing content | Marketing level only |
| RIB CostX | 2D and 3D/BIM takeoff; estimating spreadsheets live-linked to drawings and data; auto-revisioning with audit trail; estimates in multiple breakdown structures; client reports; REST API | [RIB CostX page](https://www.rib-software.com/en/rib-costx) (fetched) | Feature table only; BIM import formats, mapping workflow and Excel formula behavior not confirmed |
| IFC quantity sets (`IfcElementQuantity`, `Qto_*BaseQuantities`) | Source-provided quantities such as length, area, volume per element | buildingSMART page returned 403 | **Unverified.** Quantities are often absent or inconsistent by authoring tool; this must be tested against the Duplex fixture |
| ExcelJS | Candidate client-side XLSX writer | GitHub repo page fetched; licence and formula support not read | **Unverified.** Licence, bundle size and formula-write behavior are confirmed at `1C_01`; ExcelJS is pre-approved if MIT-licensed and acceptable, else hand-written XLSX fallback (see the Unattended Execution Policy). |
| Other tools (Navisworks Quantification, Autodesk Takeoff, Solibri, Bluebeam, ProEst) | Not researched | None | **Unverified** |

## Workflow Signals

1. Takeoff from the model, grouped by user-chosen properties (type, level, material, classification).
2. Mapping of physical items to a breakdown structure (cost, work, location or classification codes).
3. Unit rates and assemblies turning quantities into costs.
4. Change and variance tracking between model versions.
5. Spreadsheet-style editing and Excel export.

## Fit With Product Boundaries

- Excel export is a user-initiated local file download. It conflicts with the current "no persistence of quantities or project records" boundary only if data is stored; it does not need a backend.
- Rates and breakdown structure data entry needs a decision: in-session only, or imported and exported as user-supplied files.
- Variance tracking depends on model comparison, which Phase 1B excluded.

## Candidate Feature Selection

| Candidate | Source signal | Proposed |
| --- | --- | --- |
| Quantity takeoff grouped by property | Assemble, Vico, CostX | Decision needed |
| Cost breakdown structure and element mapping | Assemble, Vico, CostX | Decision needed |
| Unit rates and cost calculation | Vico, CostX | Decision needed |
| Excel export with cell formulas | Assemble, Vico | Decision needed |
| Rates or CBS file import | Vico, CostX | Decision needed |
| Variance between model versions | Assemble | Likely defer |
| Assemblies, location breakdown | Vico | Likely defer |
