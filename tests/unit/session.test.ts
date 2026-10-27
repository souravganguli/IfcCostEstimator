import { describe, expect, it, vi } from 'vitest';
import { ModelRegistry } from '../../src/core/session';
import type { ModelAsset } from '../../src/core/contracts';

const file = () => ({ name: 'same.ifc', arrayBuffer: async () => new ArrayBuffer(8) }) as File;
const asset = (): ModelAsset => {
  let visible = true;
  return { schema: 'IFC4', get visible() { return visible; }, setVisible(value) { visible = value; }, dispose: vi.fn() };
};

describe('isolated model session public contract', () => {
  it('serializes failures, preserves independent identities, and does not expose mutable internals', async () => {
    const first = asset();
    const third = asset();
    let active = 0;
    let highest = 0;
    let attempt = 0;
    const session = new ModelRegistry(async () => {
      highest = Math.max(highest, ++active);
      await Promise.resolve();
      active--;
      if (++attempt === 2) throw new RangeError('Simulated allocation failure');
      return attempt === 1 ? first : third;
    });
    await Promise.all([session.enqueue([file(), file()]), session.enqueue([file()])]);
    expect(highest).toBe(1);
    expect(session.getModels().map((model) => model.state)).toEqual(['loaded', 'failed', 'loaded']);
    const snapshot = session.getModels()[0];
    expect(snapshot).not.toHaveProperty('asset');
    session.toggle(1);
    expect(snapshot.visible).toBe(true);
    expect(first.visible).toBe(false);
    expect(third.visible).toBe(true);
    session.remove(1);
    expect(first.dispose).toHaveBeenCalledOnce();
    expect(third.dispose).not.toHaveBeenCalled();
    session.dispose();
    session.dispose();
    expect(third.dispose).toHaveBeenCalledOnce();
  });

  it('disposes late results, stops queued work and detaches subscribers', async () => {
    let finish!: (value: ModelAsset) => void;
    let started!: () => void;
    const loading = new Promise<void>((resolve) => { started = resolve; });
    const load = vi.fn(() => { started(); return new Promise<ModelAsset>((resolve) => { finish = resolve; }); });
    const session = new ModelRegistry(load);
    const listener = vi.fn();
    const unsubscribe = session.subscribe(listener);
    const pending = session.enqueue([file(), file()]);
    await loading;
    unsubscribe();
    const calls = listener.mock.calls.length;
    session.dispose();
    const late = asset();
    finish(late);
    await pending;
    expect(late.dispose).toHaveBeenCalledOnce();
    expect(load).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledTimes(calls);
    expect(session.getModels()).toHaveLength(0);
    await session.enqueue([file()]);
    expect(session.getModels()).toHaveLength(0);
  });
});