# Phases, Plans, and Versions

## Plan Location and Names

All delivery plans belong in `docs/plans/`. Use the filename pattern `Phase_<number>_<Short_Descriptive_Title>.md`, with an unpadded phase number and underscores separating title words. Use the readable heading `# Phase <number>: <Short Descriptive Title>` inside the document; colons must not appear in filenames because Windows does not permit them.

| Phase | Title | Filename | Baseline Version |
| --- | --- | --- | --- |
| 0 | POC Viewer | [Phase_0_POC_Viewer.md](plans/Phase_0_POC_Viewer.md) | `0.00.00` |
| 1 | MVP | `Phase_1_MVP.md` | `1.00.00` |

Phase 1 is the naming/version example for the next phase; its scope and plan have not been defined. Subsequent phase numbers map to the corresponding major version. Do not invent requirements or mark a phase complete from its name or version alone.

Each phase plan must identify its phase number, title, major version, and baseline version, and define its scope, exclusions, delivery steps, test gates, acceptance criteria, and completion evidence. Feature details stay in their individual specifications under `docs/feature/` and are referenced by the plan.

## Version Convention

Versions follow **major.minor.fix**:

- **Major:** the delivery phase number. Phase 0 releases use major `0`; Phase 1 releases use major `1`, and so on. Starting a new phase resets minor and fix to zero.
- **Minor:** backward-compatible functionality added within the phase. Increment minor and reset fix to zero.
- **Fix:** corrections within the current major/minor release. Increment fix without changing major or minor.

Display minor and fix with a minimum of two digits in release documentation: `0.00.00`, `0.01.00`, `0.01.01`, and `1.00.00`. The padding is presentation only, not a different numeric version. Version components do not wrap at 99.

npm package metadata and machine-readable release tags must use valid unpadded Semantic Versioning, because numeric SemVer components cannot contain leading zeros. For example:

| Documentation | npm Version | Release Tag |
| --- | --- | --- |
| `0.00.00` | `0.0.0` | `v0.0.0` |
| `0.01.00` | `0.1.0` | `v0.1.0` |
| `0.01.01` | `0.1.1` | `v0.1.1` |
| `1.00.00` | `1.0.0` | `v1.0.0` |

The fix component corresponds to SemVer's patch component. Keep the package manifest and root lockfile package versions synchronized whenever an authorized release bump is made. Dependency versions and versioned settings schemas are independent of the application's release number.

The current package version `0.0.0` already corresponds to the Phase 0 baseline display `0.00.00`; establishing this convention does not itself bump a version, create a release tag, or close outstanding phase gates.