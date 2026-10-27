import { describe, expect, it, vi } from 'vitest';
import { Group } from 'three';

const spies = vi.hoisted(() => ({
  rendererDispose: vi.fn(), controlsDispose: vi.fn(), animation: vi.fn(), disconnect: vi.fn(),
}));
vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();
  return {
    ...actual,
    WebGLRenderer: class {
      domElement = document.createElement('canvas');
      setPixelRatio() {}
      setSize() {}
      setAnimationLoop = spies.animation;
      render() {}
      dispose = spies.rendererDispose;
    },
  };
});
vi.mock('three/addons/controls/OrbitControls.js', () => ({
  OrbitControls: class {
    target = { copy: vi.fn() };
    update() {}
    dispose = spies.controlsDispose;
  },
}));
import { Viewer } from '../../src/adapters/viewer';

describe('viewer resource lifecycle', () => {
  it('tears down a lost context exactly once and reports it through its public callback', () => {
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect = spies.disconnect; });
    const container = document.createElement('div');
    const failure = vi.fn();
    const viewer = new Viewer(container, failure);
    const gridDispose = vi.spyOn(viewer.grid.geometry, 'dispose');
    const canvas = container.querySelector('canvas')!;
    viewer.add(new Group());
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    viewer.dispose();
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    expect(failure).toHaveBeenCalledOnce();
    expect(spies.rendererDispose).toHaveBeenCalledOnce();
    expect(spies.controlsDispose).toHaveBeenCalledOnce();
    expect(spies.disconnect).toHaveBeenCalledOnce();
    expect(spies.animation).toHaveBeenLastCalledWith(null);
    expect(gridDispose).toHaveBeenCalledOnce();
    expect(container.children.length).toBe(0);
    expect(viewer.scene.children).toHaveLength(0);
    vi.unstubAllGlobals();
  });
});