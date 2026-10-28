import { describe, expect, it } from 'vitest';
import type {
  ElementIdentity,
  ElementProperties,
  ModelAsset,
  ModelSession,
  ModelSummary,
} from '../../src/core/contracts';
import { collectTakeoff } from '../../src/features/quantity-takeoff';

function propertiesFor(identity: ElementIdentity): ElementProperties | undefined {
  // Express id 1 carries a source quantity; id 2 has no quantities (missing data).
  if (identity.expressId === 1) {
    return {
      identity,
      metadata: { ifcClass: 'IfcWall' },
      groups: [
        {
          name: 'Qto_WallBaseQuantities',
          kind: 'qto',
          source: 'occurrence',
          entries: [{ name: 'NetSideArea', value: { kind: 'number', value: 2_000_000, unit: 'mm2' } }],
        },
      ],
    };
  }
  return { identity, metadata: { ifcClass: 'IfcWall' }, groups: [] };
}

function session(): ModelSession {
  const models: readonly ModelSummary[] = [
    { id: 10, name: 'A', state: 'loaded', visible: true },
    { id: 20, name: 'B', state: 'loaded', visible: true },
  ];
  const assetFor = (modelId: number): ModelAsset =>
    ({
      schema: 'IFC4',
      visible: true,
      properties: {
        getProperties: propertiesFor,
        getMetadata: (id: ElementIdentity) => propertiesFor(id)?.metadata,
      },
      elements: {
        getAll: () => [
          { modelId, expressId: 1 },
          { modelId, expressId: 2 },
        ],
        search: () => [],
        filter: () => [],
      },
      setVisible() {},
      dispose() {},
    }) as unknown as ModelAsset;
  return {
    getModels: () => models,
    getAsset: (id: number) => assetFor(id),
    subscribe: () => () => {},
    enqueue: async () => {},
    toggle() {},
    remove() {},
  };
}

describe('collectTakeoff', () => {
  it('groups source quantities by class, converts units, and counts contributing elements', () => {
    const rows = collectTakeoff(session(), { groupBy: 'class' });
    const area = rows.find((row) => row.key === 'IfcWall · NetSideArea');
    expect(area).toBeDefined();
    expect(area!.kind).toBe('area');
    // 2,000,000 mm² -> 2 m² per contributing element, one per model.
    expect(area!.quantity).toBeCloseTo(4, 10);
    expect(area!.count).toBe(2);
  });

  it('preserves model-scoped identities for every contributing element', () => {
    const rows = collectTakeoff(session(), { groupBy: 'class' });
    const area = rows.find((row) => row.key === 'IfcWall · NetSideArea')!;
    expect(area.identities).toEqual([
      { modelId: 10, expressId: 1 },
      { modelId: 20, expressId: 1 },
    ]);
  });

  it('excludes elements without source quantities rather than treating them as zero', () => {
    const rows = collectTakeoff(session(), { groupBy: 'class' });
    expect(rows.every((row) => row.source === 'source')).toBe(true);
    expect(rows).toHaveLength(1);
  });
});
