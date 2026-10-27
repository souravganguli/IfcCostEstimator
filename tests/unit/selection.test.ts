import { describe, expect, it, vi } from 'vitest';
import { SelectionStore } from '../../src/core/selection';

describe('SelectionStore', () => {
  it('publishes model-scoped replacements and clear events without duplicate notifications', () => {
    const store = new SelectionStore();
    const listener = vi.fn();
    const dispose = store.subscribe(listener);
    store.set({ modelId: 1, expressId: 4 });
    store.set({ modelId: 1, expressId: 4 });
    store.set({ modelId: 2, expressId: 4 });
    store.clear();
    expect(listener).toHaveBeenNthCalledWith(1, { modelId: 1, expressId: 4 });
    expect(listener).toHaveBeenNthCalledWith(2, { modelId: 2, expressId: 4 });
    expect(listener).toHaveBeenNthCalledWith(3, null);
    dispose();
    store.set({ modelId: 3, expressId: 1 });
    expect(listener).toHaveBeenCalledTimes(3);
  });
});
