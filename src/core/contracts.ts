export interface ModelAsset {
  readonly schema: string;
  readonly visible: boolean;
  setVisible(visible: boolean): void;
  dispose(): void;
}

export interface ModelSummary {
  readonly id: number;
  readonly name: string;
  readonly state: 'queued' | 'loading' | 'loaded' | 'failed';
  readonly visible: boolean;
  readonly schema?: string;
  readonly error?: string;
}

export interface ModelSession {
  getModels(): readonly ModelSummary[];
  subscribe(listener: () => void): () => void;
  enqueue(files: File[]): Promise<void>;
  toggle(id: number): void;
  remove(id: number): void;
}

export interface Availability {
  readonly available: boolean;
  readonly error: string | undefined;
  subscribe(listener: () => void): () => void;
}

export interface ViewerControls {
  fit(): void;
  setGridVisible(visible: boolean): void;
}

export interface FeatureHandle {
  dispose(): void;
}