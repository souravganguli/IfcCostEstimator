# Phase 0 Development and Deployment

## Branch and validation contract

- Phase 0 changes are made directly on `master`, the repository's default branch. It will not be renamed.
- The GitHub Actions workflow runs on pushes to `master` only, and its job is also guarded by the repository's configured default branch. Pull requests and other branches do not run cloud CI; validate those changes locally with the commands in [development.md](development.md).
- The default-branch workflow runs on `ubuntu-latest`, installs Chrome, runs unit tests, builds the site, runs Playwright against the built preview, then deploys the tested `dist/` output to GitHub Pages.
- A failed test or build prevents deployment. After deployment, the workflow checks that the public entry point and at least one built application asset respond successfully.
- GitHub Actions is the sole publisher. No `dev` or generated artifact branch is needed for Phase 0.

## GitHub Pages setup

The expected project URL is `https://souravganguli.github.io/IfcCostEstimator/`. The Vite build uses `/IfcCostEstimator/` as its base so application JavaScript, CSS, and WASM assets resolve below that path.

In repository settings, configure **Pages → Build and deployment → Source** to **GitHub Actions** and allow Actions to deploy Pages. The workflow requests `pages: write` and `id-token: write` only for its deployment job. No deployment token or additional publishing branch is required.

The **Deploy from a branch** source must not be used: it publishes repository source files instead of the Vite build (this caused the missing app on 2026-10-27). The source was switched to GitHub Actions and the first hosted run passed. The deployment smoke check verifies HTTP availability and an application asset, not viewer rendering or IFC/WASM loading, so after notable changes open the URL in Chrome, load the authored fixture, verify rendering and controls, and check the console/network for asset failures.

## Scope and safeguards

The Phase 0 workflow intentionally deploys every validated push to the configured default branch; do not push unverified changes to it. It does not test or publish other branches or PRs. Local-only IFC fixtures remain excluded from deployment artifacts by building and publishing only `dist/`. Selected model contents are processed in the browser and must never be uploaded.

Use the local type, unit, build, and Chrome browser-test commands in [development.md](development.md) before pushing. Record the successful workflow run, deployed URL, source commit, Chrome smoke-test result, and any remaining limitations in the Phase 0 plan. This establishes Phase 0 deployment evidence; it does not certify broad IFC compatibility or resource limits.
