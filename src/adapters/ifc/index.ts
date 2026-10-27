import { IfcAPI } from 'web-ifc';
import wasmUrl from 'web-ifc/web-ifc.wasm?url';
import { BufferAttribute, BufferGeometry, Color, DoubleSide, Group, Matrix4, Mesh, MeshStandardMaterial } from 'three';
import { extractModel } from './extract';
import type { HierarchyQuery, PropertyQuery } from '../../core/contracts';

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

export class IfcAdapter {
  private initialization?: Promise<void>;

  constructor(private readonly api = new IfcAPI(), private readonly initialized = false) {}

  private async ready(): Promise<void> {
    if (this.initialized) return;
    this.initialization ??= this.api.Init(() => new URL(wasmUrl, location.href).href, true).catch((error) => {
      this.initialization = undefined;
      throw error;
    });
    await this.initialization;
  }

  async load(bytes: Uint8Array, modelId = 0): Promise<{ group: Group; schema: string; properties: PropertyQuery; hierarchy: HierarchyQuery; elementIds: readonly number[] }> {
    const header = new TextDecoder().decode(bytes.subarray(0, 65536));
    if (!/^\s*ISO-10303-21;/i.test(header) || !/FILE_SCHEMA\s*\(/i.test(header)) {
      throw new Error('Invalid IFC file. Choose an uncompressed STEP .ifc file.');
    }
    await this.ready();
    let handle: number | undefined;
    const group = new Group();
    try {
      handle = this.api.OpenModel(bytes, { COORDINATE_TO_ORIGIN: false, ALLOW_INCOMPATIBLE_SCHEMA_ALIASES: false });
      if (handle < 0) throw new Error('Unsupported or invalid IFC schema.');
      const schema = this.api.GetModelSchema(handle);
      const extracted = extractModel(this.api, handle, modelId);
      this.api.StreamAllMeshes(handle, (mesh) => {
        for (let index = 0; index < mesh.geometries.size(); index++) {
          const placed = mesh.geometries.get(index);
          const raw = this.api.GetGeometry(handle!, placed.geometryExpressID);
          try {
            const vertices = this.api.GetVertexArray(raw.GetVertexData(), raw.GetVertexDataSize());
            const indices = this.api.GetIndexArray(raw.GetIndexData(), raw.GetIndexDataSize()).slice();
            if (!vertices.length || !indices.length) continue;
            const positions = new Float32Array(vertices.length / 2);
            const normals = new Float32Array(vertices.length / 2);
            for (let vertex = 0; vertex < vertices.length / 6; vertex++) {
              positions.set(vertices.subarray(vertex * 6, vertex * 6 + 3), vertex * 3);
              normals.set(vertices.subarray(vertex * 6 + 3, vertex * 6 + 6), vertex * 3);
            }
            const geometry = new BufferGeometry();
            geometry.setAttribute('position', new BufferAttribute(positions, 3));
            geometry.setAttribute('normal', new BufferAttribute(normals, 3));
            geometry.setIndex(new BufferAttribute(indices, 1));
            geometry.applyMatrix4(new Matrix4().fromArray(placed.flatTransformation));
            const material = new MeshStandardMaterial({
              color: new Color(placed.color.x, placed.color.y, placed.color.z),
              opacity: placed.color.w,
              transparent: placed.color.w < 1,
              side: DoubleSide,
              roughness: 0.75,
            });
            const object = new Mesh(geometry, material);
            object.userData.expressId = mesh.expressID;
            group.add(object);
          } finally {
            raw.delete();
          }
        }
      });
      if (!group.children.length) throw new Error('No supported 3D geometry found in this IFC file.');
      return { group, schema, properties: extracted.properties, hierarchy: extracted.hierarchy, elementIds: extracted.elementIds };
    } catch (error) {
      disposeModel(group);
      throw error;
    } finally {
      if (handle !== undefined && handle >= 0) this.api.CloseModel(handle);
    }
  }
}