# Phase 0 Development and Deployment

## Branch and validation contract

- Phase 0 changes are made directly on the repository's default branch when requested. The intended branch name is `main`; the repository currently names its default branch `master`.
- The GitHub Actions workflow accepts pushes to `main` and `master`, but runs its job only when the pushed branch is the repository's configured default branch. Pull requests and other branches do not run cloud CI; validate those changes locally with the commands in [development.md](development.md).
- The default-branch workflow runs on `ubuntu-latest`, installs Chrome, runs unit tests, builds the site, runs Playwright against the built preview, then deploys the tested `dist/` output to GitHub Pages.
- A failed test or build prevents deployment. After deployment, the workflow checks that the public entry point and at least one built application asset respond successfully.
- GitHub Actions is the sole publisher. No `dev` or generated artifact branch is needed for Phase 0.

## GitHub Pages setup

The expected project URL is `https://souravganguli.github.io/IfcCostEstimator/`. The Vite build uses `/IfcCostEstimator/` as its base so application JavaScript, CSS, and WASM assets resolve below that path.

In repository settings, configure **Pages → Build and deployment → Source** to **GitHub Actions** and allow Actions to deploy Pages. The workflow requests `pages: write` and `id-token: write` only for its deployment job. No deployment token or additional publishing branch is required.

Root cause of the missing app (observed 2026-10-27): Pages was set to **Deploy from a branch** (`master` / root), which publishes repository source files rather than the Vite build. Change **Settings → Pages → Build and deployment → Source** to **GitHub Actions**; the branch-based source must not be used. As of that date, the public URL still serves a source `index.html` that references `/src/main.ts`, not the built application. The new workflow has not yet been confirmed against GitHub-hosted Actions or a deployed browser session. Its deployment smoke check verifies HTTP availability and an application asset, not viewer rendering or IFC/WASM loading. After the first successful workflow, open the URL in Chrome, load the authored fixture, verify rendering and controls, and check the browser console/network for asset failures.

## Scope and safeguards

The Phase 0 workflow intentionally deploys every validated push to the configured default branch; do not push unverified changes to it. It does not test or publish other branches or PRs. Local-only IFC fixtures remain excluded from deployment artifacts by building and publishing only `dist/`. Selected model contents are processed in the browser and must never be uploaded.

Use the local type, unit, build, and Chrome browser-test commands in [development.md](development.md) before pushing. Record the successful workflow run, deployed URL, source commit, Chrome smoke-test result, and any remaining limitations in the Phase 0 plan. This establishes Phase 0 deployment evidence; it does not certify broad IFC compatibility or resource limits.
