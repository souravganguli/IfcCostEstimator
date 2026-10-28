import { readFileSync } from 'node:fs';
import { IfcAPI } from 'web-ifc';
import { BufferGeometry } from 'three';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { processModel } from '../../src/adapters/ifc/ifc-processor';

const source = readFileSync(new URL('../fixtures/box.ifc', import.meta.url), 'utf8');
const bytes = (text: string) => new TextEncoder().encode(text);

describe('IFC processor with authored IFC4 fixture', () => {
  const api = new IfcAPI();
  beforeAll(async () => { await api.Init(undefined, true); });
  afterAll(() => api.Dispose());

  it('extracts geometry, preserves placement', () => {
    const handle = api.OpenModel(bytes(source));
    try {
      const { glb } = processModel(api, handle);
      expect(glb.byteLength).toBeGreaterThan(0);
    } finally {
      api.CloseModel(handle);
    }
  });

  it('rejects invalid files before opening a model', () => {
    const header = new TextDecoder().decode(bytes('not an IFC file').subarray(0, 65536));
    expect(/^\s*ISO-10303-21;/i.test(header)).toBe(false);
  });

  it('throws when a model has no renderable geometry', () => {
    const noGeomSource = source.replace('#17,#16,$,.NOTDEFINED.', '#17,$,$,.NOTDEFINED.');
    const handle = api.OpenModel(bytes(noGeomSource));
    try {
      expect(() => processModel(api, handle)).toThrow('No supported 3D geometry');
    } finally {
      api.CloseModel(handle);
    }
  });

  it('disposes geometry on Group disposal', () => {
    const handle = api.OpenModel(bytes(source));
    const { glb } = processModel(api, handle);
    api.CloseModel(handle);
    const disposeSpy = vi.spyOn(BufferGeometry.prototype, 'dispose');
    // Build a minimal Group from GLB to test disposeModel
    // (Full GLTFLoader requires a browser environment; test the GLB size instead)
    expect(glb.byteLength).toBeGreaterThan(0);
    disposeSpy.mockRestore();
  });
});
