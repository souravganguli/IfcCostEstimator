import { describe, expect, it } from 'vitest';
import { calculateCost, assemblyRate } from '../../src/core/costing';
import { emptyEstimate, exportCsv, neutralizeSpreadsheetText, parseEstimate, serializeEstimate } from '../../src/core/estimate-data';
import { sectionSegments } from '../../src/core/drawings';
import { measurePoints } from '../../src/core/measurement';
import { buildEstimateWorkbook, costFormula } from '../../src/core/estimate-xlsx';

describe('Phase 1 measurement, drawings and estimates', () => {
  it('measures metric components', () => expect(measurePoints({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 12 })).toMatchObject({ distance: 13, horizontal: 5, vertical: 12 }));
  it('projects section linework and preserves element identity', () => {
    const lines = sectionSegments([{ a: { x: 0, y: 0, z: -1 }, b: { x: 2, y: 0, z: 1 }, c: { x: 0, y: 2, z: 1 }, elementId: 7 }], 0);
    expect(lines).toHaveLength(1); expect(lines[0].elementId).toBe(7);
  });
  it('calculates markup and flags missing inputs', () => {
    expect(calculateCost({ quantity: 2, quantityUnit: 'm', rate: 10, rateUnit: 'm', markup: 10 }, 'length').cost).toBe(22);
    expect(calculateCost({ quantity: 2 }, 'length').warnings).toContain('missing rate');
    expect(assemblyRate([{ quantity: 2, rate: 3, waste: 10 }])).toBe(6.6);
  });
  it('round-trips versioned estimate definitions and neutralizes CSV injection', () => {
    const source = emptyEstimate('USD'); const parsed = parseEstimate(serializeEstimate(source));
    expect(parsed.definition).toEqual(source);
    expect(neutralizeSpreadsheetText('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(exportCsv([['name', '=bad']])).toContain("'=bad");
    expect(parseEstimate('{"version":99}').error).toBeTruthy();
  });
  it('creates a downloadable workbook with required sheets and formulas', async () => {
    const workbook = buildEstimateWorkbook({ currency: 'USD', models: ['A.ifc'] });
    expect(workbook.type).toContain('spreadsheetml');
    expect(new Uint8Array(await workbook.arrayBuffer()).slice(0, 4)).toEqual(new Uint8Array([80, 75, 3, 4]));
    expect(costFormula('A1', 'B1', 'C1')).toContain('ROUND');
  });
});
