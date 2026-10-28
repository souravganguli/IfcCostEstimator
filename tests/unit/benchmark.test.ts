/**
 * IFC processor benchmark and regression guard.
 *
 * Measures `processModel` wall-clock time for the three committed benchmark
 * models and fails if any fixture's median processing time exceeds its
 * committed baseline by more than the documented tolerance multiplier.
 *
 * Baseline values live in tests/artifacts/benchmark-baseline.json and must
 * be updated intentionally — never silently — when the processing path
 * genuinely improves. Set env UPDATE_BENCHMARK_BASELINE=1 to print new
 * measurements to stdout for manual review and copy-paste into the baseline.
 *
 * The benchmark runs 3 repetitions per fixture and takes the median to reduce
 * measurement noise. The first run is treated as a warm-up and is included in
 * the median (cold start matters for real users).
 *
 * Fixture policy: all three benchmark IFC files are committed to
 * tests/fixtures/benchmarkmodels/. Missing files fail, not skip.
 */
import { readFileSync, existsSync } from 'node:fs';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { IfcAPI } from 'web-ifc';
import { processModel } from '../../src/adapters/ifc/ifc-processor';

interface FixtureBaseline {
  readonly name: string;
  readonly schema: string;
  readonly fileSizeKb: number;
  readonly meshCount: number;
  readonly elementCount: number;
  readonly baselineMs: number;
}

interface BaselineFile {
  readonly version: number;
  readonly toleranceMultiplier: number;
  readonly fixtures: readonly FixtureBaseline[];
}

const BASELINE_PATH = new URL('../artifacts/benchmark-baseline.json', import.meta.url);
const FIXTURE_DIR = new URL('../fixtures/benchmarkmodels/', import.meta.url);
const RUNS = 3;
const UPDATE_MODE = process.env['UPDATE_BENCHMARK_BASELINE'] === '1';

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const baseline: BaselineFile = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));

describe('IFC processor benchmark', () => {
  const api = new IfcAPI();

  beforeAll(async () => {
    await api.Init(undefined, true);
  }, 30_000);

  afterAll(() => {
    api.Dispose();
  });

  for (const fixture of baseline.fixtures) {
    it(`processModel: ${fixture.name}`, { timeout: Math.ceil(fixture.baselineMs * baseline.toleranceMultiplier * RUNS * 2) + 10_000 }, () => {
      const fixturePath = new URL(fixture.name, FIXTURE_DIR);

      // Committed fixtures must exist — this is a hard failure, not a skip.
      expect(existsSync(fixturePath), `Benchmark fixture missing: ${fixture.name} — ensure tests/fixtures/benchmarkmodels/ is populated`).toBe(true);

      const bytes = new Uint8Array(readFileSync(fixturePath));
      const runMs: number[] = [];

      for (let run = 0; run < RUNS; run++) {
        const handle = api.OpenModel(bytes, {
          COORDINATE_TO_ORIGIN: false,
          ALLOW_INCOMPATIBLE_SCHEMA_ALIASES: false,
        });
        const start = performance.now();
        const result = processModel(api, handle);
        const elapsed = performance.now() - start;
        api.CloseModel(handle);

        runMs.push(elapsed);

        // Smoke-check output correctness on every run.
        expect(result.glb.byteLength, `${fixture.name}: GLB must be non-empty`).toBeGreaterThan(0);
        expect(result.metadata.schema, `${fixture.name}: schema`).toBe(fixture.schema);
        expect(result.metadata.elements.length, `${fixture.name}: element count`).toBe(fixture.elementCount);
      }

      const medianMs = median(runMs);
      const ceilingMs = fixture.baselineMs * baseline.toleranceMultiplier;

      if (UPDATE_MODE) {
        // Print for manual baseline refresh — never auto-write.
        console.log(`[BENCHMARK UPDATE] ${fixture.name}: median=${Math.round(medianMs)}ms (baseline=${fixture.baselineMs}ms)`);
      }

      // Regression guard: median must not exceed baseline × tolerance.
      expect(
        medianMs,
        [
          `Regression: ${fixture.name} median ${Math.round(medianMs)}ms exceeds baseline`,
          `${fixture.baselineMs}ms × ${baseline.toleranceMultiplier} = ${Math.round(ceilingMs)}ms ceiling.`,
          `Runs: ${runMs.map((ms) => Math.round(ms)).join(', ')}ms.`,
          `If this machine is genuinely slower, update the baseline intentionally`,
          `(UPDATE_BENCHMARK_BASELINE=1) after reviewing the new values.`,
        ].join(' '),
      ).toBeLessThanOrEqual(ceilingMs);
    });
  }
});
