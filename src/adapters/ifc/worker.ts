/**
 * IFC loading Web Worker.
 *
 * Receives a WorkerLoadRequest with the raw IFC bytes, delegates to
 * ifc-processor for geometry + metadata extraction, gzip-compresses the
 * metadata JSON with CompressionStream, and posts the results back.
 *
 * Imported by the main thread via:
 *   new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
 * Vite bundles this as a separate chunk.
 */
import { IfcAPI } from 'web-ifc';
import { processModel } from './ifc-processor';
import type { WorkerInboundMessage, WorkerOutboundMessage, WorkerLoadRequest } from './metadata';

// `self` inside a module worker is the DedicatedWorkerGlobalScope, but the
// WebWorker lib is not enabled in tsconfig (the rest of the app targets the DOM
// lib). Describe only the two members this worker uses so postMessage and
// addEventListener are type-safe without pulling in the full worker lib.
interface WorkerScope {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  addEventListener(type: 'message', listener: (event: MessageEvent<WorkerInboundMessage>) => void): void;
}
const workerScope = self as unknown as WorkerScope;

async function gzip(data: Uint8Array): Promise<ArrayBuffer> {
  const cs = new CompressionStream('gzip');
  const writer = cs.writable.getWriter();
  void writer.write(data as Uint8Array<ArrayBuffer>);
  void writer.close();
  const chunks: Uint8Array[] = [];
  const reader = cs.readable.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((sum, c) => sum + c.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out.buffer;
}

async function handleLoad(req: WorkerLoadRequest): Promise<void> {
  const post = (msg: WorkerOutboundMessage, transfer?: Transferable[]) => workerScope.postMessage(msg, transfer ?? []);

  const bytes = new Uint8Array(req.bytes);

  const header = new TextDecoder().decode(bytes.subarray(0, 65536));
  if (!/^\s*ISO-10303-21;/i.test(header) || !/FILE_SCHEMA\s*\(/i.test(header)) {
    post({ type: 'error', id: req.id, message: 'Invalid IFC file. Choose an uncompressed STEP .ifc file.' });
    return;
  }

  const api = new IfcAPI();
  try {
    await api.Init(() => req.wasmUrl, true);
  } catch {
    post({ type: 'error', id: req.id, message: 'Failed to initialise the IFC WASM engine.' });
    return;
  }

  let handle: number | undefined;
  try {
    handle = api.OpenModel(bytes, { COORDINATE_TO_ORIGIN: false, ALLOW_INCOMPATIBLE_SCHEMA_ALIASES: false });
    if (handle < 0) {
      post({ type: 'error', id: req.id, message: 'Unsupported or invalid IFC schema.' });
      return;
    }

    post({ type: 'progress', id: req.id, phase: 'geometry', done: 0, total: 1 });
    const { glb, metadata } = processModel(api, handle);
    post({ type: 'progress', id: req.id, phase: 'geometry', done: 1, total: 1 });

    post({ type: 'progress', id: req.id, phase: 'metadata', done: 0, total: 1 });
    const metaGz = await gzip(new TextEncoder().encode(JSON.stringify(metadata)));
    post({ type: 'progress', id: req.id, phase: 'metadata', done: 1, total: 1 });

    post({ type: 'result', id: req.id, glb, metaGz, schema: metadata.schema }, [glb, metaGz]);
  } catch (error) {
    post({
      type: 'error',
      id: req.id,
      message: error instanceof Error ? error.message : 'Unknown error loading IFC file.',
    });
  } finally {
    if (handle !== undefined && handle >= 0) api.CloseModel(handle);
  }
}

workerScope.addEventListener('message', (event: MessageEvent<WorkerInboundMessage>) => {
  if (event.data.type === 'load') {
    const request = event.data;
    handleLoad(request).catch((err: unknown) => {
      workerScope.postMessage({
        type: 'error',
        id: request.id,
        message: err instanceof Error ? err.message : String(err),
      } satisfies WorkerOutboundMessage);
    });
  }
});
