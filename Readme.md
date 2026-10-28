# IfcCostEstimator

A browser-only application for opening and viewing construction 3D models.

## Product Direction

The intended experience is to open local IFC models, view them together in a shared 3D scene, and manage them without sending model data to a server. Reliable viewing, clear feedback, and responsible use of browser resources take priority over additional analysis features.

Release-specific scope, delivery steps, browser targets, and acceptance criteria belong in phase plans under `docs/plans/`. The current plan is [Phase 1: MVP](docs/plans/Phase_1_MVP.md). Agent workflow is governed separately by [AGENTS.md](AGENTS.md). Architectural decisions are documented in [docs/architecture.md](docs/architecture.md).

## Phases and Versions

Each delivery phase corresponds to a major version: Phase 0 is POC Viewer (`0.00.00` baseline), Phase 1 is MVP (`1.00.00` baseline), and subsequent phases advance the major number. Versions follow **major.minor.fix**. Plan naming, increment rules, and the equivalent npm version format are defined in [docs/versioning.md](docs/versioning.md).

Only pushes to `master`, the default branch, run Ubuntu/Chrome cloud checks and deploy the tested build to the GitHub Pages project URL; changes on other branches are checked locally. See [docs/release-policy.md](docs/release-policy.md) for the deployment contract and setup.

## Feature Specifications

Each feature has its own Markdown file in `docs/feature/`, named with a descriptive kebab-case filename. That file is the source of truth for the feature's requirements and acceptance criteria; the delivery plan links to it rather than duplicating those details.

The viewing features are [IFC loading](docs/feature/ifc-loading.md), [3D navigation](docs/feature/viewer-navigation.md), [model controls](docs/feature/model-controls.md), [loading and error feedback](docs/feature/loading-and-errors.md), and [viewer settings](docs/feature/viewer-settings.md). The viewer shell also provides the [tool sidebar](docs/feature/viewer-tool-sidebar.md) and [element properties](docs/feature/element-properties.md) panel.

Viewer surfaces use the official [Fluent 2 Web Components](docs/feature/fluent2-design-system.md) (`@fluentui/web-components`), bundled with the application; they use system fonts and do not load external UI assets at runtime.

## Local Development

Use Node.js 22.12 or newer; Node 22.23.4 and npm 10.9.9 were verified locally.

```powershell
npm ci
npm run dev
```

Open the printed localhost URL, normally `http://127.0.0.1:5173/IfcCostEstimator/`, and choose **Open IFC** in the top ribbon. Multiple files can be opened together. Files are parsed locally, not uploaded. The authored test fixture is available at [tests/fixtures/box.ifc](tests/fixtures/box.ifc).

See [docs/development.md](docs/development.md) for production preview, unit tests, browser tests, deployment configuration, and known validation limits.