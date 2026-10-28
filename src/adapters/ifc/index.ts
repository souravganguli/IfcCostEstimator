import wasmUrl from 'web-ifc/web-ifc.wasm?url';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Group, Mesh, MeshStandardMaterial } from 'three';
import type {
  ElementFilterCriterion,
  ElementIdentity,
  ElementMetadata,
  ElementProperties,
  ElementQuery,
  ElementSearchResult,
  HierarchyQuery,
  ModelHierarchy,
  PropertyQuery,
} from '../../core/contracts';
import type { FieldKey } from '../../core/predicate';
import { evaluateCondition, type FieldValue } from '../../core/predicate';
import type { ModelMetadata, ElementRecord, WorkerOutboundMessage } from './metadata';

// ── Geometry disposal helper (unchanged contract) ─────────────────────────────

export function disposeModel(group: Group): void {
  group.traverse((object) => {
    if (object instanceof Mesh) {
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material.dispose());
    }
  });
  group.clear();
}

// ── Metadata → PropertyQuery / ElementQuery / HierarchyQuery ──────────────────
// Built entirely from the plain-data ModelMetadata parsed from the worker's
// gzip-compressed JSON — no web-ifc involved on the main thread.

export function buildContracts(meta: ModelMetadata, modelId: number) {
  const byId = new Map<number, ElementRecord>();
  for (const rec of meta.elements) byId.set(rec.expressId, rec);
  const elementIds = [...byId.keys()];

  const properties: PropertyQuery = {
    getMetadata(identity: ElementIdentity): ElementMetadata | undefined {
      if (identity.modelId !== modelId) return undefined;
      const rec = byId.get(identity.expressId);
      if (!rec) return undefined;
      return {
        ifcClass: rec.ifcClass,
        name: rec.name,
        globalId: rec.globalId,
        typeName: rec.typeName,
        storeyExpressId: rec.storeyExpressId,
        storeyName: rec.storeyName,
      };
    },
    getProperties(identity: ElementIdentity): ElementProperties | undefined {
      if (identity.modelId !== modelId) return undefined;
      const rec = byId.get(identity.expressId);
      if (!rec) return undefined;
      return {
        identity,
        metadata: {
          ifcClass: rec.ifcClass,
          name: rec.name,
          globalId: rec.globalId,
          typeName: rec.typeName,
          storeyExpressId: rec.storeyExpressId,
          storeyName: rec.storeyName,
        },
        groups: rec.groups,
      };
    },
  };

  const fieldValues = (expressId: number): Map<string, FieldValue> => {
    const values = new Map<string, FieldValue>();
    const rec = byId.get(expressId);
    if (!rec) return values;
    values.set('IfcClass', { kind: 'text', value: rec.ifcClass });
    if (rec.name !== undefined) values.set('Name', { kind: 'text', value: rec.name });
    if (rec.globalId !== undefined) values.set('GlobalId', { kind: 'text', value: rec.globalId });
    if (rec.typeName !== undefined) values.set('TypeName', { kind: 'text', value: rec.typeName });
    if (rec.storeyName !== undefined) values.set('Storey', { kind: 'text', value: rec.storeyName });
    rec.groups.forEach((group) =>
      group.entries.forEach((entry) => values.set(`${group.name}.${entry.name}`, entry.value)),
    );
    return values;
  };

  const elements: ElementQuery = {
    getAll: () => elementIds.map((expressId) => ({ modelId, expressId })),

    search(query: string, limit = 100): readonly ElementSearchResult[] {
      const needle = query.trim().toLocaleLowerCase();
      if (!needle || limit <= 0) return [];
      const results: ElementSearchResult[] = [];
      for (const expressId of elementIds) {
        const rec = byId.get(expressId);
        if (!rec) continue;
        const matched: Array<ElementSearchResult['matchedFields'][number]> = [];
        if (rec.name?.toLocaleLowerCase().includes(needle)) matched.push('name');
        if (rec.globalId?.toLocaleLowerCase().includes(needle)) matched.push('globalId');
        if (rec.ifcClass.toLocaleLowerCase().includes(needle)) matched.push('ifcClass');
        if (!matched.includes('property') && [...fieldValues(expressId)].some(([key, value]) => {
          if (key.toLocaleLowerCase().includes(needle)) return true;
          if (value.kind === 'text' || value.kind === 'enum') return value.value.toLocaleLowerCase().includes(needle);
          if (value.kind === 'number' || value.kind === 'boolean') return String(value.value).includes(needle);
          return false;
        })) matched.push('property');
        if (matched.length) {
          results.push({ identity: { modelId, expressId }, metadata: properties.getMetadata({ modelId, expressId })!, matchedFields: matched });
        }
        if (results.length >= limit) break;
      }
      const priority: Record<string, number> = { name: 0, globalId: 1, ifcClass: 2, property: 3 };
      return results.sort((a, b) => priority[a.matchedFields[0]] - priority[b.matchedFields[0]]);
    },

    filter(criteria: readonly ElementFilterCriterion[]): readonly ElementIdentity[] {
      return elementIds
        .map((expressId) => ({ modelId, expressId }))
        .filter((identity) =>
          criteria.every((criterion) => {
            const values = fieldValues(identity.expressId);
            const value = values.get(criterion.field as FieldKey);
            return criterion.conditions.length > 0 &&
              criterion.conditions.some((cond) => evaluateCondition(() => value, cond) === 'match');
          }),
        );
    },
  };

  const hierarchy: HierarchyQuery = {
    getHierarchy(id: number): ModelHierarchy | undefined {
      if (id !== modelId) return undefined;
      return { modelId, root: meta.hierarchy, elementIds };
    },
  };

  return { properties, elements, hierarchy, elementIds };
}

// ── GLB → Three.js Group via GLTFLoader ───────────────────────────────────────

function loadGlb(glb: ArrayBuffer): Promise<Group> {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.parse(
      glb,
      '',
      (gltf) => {
        // Propagate expressId from node userData (set via extras in the GLB)
        // and mark materials as double-sided, matching the original behaviour.
        gltf.scene.traverse((object) => {
          if (object instanceof Mesh) {
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach((mat) => {
              if (mat instanceof MeshStandardMaterial) mat.side = 2; // DoubleSide = 2
            });
            // GLTFLoader copies extras into userData automatically
          }
        });
        resolve(gltf.scene);
      },
      reject,
    );
  });
}

async function gunzip(data: ArrayBuffer): Promise<Uint8Array> {
  const ds = new DecompressionStream('gzip');
  const writer = ds.writable.getWriter();
  writer.write(new Uint8Array(data));
  writer.close();
  const chunks: Uint8Array[] = [];
  const reader = ds.readable.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((sum, c) => sum + c.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.byteLength; }
  return out;
}

// ── Public adapter ────────────────────────────────────────────────────────────

export interface AdapterResult {
  readonly group: Group;
  readonly schema: string;
  readonly properties: PropertyQuery;
  readonly hierarchy: HierarchyQuery;
  readonly elements: ElementQuery;
  readonly elementIds: readonly number[];
}

export class IfcAdapter {
  private worker: Worker | null = null;
  private nextId = 1;

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    }
    return this.worker;
  }

  async load(bytes: Uint8Array, modelId = 0): Promise<AdapterResult> {
    const id = this.nextId++;
    const resolvedWasmUrl = new URL(wasmUrl, location.href).href;

    return new Promise<AdapterResult>((resolve, reject) => {
      const worker = this.getWorker();

      const onMessage = async (event: MessageEvent<WorkerOutboundMessage>) => {
        const msg = event.data;
        if (msg.id !== id) return;

        if (msg.type === 'result') {
          worker.removeEventListener('message', onMessage);
          worker.removeEventListener('error', onError);
          try {
            const [group, metaJson] = await Promise.all([
              loadGlb(msg.glb),
              gunzip(msg.metaGz).then((bytes) => JSON.parse(new TextDecoder().decode(bytes)) as ModelMetadata),
            ]);
            group.userData.modelId = modelId;
            // Stamp each mesh with modelId so the viewer's pick/highlight can resolve it
            group.traverse((obj) => {
              if (obj instanceof Mesh) obj.userData.modelId = modelId;
            });
            const contracts = buildContracts(metaJson, modelId);
            resolve({ group, schema: msg.schema, ...contracts });
          } catch (err) {
            reject(err instanceof Error ? err : new Error(String(err)));
          }
          return;
        }

        if (msg.type === 'error') {
          worker.removeEventListener('message', onMessage);
          worker.removeEventListener('error', onError);
          reject(new Error(msg.message));
        }
        // 'progress' messages are informational; ignored here but available for
        // a future loading-progress indicator.
      };

      const onError = (event: ErrorEvent) => {
        worker.removeEventListener('message', onMessage);
        worker.removeEventListener('error', onError);
        reject(new Error(event.message ?? 'IFC worker crashed.'));
      };

      worker.addEventListener('message', onMessage);
      worker.addEventListener('error', onError);

      // Transfer the buffer to the worker — zero copy
      worker.postMessage(
        { type: 'load', id, bytes: bytes.buffer, wasmUrl: resolvedWasmUrl },
        [bytes.buffer],
      );
    });
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
  }
}