import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  ElementIdentity,
  ModelSession,
  ModelSummary,
  SelectionCapability,
  ViewpointCamera,
  ViewpointClippingPlane,
  ViewpointColoring,
  ViewpointComponent,
  ViewpointScene,
} from '../../src/core/contracts';
import { mountViewerViewpoints } from '../../src/features/viewer-viewpoints';
import type { LibraryStorage } from '../../src/features/viewer-viewpoints/persistence';

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
  applyColoring(c: readonly ViewpointColoring[]) { this.coloring = [...c]; }
  captureHidden() { return this.hidden; }
  applyHidden(h: readonly ViewpointComponent[]) { this.hidden = [...h]; }
  captureThumbnail() { return 'data:image/png;base64,iVBORw0KGgo='; }
}

class FakeSelection implements SelectionCapability {
  private value: ElementIdentity | null = null;
  current() { return this.value; }
  set(v: ElementIdentity | null) { this.value = v; }
  clear() { this.value = null; }
  subscribe() { return () => {}; }
}

function fakeSession(models: ModelSummary[]): ModelSession {
  return {
    getModels: () => models,
    getAsset: () => undefined,
    subscribe: () => () => {},
    enqueue: async () => {},
    toggle() {},
    remove() {},
  };
}

function memoryStorage(): LibraryStorage {
  const store = new Map<string, string>();
  return { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => void store.set(k, v) };
}

function mount(overrides: { scene?: FakeScene; session?: ModelSession; storage?: LibraryStorage; notice?: (m: string) => void } = {}) {
  const host = document.createElement('div');
  document.body.append(host);
  const tabStripHost = document.createElement('div');
  document.body.append(tabStripHost);
  const scene = overrides.scene ?? new FakeScene();
  const selection = new FakeSelection();
  const exitWalkthrough = vi.fn();
  const handle = mountViewerViewpoints(
    host,
    { scene, session: overrides.session ?? fakeSession([{ id: 1, name: 'm', state: 'loaded', visible: true }]), selection, exitWalkthrough },
    { tabStripHost, storage: overrides.storage ?? memoryStorage(), notice: overrides.notice },
  );
  return { host, tabStripHost, scene, selection, exitWalkthrough, handle };
}

afterEach(() => document.body.replaceChildren());

describe('viewer-viewpoints feature', () => {
  it('saves the current view through the dialog and opens it as a tab (R1, R5)', () => {
    const { host, tabStripHost } = mount();
    const saveButton = [...host.querySelectorAll('fluent-button')].find((b) => b.textContent === 'Save current view')!;
    saveButton.dispatchEvent(new Event('click'));
    expect(host.querySelector('.viewpoints-dialog')).toBeTruthy();
    const confirm = [...host.querySelectorAll('.viewpoints-dialog fluent-button')].find((b) => b.textContent === 'Save')!;
    confirm.dispatchEvent(new Event('click'));
    expect(host.querySelectorAll('.viewpoints-entry').length).toBe(1);
    expect(tabStripHost.querySelectorAll('.view-tab').length).toBe(1);
  });

  it('restores a saved view when its tab is activated and exits walkthrough (R10)', () => {
    const { host, scene, exitWalkthrough } = mount();
    const saveButton = [...host.querySelectorAll('fluent-button')].find((b) => b.textContent === 'Save current view')!;
    saveButton.dispatchEvent(new Event('click'));
    [...host.querySelectorAll('.viewpoints-dialog fluent-button')].find((b) => b.textContent === 'Save')!.dispatchEvent(new Event('click'));
    // Move the live camera away, then re-open the tab's label to restore.
    scene.camera = { kind: 'perspective', position: [99, 99, 99], target: [0, 0, 0], up: [0, 1, 0], fieldOfView: 45 };
    const label = host.querySelector<HTMLElement>('.viewpoints-entry-label')!;
    label.dispatchEvent(new Event('click'));
    expect(scene.camera.position).toEqual([1, 2, 3]);
    expect(exitWalkthrough).toHaveBeenCalled();
  });

  it('persists the library across remounts (AC4)', () => {
    const storage = memoryStorage();
    const first = mount({ storage });
    const saveButton = [...first.host.querySelectorAll('fluent-button')].find((b) => b.textContent === 'Save current view')!;
    saveButton.dispatchEvent(new Event('click'));
    [...first.host.querySelectorAll('.viewpoints-dialog fluent-button')].find((b) => b.textContent === 'Save')!.dispatchEvent(new Event('click'));
    first.handle.dispose();
    document.body.replaceChildren();

    const second = mount({ storage });
    expect(second.host.querySelectorAll('.viewpoints-entry').length).toBe(1);
  });

  it('warns and keeps views in memory when storage is unavailable (AC4, T5)', () => {
    const notice = vi.fn();
    const brokenStorage: LibraryStorage = { getItem: () => { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
    const { host } = mount({ storage: brokenStorage, notice });
    const saveButton = [...host.querySelectorAll('fluent-button')].find((b) => b.textContent === 'Save current view')!;
    saveButton.dispatchEvent(new Event('click'));
    [...host.querySelectorAll('.viewpoints-dialog fluent-button')].find((b) => b.textContent === 'Save')!.dispatchEvent(new Event('click'));
    // The view is still in the library (memory) even though persistence warned.
    expect(host.querySelectorAll('.viewpoints-entry').length).toBe(1);
    expect(notice).toHaveBeenCalled();
  });

  it('clears all views and closes tabs (R7)', () => {
    const { host, tabStripHost } = mount();
    const saveButton = [...host.querySelectorAll('fluent-button')].find((b) => b.textContent === 'Save current view')!;
    saveButton.dispatchEvent(new Event('click'));
    [...host.querySelectorAll('.viewpoints-dialog fluent-button')].find((b) => b.textContent === 'Save')!.dispatchEvent(new Event('click'));
    const clearAll = [...host.querySelectorAll('fluent-button')].find((b) => b.textContent === 'Clear all')!;
    clearAll.dispatchEvent(new Event('click'));
    expect(host.querySelectorAll('.viewpoints-entry').length).toBe(0);
    expect(tabStripHost.querySelectorAll('.view-tab').length).toBe(0);
  });

  it('removes all DOM and timers on dispose', () => {
    const { host, tabStripHost, handle } = mount();
    handle.dispose();
    expect(host.querySelector('.viewpoints-panel')).toBeNull();
    expect(tabStripHost.querySelector('.view-tab-strip')).toBeNull();
  });
});
