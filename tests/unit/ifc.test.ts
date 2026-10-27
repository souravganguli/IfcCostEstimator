import { readFileSync } from 'node:fs';
import { IfcAPI } from 'web-ifc';
import { Box3, BufferGeometry, Material, Mesh } from 'three';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { disposeModel, IfcAdapter } from '../../src/adapters/ifc';

const source = readFileSync(new URL('../fixtures/box.ifc', import.meta.url), 'utf8');
const bytes = (text: string) => new TextEncoder().encode(text);

describe('IFC engine adapter with authored IFC4 fixture', () => {
  const api = new IfcAPI();
  let adapter: IfcAdapter;
  beforeAll(async () => { await api.Init(undefined, true); adapter = new IfcAdapter(api, true); });
  afterAll(() => api.Dispose());

  it('extracts copied geometry, preserves placement, and closes parser models', async () => {
    const close = vi.spyOn(api, 'CloseModel');
    const first = await adapter.load(bytes(source));
    const second = await adapter.load(bytes(source.replace('#19=IFCCARTESIANPOINT((0.,0.,0.));', '#19=IFCCARTESIANPOINT((8.,0.,0.));')));
    expect(first.schema).toBe('IFC4');
    expect(first.group.children.length).toBeGreaterThan(0);
    expect(new Box3().setFromObject(second.group).min.x - new Box3().setFromObject(first.group).min.x).toBeCloseTo(8);
    expect(close).toHaveBeenCalledTimes(2);
    const mesh = first.group.children[0] as Mesh;
    const dispose = vi.spyOn(mesh.geometry, 'dispose');
    disposeModel(first.group);
    expect(dispose).toHaveBeenCalledOnce();
    expect(first.group.children).toHaveLength(0);
    expect(second.group.children.length).toBeGreaterThan(0);
    disposeModel(second.group);
  });

  it('rejects invalid files without opening a parser model', async () => {
    const open = vi.spyOn(api, 'OpenModel');
    await expect(adapter.load(bytes('not an IFC file'))).rejects.toThrow('Invalid IFC');
    expect(open).not.toHaveBeenCalled();
  });

  it('closes parser state when a model has no renderable geometry', async () => {
    const close = vi.spyOn(api, 'CloseModel');
    const before = close.mock.calls.length;
    await expect(adapter.load(bytes(source.replace('#17,#16,$,.NOTDEFINED.', '#17,$,$,.NOTDEFINED.')))).rejects.toThrow('No supported 3D geometry');
    expect(close.mock.calls.length).toBe(before + 1);
    const valid = await adapter.load(bytes(source));
    expect(valid.group.children.length).toBeGreaterThan(0);
    disposeModel(valid.group);
  });

  it('disposes already-extracted geometry and parser state after a simulated allocation failure', async () => {
    const stream = api.StreamAllMeshes.bind(api);
    const geometryDispose = vi.spyOn(BufferGeometry.prototype, 'dispose');
    const materialDispose = vi.spyOn(Material.prototype, 'dispose');
    const close = vi.spyOn(api, 'CloseModel');
    const before = close.mock.calls.length;
    vi.spyOn(api, 'StreamAllMeshes').mockImplementationOnce((handle, callback) => {
      stream(handle, (mesh, index, total) => {
        callback(mesh, index, total);
        throw new RangeError('Simulated allocation failure after extraction');
      });
    });
    await expect(adapter.load(bytes(source))).rejects.toThrow('allocation failure');
    expect(geometryDispose).toHaveBeenCalled();
    expect(materialDispose).toHaveBeenCalled();
    expect(close.mock.calls.length).toBe(before + 1);
    const valid = await adapter.load(bytes(source));
    expect(valid.group.children.length).toBeGreaterThan(0);
    disposeModel(valid.group);
    geometryDispose.mockRestore();
    materialDispose.mockRestore();
  });

  it('retries initialization after a recoverable WASM initialization failure', async () => {
    const init = vi.spyOn(api, 'Init').mockRejectedValueOnce(new Error('Simulated WASM initialization failure')).mockResolvedValueOnce();
    const initializingAdapter = new IfcAdapter(api);
    await expect(initializingAdapter.load(bytes(source))).rejects.toThrow('initialization failure');
    const result = await initializingAdapter.load(bytes(source));
    expect(init).toHaveBeenCalledTimes(2);
    disposeModel(result.group);
    init.mockRestore();
  });
});