# Feature Research Handover

## Request

Redo all feature research one feature at a time, write or update each feature's developer-ready requirement, and commit each feature separately. The user requested Chrome via Playwright when the VS Code built-in browser cannot access YouTube. The work is research and requirements, not production implementation.

Follow the product-analyst discovery phases and [media capture skill](../.github/skills/capture-feature-media/SKILL.md), keeping an auditable source log, user flow, acceptance criteria, developer tests, and feature-specific assets. Preserve approved product boundaries and decisions in [Phase 1 MVP](plans/Phase_1_MVP.md), [cross-cutting contracts](feature/cross-cutting-contracts.md), and [AGENTS.md](../AGENTS.md). Ask the user before changing agreed scope or architecture; distinguish researched requirements from verified behavior. The user requested all features, not only Phase 1; Phase 1 order was chosen as the starting sequence.

## Completed

Local branch: `dev`. Nothing was pushed or deployed.

| Feature | Specification | Local commit(s) | Notes |
| --- | --- | --- | --- |
| Element selection | [element-selection.md](feature/element-selection.md) | `79cd5b9` | Research, requirements, and visual evidence. Selection picking and rendered highlight acceptance remain unverified. |
| Element properties | [element-properties.md](feature/element-properties.md) | `471eba3` | Research and requirements; no verified property-specific video was found. Existing browser pane evidence is not deployed-site verification. |
| Model search | [model-search.md](feature/model-search.md) | `e18bbac`, `84318c4` | Second commit corrects video evidence. Local UI gaps include model labels, hidden state, and continuation beyond a per-model cap. The studied Solibri walkthrough is general component handling, not proof of search behavior. |
| Model filtering | [model-filtering.md](feature/model-filtering.md) | `c2a6609` | Research, requirements, product screenshots, video frames, and transcript. Current local UI does not yet cover all specified behavior. |
| Model hierarchy | [model-hierarchy.md](feature/model-hierarchy.md) | `3fe5bd2` | Research and evidence committed. Duplicate model-name disambiguation and keyboard-focus action reveal remain unverified; one earlier hierarchy E2E timed out before loading a model. |
| Model measurement | [model-measurement.md](feature/model-measurement.md) | `69cc957` | Research, videos, transcripts, captures, wireframe, and requirements committed. User decision: models with missing or unsupported length units are not measurable. Only the pure distance helper has focused unit-test evidence; viewer interaction remains unverified. |
| Section clipping | [section-clipping.md](feature/section-clipping.md) | `52593bc` | Research, requirements, Solibri video frames/transcript, and capture script committed. No clipping behavior or cap-generation acceptance tests exist yet. |
| Viewer navigation | [viewer-navigation.md](feature/viewer-navigation.md) | `9cb0328` | Research, requirements, Solibri and Navisworks video frames/transcripts, and capture script committed. User approved a custom view-cube component (2026-11-08). Only the framing unit tests (3) pass; view cube, standard views, projection toggle, zoom window, and Home are unimplemented. Frames were matched to captions; in-tool image viewing was unavailable. |
| First-person walkthrough | [first-person-walkthrough.md](feature/first-person-walkthrough.md) | `fa8a074` | Research, requirements, Navisworks and Revizto video frames/transcripts, and capture script committed. Movement-math unit tests (5) pass; exit-restore, eye-height floor placement, pitch, time-based speed, focus/pointer-lock-loss handling, and the limitation hint are unimplemented. Frames were matched to captions; in-tool image viewing was unavailable. |
| First-person minimap | [first-person-minimap.md](feature/first-person-minimap.md) | `f5e9a77` | Solibri navigation-map frames/transcript and xeokit storey-map evidence. Footprint, storey detection, and honest unavailable states are unimplemented; only visibility toggling is E2E-covered. |
| Display controls | [display-controls.md](feature/display-controls.md) | `07aaeb1` | Solibri and Navisworks transparency frames/transcripts. Found that the adapter overwrites authored opacity; spec requires a multiplicative factor and exact reset. 2 unit tests pass. |
| Property coloring | [property-coloring.md](feature/property-coloring.md) | `ae458e2` | Navisworks Appearance Profiler and BIMcollab Smart View frames/transcripts. UI is single-condition `equals`; enable/disable, counts, cap, and clean-up on disposal are unimplemented. 4 unit tests pass. |
| Viewer viewpoints | [viewer-viewpoints.md](feature/viewer-viewpoints.md) | `1a355a9` | Added Navisworks saved-viewpoints video evidence; 39 related unit tests pass. Recorded an unresolved conflict: the spec/implementation persist a full-scene library while the Phase 1 plan specifies session-local camera-only viewpoints. Needs a user decision. |
| Plan view | [plan-view.md](feature/plan-view.md) | `b239bfb` | Revit view-range and BIMcollab automatic-floor-plan frames/transcripts. Prototype flattens all triangles; storey/cut/projection/visibility unimplemented. 4 drawing unit tests pass. |
| Plan section views | [plan-section-views.md](feature/plan-section-views.md) | `84c495a` | Revit sections frames/transcript. Prototype is a horizontal slice only; markers, direction, depth, and links unimplemented. No feature-specific forum thread found. |
| Large-model performance | [large-model-performance.md](feature/large-model-performance.md) | `f3a94b5` | No product video applies (internal harness). Node guard: 3 tests pass. Browser metrics are recorded but not guarded, and fit timing does not measure the next paint. |
| Quantity takeoff | [quantity-takeoff.md](feature/quantity-takeoff.md) | `01db511` | Solibri ITO frames/transcript; buildingSMART forum evidence on missing base quantities. 7 unit tests pass. Missing-quantity lists, unknown-unit counts, and multi-element selection are unimplemented. |
| Cost breakdown mapping | [cost-breakdown-mapping.md](feature/cost-breakdown-mapping.md) | `0d7e82b` | Vico Cost Planner frames/transcripts. Current UI is a flat list with one CBS item per element and quantity 1; hierarchy, rules, linked quantities, and location breakdown are unimplemented. 5 unit tests pass. |
| Unit rates and costing | [unit-rates-costing.md](feature/unit-rates-costing.md) | `a0828b8` | Vico assemblies frames/transcript. Verified defect: floating-point rounding returns 1,234,567.00 for 1,234,567.005; the approved decimal requirement is unmet. |
| Estimate Excel export | [estimate-excel-export.md](feature/estimate-excel-export.md) | `5088041` | No new video (Solibri ITO reused); caption requests rate-limited. Formula cells cache 0 and the estimate sheet is a placeholder. |
| Estimate data files | [estimate-data-files.md](feature/estimate-data-files.md) | `de69649` | No new video (Navisworks profiler reused). Import applies only the currency; size check reads first; no schema or prototype-key validation; no `beforeunload` guard. |

Documentation structure and relative links were checked for these studies; model-search video frames were additionally checked for nonblank pixels, and model-filtering images/transcript timestamps were validated. These are documentation checks, not feature acceptance or phase closure.

## Current Work: Research Complete

All Phase 1A, 1B, and 1C feature specifications have been researched and committed locally. Outstanding items for the user:

1. **Decision needed — viewpoints scope.** [viewer-viewpoints.md](feature/viewer-viewpoints.md) and its implementation persist a full-scene saved-view library, while [Phase 1 MVP](plans/Phase_1_MVP.md) gate 1A_07 and its boundaries specify session-local, camera-only viewpoints. The plan or the spec must be reconciled.
2. **Implementation defects recorded in specs** (not fixed, research only): float rounding in costing; Excel formula cells caching 0; estimate import applying only the currency; display controls overwriting authored opacity; property-colouring clean-up on disposal.
3. **Evidence limits.** In-tool image viewing was unavailable throughout; all stills were matched to caption timestamps and checked for nonblank pixels. YouTube rate-limited caption downloads (HTTP 429) late in the run.

## Next Steps

1. Research and update one feature per turn, following the phase order and the updated [product analyst agent](../.github/agents/product-analyst.md).
2. Verify evidence, citations, images, local links, and acceptance-criteria status. Keep criteria unchecked unless tests or E2E evidence prove them.
3. Commit each feature's specification and assets separately. Do not push or claim deployment/phase closure from local evidence.

## Media Workflow

- Chrome with Playwright can load direct YouTube watch pages where the integrated embedded player returned Error 153. In this container the initial Chrome request failed with `ERR_CERT_AUTHORITY_INVALID` behind Zscaler; an isolated Playwright context with `ignoreHTTPSErrors` worked for public-page research. Do not globally disable certificate verification.
- The tested reliable capture path is `yt-dlp` for the public video and English auto-caption VTT, plus `ffmpeg` for timestamped frames. Study actual frames and captions before claiming behavior; validate screenshots are nonblank. Player screenshot seeking produced blank or stalled frames and should not be assumed reliable.
- A player or `yt-dlp --list-subs` can misreport subtitle availability: attempt an actual subtitle download and inspect the VTT. If video or captions cannot be retrieved, state the limitation; do not infer feature behavior from a generic video.
- Follow the media skill's artifact location and retention checklist: all downloaded media for a feature belongs under its own `docs/feature/<slug>/assets/`. Earlier capture scripts sometimes delete the temporary full video after extraction; distinguish those retained stills from a retained video and resolve any retention or usage-rights issue before claiming the media checklist is complete.

## Worktree And Environment

The dev container was rebuilt after adding FFmpeg, uv/Python, pandas, yt-dlp, and Pillow support. Pillow 13.0.0 successfully decoded a nonblank research capture; one older unrelated Fluent tree PNG was corrupt and was not replaced. Zscaler certificate files remain local-only and must not be committed.

Use the actual package scripts and [development.md](development.md) for commands. Never publish or push without instruction, and do not claim deployed compatibility or phase closure from local research or tests.
