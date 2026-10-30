# Architecture gaps and open questions

This tracks architectural matters that are **not yet decided** or where the documented
decision is not fully enforced. Each gap should resolve into a new or amended ADR plus an
update to [architecture.md](../../architecture.md). Gaps are ordered roughly by impact on the
stated pains (changes breaking things, intent drift, browser-only issues).

## G1 — UI/feature-layer test coverage is thin (high impact)

The domain core and IFC processing are well covered (≈80–100% lines), but many
`src/features/<name>/index.ts` modules and `src/app/index.ts` are near 0% in unit coverage;
`src/adapters/viewer/index.ts` is low. These are the browser-facing layers where "breaks in
the browser" and "features don't match intent" actually surface. Unit tests run in
Node/happy-dom and cannot catch real rendering/integration faults.

- **Why it matters:** directly tied to two of the three reported pains.
- **Current mitigation:** 14 Chrome e2e tests with canvas-pixel assertions cover core flows;
  the coverage floor (ADR-0009) prevents further decline.
- **Resolution path:** add per-feature behavioral tests through each public interface
  (ADR-0004 verification criteria) and e2e flows for the Phase 1C costing/estimate paths;
  then ratchet the coverage floor upward.

## G2 — Intent → code → test traceability is not enforced (medium impact)

Feature specs exist under `docs/feature/`, but nothing verifies that each feature has a spec
and at least one behavioral test, or that acceptance criteria map to tests. This is the
structural cause of "features don't match what I wanted."

- **Resolution path:** decide and record (ADR) a lightweight traceability check (e.g. a test
  that every `src/features/<name>` has a matching spec and test file), plus a commit/PR
  convention so intent is captured. Consider referencing acceptance-criteria IDs from tests.

## G3 — No explicit error-handling / user-feedback contract across features (medium impact)

Failure handling exists (loading-and-errors feature, settings fallback, graphics-unavailable
state), but there is no single documented contract for how features surface recoverable
errors and notices. The `notice` channel is passed ad hoc to some features.

- **Resolution path:** decide whether to formalize a shared feedback/error contract in
  `src/core/contracts.ts` and record it as an ADR, or explicitly accept the current per-feature
  approach.

## G4 — Resource/memory ceiling is unmeasured (medium impact, product-bounded)

Architecture mandates explicit cleanup ownership and respects browser memory/GPU limits, and
one bounded measurement run exists, but there is no defined maximum supported input size or an
exhaustion strategy beyond "recoverable allocation failures are tested."

- **Resolution path:** this is partly a product/plan question; record any architectural stance
  (e.g. streaming, model-count caps, explicit disposal audits) as an ADR when prioritized.

## G5 — Dependency/supply-chain and pinning policy is implicit (low impact)

The lockfile pins tested dependencies and `web-ifc` is pinned exactly, but there is no recorded
policy for upgrading engines (web-ifc/Three.js) or for security updates, nor an automated audit
step in CI.

- **Resolution path:** record a dependency-update/pinning ADR; optionally add `npm audit` or a
  scheduled dependency check to CI.

## G6 — No local pre-commit enforcement (low impact)

`npm run verify` and CI enforce the gates, but nothing prevents committing code that fails them
locally. Deferred in ADR-0009.

- **Resolution path:** decide whether to add a pre-commit hook (e.g. Husky + lint-staged) or
  rely on CI; record the decision.

---

Resolving a gap: write the ADR, update `architecture.md` to the new current state, and remove or
mark the gap here.
