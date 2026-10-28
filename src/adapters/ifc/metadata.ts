/**
 * Shared types for the IFC worker's metadata output.
 *
 * These are plain-data interfaces serialised to JSON + gzip by the worker and
 * deserialised on the main thread. They intentionally mirror the app contracts
 * (ElementMetadata, FieldGroup, HierarchyNode) so the adapter can build those
 * contracts with zero conversion work after JSON.parse().
 */
import type { FieldGroup, HierarchyNode } from '../../core/contracts';

/** One IFC element's identity, metadata and property/quantity sets. */
export interface ElementRecord {
  readonly expressId: number;
  readonly ifcClass: string;
  readonly name?: string;
  readonly globalId?: string;
  readonly typeName?: string;
  readonly storeyExpressId?: number;
  readonly storeyName?: string;
  readonly groups: readonly FieldGroup[];
}

/** The full metadata payload produced by the worker for one IFC file. */
export interface ModelMetadata {
  readonly version: 1;
  readonly schema: string;
  readonly elements: readonly ElementRecord[];
  readonly hierarchy: HierarchyNode;
}

// ── Messages sent from the main thread to the worker ──────────────────────────

export interface WorkerLoadRequest {
  readonly type: 'load';
  readonly id: number;
  readonly bytes: ArrayBuffer;
  readonly wasmUrl: string;
}

// ── Messages sent from the worker back to the main thread ─────────────────────

export interface WorkerProgressMessage {
  readonly type: 'progress';
  readonly id: number;
  readonly phase: 'geometry' | 'metadata';
  readonly done: number;
  readonly total: number;
}

export interface WorkerResultMessage {
  readonly type: 'result';
  readonly id: number;
  readonly glb: ArrayBuffer;
  readonly metaGz: ArrayBuffer;
  readonly schema: string;
}

export interface WorkerErrorMessage {
  readonly type: 'error';
  readonly id: number;
  readonly message: string;
}

export type WorkerInboundMessage = WorkerLoadRequest;
export type WorkerOutboundMessage = WorkerProgressMessage | WorkerResultMessage | WorkerErrorMessage;
