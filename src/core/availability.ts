import type { Availability } from './contracts';

export class ViewerAvailability implements Availability {
  private message?: string;
  private readonly listeners = new Set<() => void>();
  get available(): boolean { return this.message === undefined; }
  get error(): string | undefined { return this.message; }
  fail(message: string): void {
    this.message = message;
    this.listeners.forEach((listener) => listener());
  }
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }
  dispose(): void { this.listeners.clear(); }
}