# ADR-0009: Quality guardrails — lint, format, coverage, and CI gates

- **Status:** Accepted
- **Date:** 2026-10-30
- **Deciders:** Project owner

## Context

Development pain was concentrated in three areas: changes breaking unrelated things,
behavior drifting from intent, and problems surfacing only in the browser. Investigation
found the architecture sound and enforced (`tests/unit/architecture.test.ts`) and the domain
logic well tested, but **no linter, formatter, or coverage gate** existed, and the vague
commit history reflected ad-hoc discipline. The missing guardrails — not the architecture —
were the root cause. The chosen priority was "guardrails so changes stop breaking things."

## Decision

Add automated quality guardrails and gate deployment on them:

- **ESLint 9 (flat config)** with `typescript-eslint` type-checked rules for `src`, a lighter
  rule set for test files (mocks legitimately trip type-aware rules), and
  `eslint-config-prettier` so formatting is owned by Prettier. Config:
  [`eslint.config.js`](../../../eslint.config.js).
- **Prettier** with a shared `.prettierrc.json` and `.editorconfig` for consistent formatting.
- **Vitest v8 coverage** (`@vitest/coverage-v8`) with a **coverage floor** set just below the
  measured baseline so the gate can only ratchet upward. `src/main.ts` and the browser-only
  `src/adapters/ifc/worker.ts` are excluded (exercised by e2e, not Node units).
- **npm scripts**: `lint`, `lint:fix`, `format`, `format:check`, `test:coverage`, and a
  composite `verify` (typecheck + lint + format:check + test).
- **CI gates**: the `master` Pages workflow runs typecheck, lint, and format-check **before**
  build, and runs units with coverage, so a failing gate blocks deployment.

All pre-existing lint findings were resolved at the source (typed adapter/worker/`userData`
boundaries, safe stringification, `void`-ed fire-and-forget stream promises, callback property
types to remove `unbound-method` false positives) rather than broadly suppressed.

## Consequences

- Regressions in style, formatting, type-safety, and basic correctness are caught locally via
  `npm run verify` and in CI before deploy.
- Coverage cannot silently decline; raising the floor is an explicit, reviewable change.
- The one place untyped engine values appear is the adapter boundary, where they are narrowed;
  this keeps `no-unsafe-*` meaningful elsewhere (reinforces [ADR-0003](0003-ifc-engine-and-renderer-adapters.md)).
- `workflows.test.ts` asserts the new gate ordering, so the CI contract itself is tested.
- The guardrails do **not** by themselves fix the UI-layer coverage gap or the
  intent-traceability gap; those remain tracked in [gaps.md](gaps.md).

## Alternatives considered

- **Downgrade adapter-boundary rules to warnings and defer fixes** — considered; rejected in
  favor of fixing all findings at the source so the error-level gate is trustworthy from day one.
- **No coverage threshold (report only)** — rejected: a floor is what prevents silent decline,
  which is the point of the guardrail.
- **Add a pre-commit hook (e.g. Husky)** — deferred: `verify` and CI provide the gate without a
  new git-hook dependency; revisit if local discipline needs reinforcing.
