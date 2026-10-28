import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ModelSession, ModelSummary } from '../../src/core/contracts';
import { mountDisplayControls, type DisplayViewer } from '../../src/features/display-controls';

function sessionStub(models: readonly ModelSummary[]) {
  const listeners = new Set<() => void>();
  const session: ModelSession = {
    getModels: () => models,
    getAsset: () => undefined,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    enqueue: vi.fn(async () => {}),
    toggle: vi.fn(),
    remove: vi.fn(),
  };
  return { session, notify: () => listeners.forEach((listener) => listener()) };
}

const loadedModel = (id: number): ModelSummary =>
  ({ id, name: `Model ${id}`, state: 'loaded', visible: true }) as ModelSummary;

afterEach(() => document.body.replaceChildren());

describe('display controls', () => {
  it('wires per-model wireframe and opacity changes to the viewer and cleans up', () => {
    const target = document.createElement('div');
    document.body.append(target);
    const setModelDisplay = vi.fn();
    const viewer: DisplayViewer = { setModelDisplay };
    const { session } = sessionStub([loadedModel(7)]);

    const feature = mountDisplayControls(target, session, viewer);

    const wire = target.querySelector<HTMLInputElement>('fluent-checkbox')!;
    wire.checked = true;
    wire.dispatchEvent(new Event('change'));
    expect(setModelDisplay).toHaveBeenCalledWith(7, { wireframe: true });

    const opacity = target.querySelector<HTMLInputElement>('fluent-slider')!;
    opacity.value = '0.5';
    opacity.dispatchEvent(new Event('input'));
    expect(setModelDisplay).toHaveBeenCalledWith(7, { opacity: 0.5 });

    feature.dispose();
    expect(target.children.length).toBe(0);
  });

  it('renders a row only for loaded models', () => {
    const target = document.createElement('div');
    document.body.append(target);
    const viewer: DisplayViewer = { setModelDisplay: vi.fn() };
    const { session } = sessionStub([loadedModel(1), loadedModel(2)]);

    mountDisplayControls(target, session, viewer);

    expect(target.querySelectorAll('.display-row').length).toBe(2);
  });
});
