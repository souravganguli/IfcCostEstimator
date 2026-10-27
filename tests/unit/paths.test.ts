import { describe, expect, it } from 'vitest';
import { deploymentBase } from '../../src/paths';

describe('deployment base', () => {
  it('normalizes root and project paths', () => {
    expect(deploymentBase('/')).toBe('/');
    expect(deploymentBase('/IfcCostEstimator')).toBe('/IfcCostEstimator/');
    expect(deploymentBase('/IfcCostEstimator/')).toBe('/IfcCostEstimator/');
  });

  it.each(['https://example.com/', '//example.com/', 'relative', '/?query', '/#hash', '/bad\\path'])('rejects unsafe base %s', (value) => {
    expect(() => deploymentBase(value)).toThrow();
  });
});