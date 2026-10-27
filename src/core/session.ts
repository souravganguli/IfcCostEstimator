import type { ModelAsset, ModelSession, ModelSummary } from './contracts';

type RecordState = { id: number; name: string; state: ModelSummary['state']; asset?: ModelAsset; error?: string };

export class ModelRegistry implements ModelSession {
  private readonly records = new Map<number, RecordState>();
  private readonly listeners = new Set<() => void>();
  private nextId = 1;
  private queue = Promise.resolve();
  private disposed = false;

  constructor(private readonly load: (bytes: Uint8Array, modelId: number) => Promise<ModelAsset>) {}

  getModels(): readonly ModelSummary[] {
    return [...this.records.values()].map((record) => ({
      id: record.id, name: record.name, state: record.state,
      visible: record.asset?.visible ?? false, schema: record.asset?.schema, error: record.error,
    }));
  }

  getAsset(id: number): ModelAsset | undefined {
    return this.records.get(id)?.asset;
  }

  subscribe(listener: () => void): () => void {
    if (this.disposed) return () => {};
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }

  enqueue(files: File[]): Promise<void> {
    if (this.disposed) return Promise.resolve();
    const pending = files.map((file) => {
      const record: RecordState = { id: this.nextId++, name: file.name, state: 'queued' };
      this.records.set(record.id, record);
      return { file, record };
    });
    this.notify();
    this.queue = this.queue.then(async () => {
      for (const { file, record } of pending) {
        if (this.disposed) break;
        record.state = 'loading';
        this.notify();
        await new Promise((resolve) => setTimeout(resolve, 0));
        try {
          const bytes = new Uint8Array(await file.arrayBuffer());
          if (this.disposed) break;
          const asset = await this.load(bytes, record.id);
          if (this.disposed) {
            asset.dispose();
            break;
          }
          record.asset = asset;
          record.state = 'loaded';
        } catch (error) {
          record.state = 'failed';
          record.error = error instanceof Error ? error.message : 'Unable to load model. Try another IFC file.';
        }
        if (!this.disposed) this.notify();
      }
    });
    return this.queue;
  }

  toggle(id: number): void {
    const asset = this.records.get(id)?.asset;
    if (asset) asset.setVisible(!asset.visible);
    if (!this.disposed) this.notify();
  }

  remove(id: number): void {
    const record = this.records.get(id);
    if (!record || record.state === 'loading' || record.state === 'queued') return;
    record.asset?.dispose();
    this.records.delete(id);
    if (!this.disposed) this.notify();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.records.forEach((record) => record.asset?.dispose());
    this.records.clear();
    this.notify();
    this.listeners.clear();
  }
}