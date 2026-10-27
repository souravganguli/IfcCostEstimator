import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ModelSession, ModelSummary } from '../../src/core/contracts';
import { ViewerAvailability } from '../../src/core/availability';
import { mountIfcLoading } from '../../src/features/ifc-loading';
import { mountModelControls } from '../../src/features/model-controls';
import { mountNavigation } from '../../src/features/viewer-navigation';
import { mountSettings } from '../../src/features/viewer-settings';
import { mountFeedback } from '../../src/features/loading-and-errors';

function sessionStub() {
  let models: readonly ModelSummary[] = [];
  const listeners = new Set<() => void>();
  const session: ModelSession = {
    getModels: () => models,
    getAsset: () => undefined,
    subscribe: (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    enqueue: vi.fn(async () => {}), toggle: vi.fn(), remove: vi.fn(),
  };
  return {
    session, listeners,
    update(next: readonly ModelSummary[]) { models = next; listeners.forEach((listener) => listener()); },
  };
}
const host = () => { const element = document.createElement('div'); document.body.append(element); return element; };
afterEach(() => document.body.replaceChildren());

describe('isolated feature public interfaces', () => {
  it('file loading owns its picker and removes handlers and availability subscription', async () => {
    const target = host();
    const availability = new ViewerAvailability();
    const { session } = sessionStub();
    const feature = mountIfcLoading(target, session, availability);
    const picker = target.querySelector('input')!;
    const button = target.querySelector('button')!;
    const file = new File(['test'], 'test.ifc');
    Object.defineProperty(picker, 'files', { value: [file] });
    picker.dispatchEvent(new Event('change'));
    expect(session.enqueue).toHaveBeenCalledWith([file]);
    availability.fail('Graphics unavailable');
    expect(button.disabled).toBe(true);
    feature.dispose();
    picker.dispatchEvent(new Event('change'));
    expect(session.enqueue).toHaveBeenCalledOnce();
    expect(target.children.length).toBe(0);
    availability.fail('Later event');
    expect(target.children.length).toBe(0);
  });

  it('model controls update through summaries and detach all row/toggle listeners', () => {
    const panel = host();
    panel.id = 'models';
    const toggleHost = host();
    const { session, listeners, update } = sessionStub();
    const collapse = vi.fn();
    const feature = mountModelControls(panel, toggleHost, session, collapse);
    update([{ id: 8, name: '<unsafe>.ifc', state: 'loaded', schema: 'IFC4', visible: true }]);
    expect(panel.querySelector('strong')!.textContent).toBe('<unsafe>.ifc');
    expect(panel.querySelector('unsafe')).toBeNull();
    const visibility = panel.querySelector<HTMLButtonElement>('[aria-label="Hide model 8"]')!;
    const remove = panel.querySelector<HTMLButtonElement>('[aria-label="Remove model 8"]')!;
    const toggle = toggleHost.querySelector('button')!;
    visibility.click();
    remove.click();
    toggle.click();
    expect(session.toggle).toHaveBeenCalledWith(8);
    expect(session.remove).toHaveBeenCalledWith(8);
    expect(collapse).toHaveBeenLastCalledWith(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    feature.dispose();
    expect(listeners.size).toBe(0);
    visibility.click();
    remove.click();
    toggle.click();
    expect(session.toggle).toHaveBeenCalledOnce();
    expect(session.remove).toHaveBeenCalledOnce();
    expect(collapse).toHaveBeenLastCalledWith(false);
  });

  it('navigation depends only on visible summaries and does not outlive its mount', () => {
    const target = host();
    const { session, listeners, update } = sessionStub();
    const availability = new ViewerAvailability();
    const fit = vi.fn();
    const feature = mountNavigation(target, session, availability, { fit });
    const button = target.querySelector('button')!;
    expect(button.disabled).toBe(true);
    update([{ id: 1, name: 'model', state: 'loaded', visible: true }]);
    button.click();
    expect(fit).toHaveBeenCalledOnce();
    availability.fail('Context lost');
    expect(button.disabled).toBe(true);
    feature.dispose();
    expect(listeners.size).toBe(0);
    button.disabled = false;
    button.click();
    expect(fit).toHaveBeenCalledOnce();
  });

  it('settings own their DOM, pass persistence failures as notices, and can remount', () => {
    const target = host();
    const setGridVisible = vi.fn();
    const notice = vi.fn();
    const storage = { getItem: () => null, setItem: () => { throw new Error('QuotaExceeded'); } };
    const feature = mountSettings(target, storage, { setGridVisible }, notice);
    const checkbox = target.querySelector('input')!;
    checkbox.click();
    expect(setGridVisible).toHaveBeenLastCalledWith(false);
    expect(notice).toHaveBeenLastCalledWith('Settings kept for this session');
    feature.dispose();
    checkbox.click();
    expect(notice).toHaveBeenCalledOnce();
    const remounted = mountSettings(target, storage, { setGridVisible }, notice);
    expect(target.querySelectorAll('input').length).toBe(1);
    remounted.dispose();
  });

  it('feedback keeps graphics errors authoritative and unsubscribes without touching another feature', () => {
    const overlay = host();
    const footer = host();
    const sibling = host();
    sibling.textContent = 'Other feature';
    const { session, listeners, update } = sessionStub();
    const availability = new ViewerAvailability();
    const feature = mountFeedback(overlay, footer, session, availability);
    update([{ id: 1, name: 'model', state: 'loading', visible: false }]);
    expect(footer.textContent).toContain('Loading model #1');
    availability.fail('Graphics context lost');
    feature.notice('Settings saved');
    expect(footer.textContent).toContain('Viewer unavailable');
    expect(overlay.querySelector('[role=alert]')!.textContent).toBe('Graphics context lost');
    feature.dispose();
    update([]);
    availability.fail('Another event');
    expect(listeners.size).toBe(0);
    expect(overlay.children.length).toBe(0);
    expect(footer.children.length).toBe(0);
    expect(sibling.textContent).toBe('Other feature');
  });
});