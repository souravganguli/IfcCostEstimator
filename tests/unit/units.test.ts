import { describe, expect, it } from 'vitest';
import { CANONICAL_UNIT, isRateCompatible, normalizeUnit, toMetric, unitKind } from '../../src/core/units';

describe('metric normalization', () => {
  it('normalizes equivalent unit spellings to one canonical unit', () => {
    expect(normalizeUnit('m2')).toBe('m2');
    expect(normalizeUnit('m²')).toBe('m2');
    expect(normalizeUnit(' SQM ')).toBe('m2');
    expect(normalizeUnit('Square Metre')).toBe('m2');
    expect(normalizeUnit('millimetre')).toBe('m');
  });

  it('converts SI and imperial values with exact factors', () => {
    expect(toMetric(4000, 'mm')).toEqual({ ok: true, value: 4, unit: 'm', kind: 'length' });
    expect(toMetric(1, 'ft')).toMatchObject({ ok: true, unit: 'm', kind: 'length' });
    const foot = toMetric(1, 'ft');
    expect(foot.ok && foot.value).toBeCloseTo(0.3048, 6);
    const sqft = toMetric(1, 'sqft');
    expect(sqft.ok && sqft.value).toBeCloseTo(0.09290304, 8);
    expect(toMetric(1, 'tonne')).toEqual({ ok: true, value: 1000, unit: 'kg', kind: 'weight' });
  });

  it('flags unknown units instead of assuming metric', () => {
    expect(toMetric(5, 'furlong')).toEqual({ ok: false, reason: 'unknown-unit' });
    expect(normalizeUnit('furlong')).toBeUndefined();
    expect(unitKind('furlong')).toBeUndefined();
  });

  it('checks rate/quantity-kind compatibility', () => {
    expect(isRateCompatible('m2', 'area')).toBe(true);
    expect(isRateCompatible('m²', 'area')).toBe(true);
    expect(isRateCompatible('m', 'area')).toBe(false);
    expect(CANONICAL_UNIT.volume).toBe('m3');
  });
});
