import type { ElementIdentity, SelectionCapability } from './contracts';

export class SelectionStore implements SelectionCapability {
  private selected: ElementIdentity | null = null;
  private readonly listeners = new Set<(identity: ElementIdentity | null) => void>();

  current(): ElementIdentity | null {
    return this.selected;
  }

  set(identity: ElementIdentity | null): void {
    if (this.selected?.modelId === identity?.modelId && this.selected?.expressId === identity?.expressId) return;
    this.selected = identity;
    this.listeners.forEach((listener) => listener(identity));
  }

  clear(): void {
    this.set(null);
  }

  subscribe(listener: (identity: ElementIdentity | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
