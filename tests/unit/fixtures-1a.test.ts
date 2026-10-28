import { readFileSync } from 'node:fs';
import { IfcAPI } from 'web-ifc';
import { Box3, Vector3 } from 'three';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildContracts, disposeModel } from '../../src/adapters/ifc';
import { processModel } from '../../src/adapters/ifc/ifc-processor';

const fixture = (name: string) => new Uint8Array(readFileSync(new URL(`../fixtures/1a/${name}`, import.meta.url)));

/** Open, process, and close a model; returns GLB bounds info and contracts for assertions. */
function loadFixture(api: IfcAPI, bytes: Uint8Array, modelId = 0) {
  const handle = api.OpenModel(bytes, { COORDINATE_TO_ORIGIN: false, ALLOW_INCOMPATIBLE_SCHEMA_ALIASES: false });
  try {
    const { glb, metadata } = processModel(api, handle);
    const contracts = buildContracts(metadata, modelId);
    return { glb, metadata, schema: metadata.schema, ...contracts };
  } finally {
    api.CloseModel(handle);
  }
}

describe('Phase 1A_01 synthetic fixtures', () => {
  const api = new IfcAPI();
  beforeAll(async () => { await api.Init(undefined, true); });
  afterAll(() => api.Dispose());

  it('produces a valid GLB for the duplicate-ids-a fixture', () => {
    const result = loadFixture(api, fixture('duplicate-ids-a.ifc'));
    expect(result.glb.byteLength).toBeGreaterThan(0);
    expect(result.schema).toBe('IFC4');
  });

  it('loads two models with identical express IDs independently', () => {
    const a = loadFixture(api, fixture('duplicate-ids-a.ifc'), 11);
    const b = loadFixture(api, fixture('duplicate-ids-b.ifc'), 12);
    expect(a.schema).toBe('IFC4');
    expect(b.schema).toBe('IFC4');
    expect(a.elementIds.length).toBeGreaterThan(0);
    expect(b.elementIds.length).toBeGreaterThan(0);
    // element identities are scoped to their respective modelIds
    expect(a.elements.getAll()[0].modelId).toBe(11);
    expect(b.elements.getAll()[0].modelId).toBe(12);
  });

  it('parses multi-storey IFC4 and IFC2x3 fixtures with metadata', () => {
    const ifc4 = loadFixture(api, fixture('multistorey-ifc4.ifc'));
    const ifc2x3 = loadFixture(api, fixture('multistorey-ifc2x3.ifc'));
    expect(ifc4.schema).toBe('IFC4');
    expect(ifc2x3.schema).toBe('IFC2X3');
    const wall = ifc4.properties.getProperties({ modelId: 0, expressId: 57 });
    expect(wall?.metadata.name).toBe('Wall L0');
    expect(wall?.metadata.storeyName).toBe('Level 0');
    expect(wall?.groups.map((g) => g.name)).toEqual(expect.arrayContaining(['Pset_WallCommon', 'Qto_WallBaseQuantities']));
    expect(wall?.groups.find((g) => g.kind === 'qto')?.entries.find((e) => e.name === 'Length')?.value)
      .toEqual({ kind: 'number', value: 4 });
    const hierarchy = ifc4.hierarchy.getHierarchy(0);
    expect(hierarchy?.elementIds).toEqual(expect.arrayContaining([57, 67]));
    expect(hierarchy?.root.label === 'Multi-storey project' ||
      hierarchy?.root.children.some((node) => node.label === 'Multi-storey project')).toBe(true);
  });

  it('parses unit, spatial, and aggregate edge-case fixtures', () => {
    for (const name of ['units-millimetre.ifc', 'units-unknown.ifc', 'malformed-spatial.ifc', 'aggregate-parent-child.ifc']) {
      const result = loadFixture(api, fixture(name));
      expect(result.glb.byteLength).toBeGreaterThan(0);
    }
  });

  it('searches model-scoped metadata and filters with AND criteria', () => {
    const a = loadFixture(api, fixture('duplicate-ids-a.ifc'), 11);
    const b = loadFixture(api, fixture('duplicate-ids-b.ifc'), 12);
    const aFirst = a.elements.getAll()[0];
    const bFirst = b.elements.getAll()[0];
    expect(aFirst).toBeDefined();
    expect(bFirst).toBeDefined();
    const className = a.properties.getMetadata(aFirst)!.ifcClass;
    const bClassName = b.properties.getMetadata(bFirst)!.ifcClass;
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
  });
});
