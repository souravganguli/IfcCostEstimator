import { readFileSync } from 'node:fs';
import { IfcAPI } from 'web-ifc';
import { Box3, Vector3 } from 'three';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { disposeModel, IfcAdapter } from '../../src/adapters/ifc';

const fixture = (name: string) => new Uint8Array(readFileSync(new URL(`../fixtures/1a/${name}`, import.meta.url)));

describe('Phase 1A_01 synthetic fixtures', () => {
  const api = new IfcAPI();
  let adapter: IfcAdapter;
  beforeAll(async () => { await api.Init(undefined, true); adapter = new IfcAdapter(api, true); });
  afterAll(() => api.Dispose());

  it('renders web-ifc geometry Y-up (IFC Z height maps to scene Y)', async () => {
    const result = await adapter.load(fixture('duplicate-ids-a.ifc'));
    const size = new Box3().setFromObject(result.group).getSize(new Vector3());
    // Authored 4 wide, 1 deep, extruded 3 tall along IFC +Z. Y-up scene => height on Y.
    expect(size.x).toBeCloseTo(4, 2);
    expect(size.y).toBeCloseTo(3, 2);
    expect(size.z).toBeCloseTo(1, 2);
    disposeModel(result.group);
  });

  it('loads two models with identical express IDs independently', async () => {
    const a = await adapter.load(fixture('duplicate-ids-a.ifc'));
    const b = await adapter.load(fixture('duplicate-ids-b.ifc'));
    const sizeA = new Box3().setFromObject(a.group).getSize(new Vector3());
    const sizeB = new Box3().setFromObject(b.group).getSize(new Vector3());
    expect(sizeA.x).toBeCloseTo(4, 2);
    expect(sizeB.x).toBeCloseTo(2, 2);
    expect(a.schema).toBe('IFC4');
    expect(b.schema).toBe('IFC4');
    disposeModel(a.group);
    disposeModel(b.group);
  });

  it('parses multi-storey IFC4 and IFC2x3 fixtures with geometry', async () => {
    const ifc4 = await adapter.load(fixture('multistorey-ifc4.ifc'));
    const ifc2x3 = await adapter.load(fixture('multistorey-ifc2x3.ifc'));
    expect(ifc4.schema).toBe('IFC4');
    expect(ifc4.group.children.length).toBeGreaterThanOrEqual(2);
    expect(ifc2x3.schema).toBe('IFC2X3');
    expect(ifc2x3.group.children.length).toBeGreaterThanOrEqual(1);
    const wall = ifc4.properties.getProperties({ modelId: 0, expressId: 57 });
    expect(wall?.metadata.name).toBe('Wall L0');
    expect(wall?.metadata.storeyName).toBe('Level 0');
    expect(wall?.groups.map((group) => group.name)).toEqual(expect.arrayContaining(['Pset_WallCommon', 'Qto_WallBaseQuantities']));
    expect(wall?.groups.find((group) => group.kind === 'qto')?.entries.find((entry) => entry.name === 'Length')?.value)
      .toEqual({ kind: 'number', value: 4 });
    const hierarchy = ifc4.hierarchy.getHierarchy(0);
    expect(hierarchy?.elementIds).toEqual(expect.arrayContaining([57, 67]));
    expect(hierarchy?.root.children.some((node) => node.label === 'Multi-storey project')).toBe(true);
    disposeModel(ifc4.group);
    disposeModel(ifc2x3.group);
  });

  it('parses unit, spatial, and aggregate edge-case fixtures', async () => {
    for (const name of ['units-millimetre.ifc', 'units-unknown.ifc', 'malformed-spatial.ifc', 'aggregate-parent-child.ifc']) {
      const result = await adapter.load(fixture(name));
      expect(result.group.children.length).toBeGreaterThan(0);
      disposeModel(result.group);
    }
  });

  it('searches model-scoped metadata and filters with AND criteria', async () => {
    const a = await adapter.load(fixture('duplicate-ids-a.ifc'), 11);
    const b = await adapter.load(fixture('duplicate-ids-b.ifc'), 12);
    const className = a.properties.getMetadata(a.elements.getAll()[0])!.ifcClass;
    const bClassName = b.properties.getMetadata(b.elements.getAll()[0])!.ifcClass;
    const aMatches = a.elements.search(className);
    const bMatches = b.elements.search(bClassName);
    expect(aMatches.length).toBeGreaterThan(0);
    expect(aMatches[0].identity).toEqual({ modelId: 11, expressId: aMatches[0].identity.expressId });
    expect(bMatches.length).toBeGreaterThan(0);
    expect(bMatches[0].identity.modelId).toBe(12);
    expect(a.elements.search(className.toUpperCase(), 1)).toHaveLength(1);
    expect(a.elements.search('wall', 0)).toEqual([]);
    const filtered = a.elements.filter([
      { field: 'IfcClass', conditions: [{ field: 'IfcClass', op: 'equals', value: className }] },
      { field: 'IfcClass', conditions: [{ field: 'IfcClass', op: 'contains', value: className }] },
    ]);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].modelId).toBe(11);
    disposeModel(a.group);
    disposeModel(b.group);
  });
});
