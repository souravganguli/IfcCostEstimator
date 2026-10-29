# Project Instructions

This file governs agent workflow and behavior. It is not the source of product requirements or architectural decisions.

## Before Making Changes

- Read [Readme.md](Readme.md) for product direction and architecture, the relevant phase plan in `docs/plans/` for delivery gates, and the relevant feature specification in `docs/feature/` for requirements and acceptance criteria. The current phase is [Phase 1: MVP](docs/plans/Phase_1_MVP.md), executed in order as tranches 1A, 1B and 1C; [Phase 0: POC Viewer](docs/plans/Phase_0_POC_Viewer.md) is treated as closed by user decision, and shared rules are in [cross-cutting contracts](docs/feature/cross-cutting-contracts.md).
- Follow the decisions documented there. Ask before changing agreed scope or architecture; do not establish or override architectural decisions in this file.
- Distinguish planned capabilities from verified implementation. Check the current files and working-tree changes before editing.
- Preserve user changes, keep the work scoped to the request, and avoid unrelated refactors or dependency churn.

## File Organization

- Keep maintained application code in `src/`. Do not edit generated output as implementation source.
- Follow the [Fluent 2 design system policy](docs/feature/fluent2-design-system.md#design-policy): use Fluent 2 Web Components for interactive controls to the greatest extent possible; use the Fluent text sizes and spacing scale; and record every deviation in the design-system specification's Recorded Deviations table. Do not create a custom (non-Fluent) component without explicit user approval and a stated reason why a Fluent component does not fit; once approved, place it under `src/components/` (not inside a feature, the shell, or `src/core/`).
- Keep tests, test configurations, fixture assets, and generated test artifacts under `tests/`.
- Keep authored documentation under `docs/`, except the root README and this file. Keep feature requirements in one specification per feature, with the README overall and the plan delivery-focused.
- Keep every image and non-text asset for a feature requirement doc under `docs/feature/<slug>/assets/` (a per-feature assets folder named for that feature's spec), and reference them with relative paths. This applies to all feature docs: competitor screenshots, video stills, wireframes, SVG sketches, and diagrams. Do not place feature assets next to the Markdown file or in a shared or ad-hoc location.
- Keep all phase plans in `docs/plans/`; follow the filename and version conventions in [docs/versioning.md](docs/versioning.md). Do not bump versions or mark a phase complete merely because its plan exists.
- Update the relevant specification and documentation when behavior changes. Repair links when files move.
- Follow the local-only fixture policy in [docs/test-fixtures.md](docs/test-fixtures.md). Preserve ignored model files and never force-add them or include their contents in published diagnostics or artifacts.
- Before deleting obsolete files, confirm they have no maintained references or user edits. Do not push, publish, or change repository settings unless requested.
- Follow [docs/release-policy.md](docs/release-policy.md) for integration and review. Use the branch specified for the task; direct work on `master`, the default branch, is permitted when requested. Only pushes to `master` run cloud checks and deploy; other branches are checked locally. Record phase closure only after the workflow and deployed-site verification pass.
- Unattended Phase 1 execution is authorized under the [Unattended Execution Policy](docs/plans/Phase_1_MVP.md#unattended-execution-policy): run tranches 1A, 1B and 1C in order without pausing for interactive approval, applying the pre-authorized decisions there. During an unattended run, commit locally on the `dev` branch as needed but never push to any remote; because only pushes to `master` deploy, no deployment occurs. Live-site verification remains a deferred human step, so do not claim phase closure on local evidence alone.

## Validation and Reporting

- Use [docs/development.md](docs/development.md) for verified commands and prerequisites; inspect actual package scripts before changing or running them.
- Respect the delivery gates in the plan. Every implementation step needs relevant tests: identify a focused check before editing, add or update tests, run them after the change, and resolve failures before proceeding.
- Scale checks to the change. Verify browser rendering and interactions for viewer changes, not only DOM state or a successful build.
- For documentation-only changes, validate links, specification structure, and consistency instead of running unrelated application tests. For cleanup affecting runtime assets or configuration, also verify build and relevant runtime tests.
- Report checks actually run, their results, and skipped or blocked requirements. Missing local-only fixtures must be reported as skips, not passing model qualification.
- Do not mark a gate complete without its required evidence or imply local preview establishes deployed compatibility. Distinguish local checks, a successful master workflow, and verified live-site behavior.