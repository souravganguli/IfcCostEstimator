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

Documentation structure and relative links were checked for these studies; model-search video frames were additionally checked for nonblank pixels, and model-filtering images/transcript timestamps were validated. These are documentation checks, not feature acceptance or phase closure.

## Current Work: Viewer Navigation

[viewer-navigation.md](feature/viewer-navigation.md) is the next capability in Phase 1 order. Start from its existing specification, inspect current controls and tests, then research comparable navigation tools while preserving the approved camera/view conventions and local-only boundaries.

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
