import { describe, expect, it } from 'vitest';
import type {
  ElementIdentity,
  ModelAsset,
  ModelSession,
  ModelSummary,
  SelectionCapability,
  ViewpointCamera,
  ViewpointClippingPlane,
  ViewpointColoring,
  ViewpointComponent,
  ViewpointScene,
} from '../../src/core/contracts';
import { captureSnapshot, restoreSnapshot, type ViewpointCapabilities } from '../../src/features/viewer-viewpoints/scene-capture';
import { SNAPSHOT_CATEGORIES, type SnapshotCategory } from '../../src/core/saved-views';

class FakeScene implements ViewpointScene {
  camera: ViewpointCamera = { kind: 'perspective', position: [1, 2, 3], target: [0, 0, 0], up: [0, 1, 0], fieldOfView: 45 };
  clipping: ViewpointClippingPlane[] = [];
  coloring: ViewpointColoring[] = [];
  hidden: ViewpointComponent[] = [];
  captureCamera() { return this.camera; }
  applyCamera(camera: ViewpointCamera) { this.camera = camera; }
  captureClipping() { return this.clipping; }
  applyClipping(planes: readonly ViewpointClippingPlane[]) { this.clipping = [...planes]; }
  captureColoring() { return this.coloring; }
  applyColoring(coloring: readonly ViewpointColoring[]) { this.coloring = [...coloring]; }
  captureHidden() { return this.hidden; }
  applyHidden(hidden: readonly ViewpointComponent[]) { this.hidden = [...hidden]; }
  captureThumbnail() { return undefined; }
}

class FakeSelection implements SelectionCapability {
  private value: ElementIdentity | null = null;
  current() { return this.value; }
  set(identity: ElementIdentity | null) { this.value = identity; }
  clear() { this.value = null; }
  subscribe() { return () => {}; }
}

function fakeSession(models: ModelSummary[], globalIds: Record<string, string> = {}): ModelSession {
  const asset = (modelId: number): ModelAsset => ({
    schema: 'IFC4',
    visible: true,
    setVisible() {},
    dispose() {},
    properties: {
      getProperties: () => undefined,
      getMetadata: (identity) => ({ ifcClass: 'IfcWall', globalId: globalIds[`${identity.modelId}:${identity.expressId}`] }),
    },
    elements: {
      getAll: () => Object.keys(globalIds).filter((k) => Number(k.split(':')[0]) === modelId).map((k) => ({ modelId, expressId: Number(k.split(':')[1]) })),
      search: () => [],
      filter: () => [],
    },
  });
  return {
    getModels: () => models,
    getAsset: (id) => (models.some((m) => m.id === id) ? asset(id) : undefined),
    subscribe: () => () => {},
    enqueue: async () => {},
    toggle() {},
    remove() {},
  };
}

const allCategories = new Set<SnapshotCategory>(SNAPSHOT_CATEGORIES);

describe('scene capture/restore', () => {
  it('captures the categories requested and nothing else (R1)', () => {
    const scene = new FakeScene();
    scene.hidden = [{ modelId: 1, expressId: 5 }];
    scene.coloring = [{ modelId: 1, expressId: 6, color: '#ff0000' }];
    const capabilities: ViewpointCapabilities = {
      scene,
      session: fakeSession([{ id: 1, name: 'm', state: 'loaded', visible: true }]),
      selection: new FakeSelection(),
      exitWalkthrough() {},
    };

    const full = captureSnapshot(capabilities, allCategories);
    expect(full.camera?.kind).toBe('perspective');
    expect(full.visibility?.exceptions.length).toBe(1);
    expect(full.coloring?.length).toBe(1);

    const cameraOnly = captureSnapshot(capabilities, new Set<SnapshotCategory>(['camera']));
    expect(cameraOnly.camera).toBeDefined();
    expect(cameraOnly.visibility).toBeUndefined();
    expect(cameraOnly.coloring).toBeUndefined();
  });

  it('restores deterministically, replacing prior transient state (AC1, AC2)', () => {
    const scene = new FakeScene();
    const capabilities: ViewpointCapabilities = {
      scene,
      session: fakeSession([{ id: 1, name: 'm', state: 'loaded', visible: true }]),
      selection: new FakeSelection(),
      exitWalkthrough() {},
    };

    // View A: hides element 5, colors element 6 red.
    scene.hidden = [{ modelId: 1, expressId: 5 }];
    scene.coloring = [{ modelId: 1, expressId: 6, color: '#ff0000' }];
    const viewA = captureSnapshot(capabilities, allCategories);

    // View B: nothing hidden, no color.
    scene.hidden = [];
    scene.coloring = [];
    const viewB = captureSnapshot(capabilities, allCategories);

    // Switch A -> B -> A; B must not leak A's hidden/colored state.
    restoreSnapshot(capabilities, viewA);
    expect(scene.hidden).toEqual([{ modelId: 1, expressId: 5 }]);
    restoreSnapshot(capabilities, viewB);
    expect(scene.hidden).toEqual([]);
    expect(scene.coloring).toEqual([]);
    restoreSnapshot(capabilities, viewA);
    expect(scene.hidden).toEqual([{ modelId: 1, expressId: 5 }]);
    expect(scene.coloring).toEqual([{ modelId: 1, expressId: 6, color: '#ff0000' }]);
  });

  it('exits walkthrough before restoring (R10, T9)', () => {
    const scene = new FakeScene();
    let exited = 0;
    restoreSnapshot(
      { scene, session: fakeSession([]), selection: new FakeSelection(), exitWalkthrough: () => { exited += 1; } },
      { camera: scene.camera },
    );
    expect(exited).toBe(1);
  });

  it('restores camera/clipping and reports missing elements when the model is absent (AC8, T11)', () => {
    const scene = new FakeScene();
    const capabilities: ViewpointCapabilities = {
      scene,
      session: fakeSession([]), // no models loaded
      selection: new FakeSelection(),
      exitWalkthrough() {},
    };
    const snapshot = {
      camera: { kind: 'perspective', position: [9, 9, 9], target: [0, 0, 0], up: [0, 1, 0], fieldOfView: 60 } as const,
      clippingPlanes: [{ location: [0, 1, 0] as const, direction: [0, -1, 0] as const }],
      visibility: { defaultVisibility: true, viewSetupHints: { spacesVisible: true, spaceBoundariesVisible: true, openingsVisible: true }, exceptions: [{ modelId: 1, expressId: 5 }] },
      coloring: [{ modelId: 1, expressId: 6, color: '#ff0000' }],
    };
    const result = restoreSnapshot(capabilities, snapshot);
    expect(scene.camera.position).toEqual([9, 9, 9]); // camera restored
    expect(scene.clipping.length).toBe(1); // clipping restored
    expect(result.cameraOnly).toBe(true);
    expect(result.missing).toBe(2); // visibility + coloring references skipped, not dropped silently
    expect(scene.hidden).toEqual([]); // nothing invalid applied
  });

  it('matches references across sessions by GlobalId when express ids differ', () => {
    const scene = new FakeScene();
    const session = fakeSession([{ id: 2, name: 'reopened', state: 'loaded', visible: true }], { '2:77': 'GUID-X' });
    const capabilities: ViewpointCapabilities = { scene, session, selection: new FakeSelection(), exitWalkthrough() {} };
    // Imported view referenced model 1 / express 5, but the element now lives
    // in model 2 / express 77 with the same GlobalId.
    const snapshot = {
      visibility: { defaultVisibility: true, viewSetupHints: { spacesVisible: true, spaceBoundariesVisible: true, openingsVisible: true }, exceptions: [{ modelId: 1, expressId: 5, globalId: 'GUID-X' }] },
    };
    const result = restoreSnapshot(capabilities, snapshot);
    expect(result.missing).toBe(0);
    expect(scene.hidden).toEqual([{ modelId: 2, expressId: 77 }]);
  });
});
