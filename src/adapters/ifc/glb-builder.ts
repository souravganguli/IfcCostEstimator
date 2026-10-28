/**
 * Minimal GLB 2.0 writer.
 *
 * Builds a binary GLB file from a list of mesh records. Each record carries
 * pre-computed Float32 positions/normals and Uint32 indices plus a flat RGBA
 * colour and the IFC expressId of the owning element.
 *
 * The output contains:
 *   - One glTF mesh primitive per input record (positions, normals, indices).
 *   - One glTF material per unique RGBA colour (deduplicated).
 *   - One glTF node per mesh, with expressId in node.extras.expressId so the
 *     Three.js GLTFLoader propagates it to userData automatically.
 *   - A single binary buffer chunk containing all accessors interleaved.
 *
 * No external dependencies — pure TypeScript with typed arrays.
 */

export interface MeshRecord {
  readonly expressId: number;
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  readonly indices: Uint32Array;
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

interface ColorKey {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

function colorKey(r: number, g: number, b: number, a: number): string {
  return `${r.toFixed(4)},${g.toFixed(4)},${b.toFixed(4)},${a.toFixed(4)}`;
}

function alignTo4(n: number): number {
  return Math.ceil(n / 4) * 4;
}

function pad(buf: Uint8Array, targetLength: number, fillByte = 0x20): Uint8Array {
  if (buf.length === targetLength) return buf;
  const out = new Uint8Array(targetLength);
  out.fill(fillByte);
  out.set(buf);
  return out;
}

/**
 * Builds a GLB binary from an array of mesh records.
 * Returns the GLB as an ArrayBuffer, or null when records is empty.
 */
export function buildGlb(records: readonly MeshRecord[]): ArrayBuffer | null {
  if (!records.length) return null;

  // ── 1. Collect unique materials ────────────────────────────────────────────
  const materialIndexByKey = new Map<string, number>();
  const materials: ColorKey[] = [];
  for (const rec of records) {
    const key = colorKey(rec.r, rec.g, rec.b, rec.a);
    if (!materialIndexByKey.has(key)) {
      materialIndexByKey.set(key, materials.length);
      materials.push({ r: rec.r, g: rec.g, b: rec.b, a: rec.a });
    }
  }

  // ── 2. Pack binary buffer ──────────────────────────────────────────────────
  // Layout per record:
  //   [positions: Float32 * count*3] [normals: Float32 * count*3] [indices: Uint32 * indexCount]
  // Each section is 4-byte aligned (Float32/Uint32 are inherently aligned if we
  // track byte offsets correctly).

  interface AccessorInfo {
    readonly posOffset: number;
    readonly posCount: number;
    readonly normOffset: number;
    readonly idxOffset: number;
    readonly idxCount: number;
    readonly minXYZ: readonly [number, number, number];
    readonly maxXYZ: readonly [number, number, number];
  }

  const accessors: AccessorInfo[] = [];
  const binaryChunks: Uint8Array[] = [];
  let binaryOffset = 0;

  for (const rec of records) {
    const posBytes = rec.positions.byteLength;
    const normBytes = rec.normals.byteLength;
    const idxBytes = rec.indices.byteLength;

    const posOffset = binaryOffset;
    binaryChunks.push(new Uint8Array(rec.positions.buffer, rec.positions.byteOffset, posBytes));
    binaryOffset += posBytes;

    const normOffset = binaryOffset;
    binaryChunks.push(new Uint8Array(rec.normals.buffer, rec.normals.byteOffset, normBytes));
    binaryOffset += normBytes;

    // Align indices to 4 bytes (Uint32 requires 4-byte alignment)
    if (binaryOffset % 4 !== 0) {
      const pad4 = new Uint8Array(4 - (binaryOffset % 4));
      binaryChunks.push(pad4);
      binaryOffset += pad4.byteLength;
    }
    const idxOffset = binaryOffset;
    binaryChunks.push(new Uint8Array(rec.indices.buffer, rec.indices.byteOffset, idxBytes));
    binaryOffset += idxBytes;

    const posCount = rec.positions.length / 3;
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let i = 0; i < rec.positions.length; i += 3) {
      const x = rec.positions[i], y = rec.positions[i + 1], z = rec.positions[i + 2];
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }

    accessors.push({
      posOffset,
      posCount,
      normOffset,
      idxOffset,
      idxCount: rec.indices.length,
      minXYZ: [minX, minY, minZ],
      maxXYZ: [maxX, maxY, maxZ],
    });
  }

  // Concatenate binary chunks into one buffer
  const binaryLength = binaryOffset;
  const binaryData = new Uint8Array(binaryLength);
  let cursor = 0;
  for (const chunk of binaryChunks) {
    binaryData.set(chunk, cursor);
    cursor += chunk.byteLength;
  }

  // ── 3. Build glTF JSON ─────────────────────────────────────────────────────
  // Accessor indices are laid out as:
  //   For record i: posAccessor = i*3, normAccessor = i*3+1, idxAccessor = i*3+2
  const BUFFER_VIEW_PER_RECORD = 3; // pos, norm, idx
  const ACCESSOR_PER_RECORD = 3;

  const bufferViews: object[] = [];
  const gltfAccessors: object[] = [];
  const meshes: object[] = [];
  const nodes: object[] = [];

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    const acc = accessors[i];
    const matIndex = materialIndexByKey.get(colorKey(rec.r, rec.g, rec.b, rec.a))!;

    const bvBase = i * BUFFER_VIEW_PER_RECORD;
    const accBase = i * ACCESSOR_PER_RECORD;

    // Buffer views: positions, normals, indices
    bufferViews.push({ buffer: 0, byteOffset: acc.posOffset, byteLength: acc.posCount * 3 * 4, target: 34962 });
    bufferViews.push({ buffer: 0, byteOffset: acc.normOffset, byteLength: acc.posCount * 3 * 4, target: 34962 });
    bufferViews.push({ buffer: 0, byteOffset: acc.idxOffset, byteLength: acc.idxCount * 4, target: 34963 });

    // Accessors: VEC3 float positions, VEC3 float normals, SCALAR uint32 indices
    gltfAccessors.push({
      bufferView: bvBase, byteOffset: 0, componentType: 5126, count: acc.posCount,
      type: 'VEC3', min: acc.minXYZ, max: acc.maxXYZ,
    });
    gltfAccessors.push({
      bufferView: bvBase + 1, byteOffset: 0, componentType: 5126, count: acc.posCount, type: 'VEC3',
    });
    gltfAccessors.push({
      bufferView: bvBase + 2, byteOffset: 0, componentType: 5125, count: acc.idxCount, type: 'SCALAR',
    });

    meshes.push({
      primitives: [{
        attributes: { POSITION: accBase, NORMAL: accBase + 1 },
        indices: accBase + 2,
        material: matIndex,
      }],
    });

    nodes.push({
      mesh: i,
      extras: { expressId: rec.expressId },
    });
  }

  const gltfMaterials = materials.map((col) => {
    const isTransparent = col.a < 1.0;
    return {
      pbrMetallicRoughness: {
        baseColorFactor: [col.r, col.g, col.b, col.a],
        metallicFactor: 0.0,
        roughnessFactor: 0.75,
      },
      doubleSided: true,
      alphaMode: isTransparent ? 'BLEND' : 'OPAQUE',
    };
  });

  const nodeIndices = records.map((_, i) => i);
  const gltfJson = {
    asset: { version: '2.0', generator: 'IfcCostEstimator' },
    scene: 0,
    scenes: [{ nodes: nodeIndices }],
    nodes,
    meshes,
    materials: gltfMaterials,
    accessors: gltfAccessors,
    bufferViews,
    buffers: [{ byteLength: binaryLength }],
  };

  // ── 4. Encode JSON chunk ───────────────────────────────────────────────────
  const jsonBytes = new TextEncoder().encode(JSON.stringify(gltfJson));
  const jsonChunkLength = alignTo4(jsonBytes.byteLength);
  const jsonChunk = pad(jsonBytes, jsonChunkLength, 0x20); // space-padded

  // ── 5. Align binary chunk ──────────────────────────────────────────────────
  const binChunkLength = alignTo4(binaryLength);
  const binChunk = binaryLength === binChunkLength ? binaryData : pad(binaryData, binChunkLength, 0x00);

  // ── 6. Assemble GLB ───────────────────────────────────────────────────────
  // GLB header: magic(4) + version(4) + length(4) = 12 bytes
  // JSON chunk header: length(4) + type(4) = 8 bytes  then json data
  // BIN  chunk header: length(4) + type(4) = 8 bytes  then bin data
  const totalLength = 12 + 8 + jsonChunkLength + 8 + binChunkLength;
  const glb = new ArrayBuffer(totalLength);
  const view = new DataView(glb);

  // GLB header
  view.setUint32(0, 0x46546C67, true);  // magic: 'glTF'
  view.setUint32(4, 2, true);            // version: 2
  view.setUint32(8, totalLength, true);

  // JSON chunk
  view.setUint32(12, jsonChunkLength, true);
  view.setUint32(16, 0x4E4F534A, true); // chunk type: 'JSON'
  new Uint8Array(glb, 20, jsonChunkLength).set(jsonChunk);

  // BIN chunk
  const binStart = 20 + jsonChunkLength;
  view.setUint32(binStart, binChunkLength, true);
  view.setUint32(binStart + 4, 0x004E4942, true); // chunk type: 'BIN\0'
  new Uint8Array(glb, binStart + 8, binChunkLength).set(binChunk);

  return glb;
}
