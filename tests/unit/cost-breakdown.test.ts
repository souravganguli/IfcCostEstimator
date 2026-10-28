import { describe, expect, it } from 'vitest';
import { mappingMatches, summarizeMappings, type Mapping } from '../../src/core/cost-breakdown';

describe('cost breakdown mapping core', () => {
  it('matches a mapping only to its exact model-scoped element', () => {
    const mapping: Mapping = { modelId: 5, expressId: 1, cbs: 'A' };
    expect(mappingMatches(mapping, 5, 1)).toBe(true);
    expect(mappingMatches(mapping, 5, 2)).toBe(false);
    expect(mappingMatches(mapping, 6, 1)).toBe(false);
  });

  it('reports everything unmapped when there are no mappings', () => {
    expect(summarizeMappings([], 3)).toEqual({ mapped: 0, unmapped: 3, quantity: 0 });
  });

  it('counts mapped items and sums override quantities, defaulting to 1 per mapping', () => {
    const mappings: Mapping[] = [
      { modelId: 5, expressId: 1, cbs: 'A', override: 3 },
      { modelId: 5, expressId: 2, cbs: 'B' },
    ];
    expect(summarizeMappings(mappings, 4)).toEqual({ mapped: 2, unmapped: 2, quantity: 4 });
  });

  it('ignores mappings that reference no CBS item', () => {
    const mappings: Mapping[] = [
      { modelId: 5, expressId: 1, cbs: '' },
      { modelId: 5, expressId: 2, cbs: 'B', override: 2 },
    ];
    expect(summarizeMappings(mappings, 2)).toEqual({ mapped: 1, unmapped: 1, quantity: 2 });
  });

  it('never reports a negative unmapped count', () => {
    const mappings: Mapping[] = [
      { modelId: 5, expressId: 1, cbs: 'A' },
      { modelId: 5, expressId: 2, cbs: 'B' },
    ];
    expect(summarizeMappings(mappings, 1).unmapped).toBe(0);
  });
});
