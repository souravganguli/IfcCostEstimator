import { describe, expect, it } from 'vitest';
import {
  buildZip,
  exportBcfZip,
  importBcfZip,
  parseVisualizationInfo,
  readZip,
  visualizationInfoXml,
} from '../../src/core/bcf-zip';
import { createSavedView, type SavedViewSnapshot } from '../../src/core/saved-views';

const snapshot: SavedViewSnapshot = {
  camera: { kind: 'perspective', position: [10, 5, 10], target: [0, 0, 0], up: [0, 1, 0], fieldOfView: 50 },
  clippingPlanes: [{ location: [0, 1, 0], direction: [0, -1, 0] }],
  visibility: {
    defaultVisibility: true,
    viewSetupHints: { spacesVisible: true, spaceBoundariesVisible: true, openingsVisible: true },
    exceptions: [{ modelId: 1, expressId: 42, globalId: 'GUID-42' }],
  },
  selection: [{ modelId: 1, expressId: 7, globalId: 'GUID-7' }],
  coloring: [{ modelId: 1, expressId: 9, color: '#ffcc00', globalId: 'GUID-9' }],
};

describe('store-only ZIP container', () => {
  it('round-trips arbitrary entries', () => {
    const data = new TextEncoder().encode('hello world');
    const archive = buildZip([{ name: 'folder/file.txt', data }]);
    const files = readZip(archive);
    expect(files.has('folder/file.txt')).toBe(true);
    expect(new TextDecoder().decode(files.get('folder/file.txt')!)).toBe('hello world');
  });
});

describe('BCF-ZIP export/import (T6)', () => {
  it('recreates views with lossless model-scoped references via the app sidecar', () => {
    const view = createSavedView('Storey view', snapshot, { thumbnail: 'data:image/png;base64,iVBORw0KGgo=' });
    const archive = exportBcfZip([view]);
    const imported = importBcfZip(archive);
    expect(imported.length).toBe(1);
    expect(imported[0].name).toBe('Storey view');
    expect(imported[0].snapshot.visibility?.exceptions[0]).toMatchObject({ modelId: 1, expressId: 42 });
    expect(imported[0].snapshot.coloring?.[0]).toMatchObject({ expressId: 9, color: '#ffcc00' });
    expect(imported[0].snapshot.camera?.kind).toBe('perspective');
  });

  it('emits a valid-looking bcf.version and per-view BCF files', () => {
    const view = createSavedView('V', snapshot);
    const files = readZip(exportBcfZip([view]));
    expect(files.has('bcf.version')).toBe(true);
    const names = [...files.keys()];
    expect(names.some((n) => n.endsWith('/markup.bcf'))).toBe(true);
    expect(names.some((n) => n.endsWith('/viewpoint.bcfv'))).toBe(true);
  });
});

describe('VisualizationInfo XML (cross-tool interop, T8)', () => {
  it('writes and reads a perspective camera and clipping plane', () => {
    const xml = visualizationInfoXml(snapshot, 'guid-1');
    expect(xml).toContain('<PerspectiveCamera>');
    expect(xml).toContain('<ClippingPlane>');
    const parsed = parseVisualizationInfo(xml);
    expect(parsed?.camera?.kind).toBe('perspective');
    expect(parsed?.camera?.position).toEqual([10, 5, 10]);
    // direction + position reconstructs the target
    expect(parsed?.camera?.target).toEqual([0, 0, 0]);
    expect(parsed?.clippingPlanes?.length).toBe(1);
  });

  it('writes and reads an orthographic camera', () => {
    const ortho: SavedViewSnapshot = { camera: { kind: 'orthographic', position: [0, 20, 0], target: [0, 0, 0], up: [0, 0, -1], viewToWorldScale: 30 } };
    const parsed = parseVisualizationInfo(visualizationInfoXml(ortho, 'g'));
    expect(parsed?.camera).toMatchObject({ kind: 'orthographic', viewToWorldScale: 30 });
  });

  it('ignores unknown files on import (T7)', () => {
    const view = createSavedView('V', snapshot);
    const archive = exportBcfZip([view]);
    // Append an unrelated file into a fresh archive alongside the view folder.
    const files = readZip(archive);
    const entries = [...files].map(([name, data]) => ({ name, data }));
    entries.push({ name: 'unknown/extra.bin', data: new Uint8Array([1, 2, 3]) });
    const rebuilt = buildZip(entries);
    const imported = importBcfZip(rebuilt);
    expect(imported.length).toBe(1);
  });
});
