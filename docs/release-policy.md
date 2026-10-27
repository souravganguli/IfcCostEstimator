# Development, Review, and Production Contract

## Branch and Approval Boundaries

- Feature branches integrate into `dev`, normally through a pull request targeting `dev`. They must never target, push to, or merge directly into the production/release branch.
- `dev` is the development integration and phase-development-closure branch. Its exact remote commit is the reference for development gate evidence.
- Promotion from `dev` to production is performed by the human user only, after explicit business approval. Passing tests, a preview URL, development closure, or agent authorization to work on `dev` does not authorize production promotion.
- Production is an environment/approval role, not an instruction to create a branch named `Prod`. The current repository's production branch and protected environment must be explicitly configured by its human owner. Existing `main`/`master` release branches must not be modified by agents.
- Do not force-push shared integration or production branches. Protect production with branch rules and deployment-environment approvals; written policy is not a substitute for configuring those controls.

## Development Gate Closure

A phase or approved subphase is complete **for development** when:

1. Its approved requirements and development acceptance criteria are implemented, documented, and verified.
2. The required type, unit/contract/integration, build, and browser checks pass for the verified code. Local-only fixture checks have recorded local results; missing-fixture skips are explicit and are not represented as passes.
3. That verified work has been pushed/integrated into remote `dev`, and required integration checks pass for that commit. Record the commit SHA, test/check results, and any approved limitations in the phase plan.

A local commit alone is not a remote-`dev` push or integration result. Failed or unapproved skipped required checks leave the development gate open. Later code changes require relevant revalidation rather than reusing evidence from a different commit without review.

Live production deployment and business acceptance are separate release gates owned by the human user; they must not block development closure or the next approved development phase merely because a production release is pending. This does not claim that production hosting has been tested. The published `/dev/` review is a development check; feature branch acceptance remains local/CI testing.

## Review URL Contract

| Environment | Source | Required Review Endpoint | Authority |
| --- | --- | --- | --- |
| Feature branch | Exact feature-branch/PR commit | No published URL; local and CI checks only | Feature owner and required CI checks |
| Development review | Tested remote `dev` commit | Stable `/dev/` URL, distinct from production | Development pipeline; no business production approval implied |
| Production | Human-approved release commit promoted from `dev` | Stable production URL | Human user with explicit business approval |

Feature branches are tested locally and in unprivileged CI but are never published and do not receive Pages URLs. Only a tested commit pushed to `dev` updates the stable development URL. Production remains at the project root and is updated only through the human-approved release process.

Build the application with the deployment's own base path so JavaScript and WASM assets resolve correctly. Run a deployed dev-review smoke check, and attach its URL and source SHA to the integration/check record. Do not publish repository contents, local IFC fixtures, source diagnostics, secrets, or test artifacts as site assets; publish the application build only.

Dev publication must never rebuild, overwrite, or promote the production deployment. Untrusted fork PRs must not receive production or publishing credentials. Do not execute untrusted branch code in a privileged `pull_request_target` publishing job.

## Selected Hosting: Shared Subpaths

GitHub Pages provides **one project site per repository**, not an independent site for every environment. Two separate workflows calling `deploy-pages` in the same repository replace the same site; they do not create an isolated development URL automatically.

The user selected one shared site with these paths, relative to its project root:

| Destination | Path | Example Project URL Pattern |
| --- | --- | --- |
| Production | `/` | `https://<owner>.github.io/IfcCostEstimator/` |
| Development | `/dev/` | `https://<owner>.github.io/IfcCostEstimator/dev/` |
These are patterns, not verified live endpoints. User/organization root-site repositories omit the project-name prefix; a configured Pages domain uses the URL returned by Pages. Feature branches have no published path.

Each Pages deployment still replaces the whole shared site. The generated `pages-artifacts` branch stores the production build, dev build, and publishing manifest. A dev update copies only its tested build into `/dev/`, preserving the approved production snapshot byte-for-byte; it never rebuilds production from dev code. Competing store updates retry ordinary fast-forward pushes without force-pushing. A serialized deployment checks out the latest combined store before uploading the complete site, so queued builds cannot reintroduce an older snapshot.

This explicitly accepts shared publishing authority, availability, and origin: a broken combined-site deployment can affect both paths. Subdirectories are not security boundaries. Only trusted `dev` and human-approved production builds are published. Non-sensitive grid preferences are separated between production and dev, with the existing production preference key retained. Never store secrets or sensitive model information there.

## Publishing Workflows

- [Branch validation](../.github/workflows/pages.yml) runs locked installation, unit/contract tests, typed production build, and Chrome/Edge tests against development and built-preview servers. It runs on branch pushes, excluding generated publishing branches, and PRs targeting `dev`. Feature branches use the ordinary local project base for tests and never upload a Pages artifact. `dev` builds use `/dev/` and upload the tested application artifact. Production validation artifacts are uploaded only when explicitly dispatched on the production branch. PR validation is unprivileged and does not publish fork builds.
- [Subpath publication](../.github/workflows/pages-publish.yml) uses trusted code from the repository default branch, not downloaded branch scripts. After a successful same-repository push-validation run on `dev`, it verifies the source workflow, current `dev` head, and exact run ID, then downloads the inert build artifact. Feature branches cannot enter the publisher. Failed or stale builds leave the existing site unchanged.
- Production publication requires a human manual dispatch on the configured production branch, a successful validation run for its current SHA, a business-approval reference, and reviewers configured on the `production` environment. The workflow does not merge or promote branches; the human performs that separately. Production pushes alone never deploy production.
- The site updater allows only application entrypoints and supported build asset types, rejects symlinks, unsafe paths and unexpected stored files, and writes branch/channel/SHA metadata to each published destination's `_deployment.json`. After deployment, an HTTP check verifies the selected entrypoint and metadata against the stored revision and writes the URL/source SHA to the Actions run summary. This is not a deployed browser-rendering or IFC/WASM check.

## Human Owner Setup

1. Review and integrate these workflows and publishing scripts onto the repository's trusted default branch. The `workflow_run` publisher must exist there before it can trigger. Feature application work still integrates into `dev`; changes to production/default-branch governance remain human-owned.
2. Set repository variable `PRODUCTION_BRANCH` to the actual release branch, distinct from `dev`. The workflow otherwise uses the default branch. Protect `dev` and production with required validation checks and review rules. Restrict production merges to the human-approved release process, and restrict writes to the generated `pages-artifacts` branch to the publisher/owner.
3. Configure Pages to use **GitHub Actions**. Create a protected `production` environment with required human reviewers, and a `github-pages` deployment environment that permits the trusted publishing workflow. Dev store updates use `development-publication`. Ensure Actions is permitted to write the artifact-store branch. No additional cross-repository token is required.
4. Bootstrap safely. For an existing production site, recover its exact approved static build and source SHA, and have the owner seed the `pages-artifacts` store using the tested `updateSite` helper and production manifest, or perform a newly business-approved initial production dispatch. Do not replace an existing site with an empty root merely to enable dev reviews. An unseeded store fails closed for dev publication by default.
5. Only when production is intentionally absent may the owner set repository variable `PAGES_ALLOW_EMPTY_PRODUCTION=true`. This explicitly permits the first dev publication without a production root. Leave it unset for existing production and remove it after the first approved production snapshot is stored.
6. Push a tested dev update and inspect its validation and publication runs. Record the dev URL and source SHA, then verify actual browser rendering, local IFC loading, same-origin JS/WASM requests, model removal, failure recovery, and preference isolation in Chrome and Edge. The HTTP metadata smoke check alone is not that evidence. Feature branches are validated by CI but have no Pages artifact or URL.
7. For release, the human promotes the approved work to the production branch, waits for its validation run, then dispatches **Publish Pages subpaths** on that branch with its run ID and business-approval reference and approves the protected environment. Keep the approval reference in the run record. Do not ask an agent to perform this promotion.

Required-reviewer environments depend on repository visibility and GitHub plan. If unavailable, production publication deliberately fails; do not silently remove this guard. Obtain approval for a different enforceable release mechanism. GitHub Pages storage/build limits apply to the combined site. Protect or restrict Actions artifact access as appropriate; no IFC fixtures belong in those artifacts.

## Current Implementation Status

The two-destination updater, validation/publishing workflows, base-aware browser checks, and production/dev preference isolation are implemented locally. Unit tests cover production preservation, dev updates, safe paths and files, workflow structure, stale/untrusted runs, and production approval checks. Local browser tests exercise dev and production bases. Feature branch builds remain CI/local only. Repository settings, remote triggers, approval permissions, initial store seeding, and live deployment/browser behavior remain unverified. No push, repository-settings change, or remote publication was performed as part of this implementation. Development closure still requires the exact tested remote `dev` commit and passing required checks.

## References

- [GitHub Pages site types and one-site-per-repository limit](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).
- [GitHub Pages publishing sources and Actions workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

Reviewed against official documentation on 2026-10-27. Owner setup and live URLs remain to be configured and verified.