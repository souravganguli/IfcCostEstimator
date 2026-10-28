/**
 * Pure IFC processing functions.
 *
 * Runs web-ifc on an already-initialised IfcAPI instance to produce:
 *   - An array of MeshRecord (geometry, for the GLB builder)
 *   - A ModelMetadata object (properties, hierarchy, schema)
 *
 * Kept separate from the Worker entry point so unit tests can import and
 * exercise this logic directly in a Node/vitest environment without needing
 * real Web Workers, CompressionStream, or a GLTFLoader.
 */
import { IfcAPI } from 'web-ifc';
import {
  IFCBUILDING,
  IFCBUILDINGSTOREY,
  IFCPROJECT,
  IFCSITE,
  IFCSPATIALZONE,
  IFCSPACE,
  IFCZONE,
  IFCRELAGGREGATES,
  IFCRELCONTAINEDINSPATIALSTRUCTURE,
  IFCRELDEFINESBYPROPERTIES,
  IFCRELDEFINESBYTYPE,
  IFCELEMENTQUANTITY,
} from 'web-ifc';
import { buildGlb, type MeshRecord } from './glb-builder';
import type { ModelMetadata, ElementRecord } from './metadata';
import type { FieldEntry, FieldGroup, HierarchyNode } from '../../core/contracts';

// ── Internal IFC line helpers ─────────────────────────────────────────────────

type Line = Record<string, unknown> & { expressID: number; type: number };
type Ref = { value?: number };

function ref(value: unknown): number | undefined {
  return typeof value === 'object' && value !== null && typeof (value as Ref).value === 'number'
    ? (value as Ref).value : undefined;
}

function refs(value: unknown): number[] {
  return Array.isArray(value) ? value.map(ref).filter((id): id is number => id !== undefined) : [];
}

type FieldValue =
  | { kind: 'text'; value: string }
  | { kind: 'number'; value: number; unit?: string }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'enum'; value: string }
  | { kind: 'list'; value: readonly FieldValue[] }
  | { kind: 'unset' };

function scalar(value: unknown): FieldValue {
  if (value === null || value === undefined) return { kind: 'unset' };
  if (typeof value === 'boolean') return { kind: 'boolean', value };
  if (typeof value === 'number') return { kind: 'number', value };
  if (typeof value === 'string') return { kind: 'text', value };
  if (typeof value === 'object') {
    const c = value as { value?: unknown; _representationValue?: unknown; name?: unknown };
    if (c.value !== undefined) return scalar(c.value);
    if (c._representationValue !== undefined) return scalar(c._representationValue);
    if (typeof c.name === 'string') return { kind: 'enum', value: c.name };
  }
  return { kind: 'unset' };
}

function fieldName(line: Line): string | undefined {
  const n = line.Name;
  return typeof n === 'object' && n !== null && typeof (n as { value?: unknown }).value === 'string'
    ? (n as { value: string }).value : undefined;
}

function propertyValue(line: Line): FieldValue {
  const ignored = new Set(['expressID', 'type', 'Name', 'Description', 'Unit', 'Formula', 'MethodOfMeasurement', 'GlobalId']);
  for (const [key, value] of Object.entries(line)) {
    if (!ignored.has(key) && /Value$/.test(key)) return scalar(value);
  }
  return { kind: 'unset' };
}

function vectorValues(vector: { size(): number; get(index: number): number }): number[] {
  const out: number[] = [];
  for (let i = 0; i < vector.size(); i++) out.push(vector.get(i));
  return out;
}

function entityTypeName(api: IfcAPI, type: number): string {
  return api.GetNameFromTypeCode(type) || `IFC_TYPE_${type}`;
}

// ── Geometry streaming ────────────────────────────────────────────────────────

export function streamGeometry(api: IfcAPI, handle: number): MeshRecord[] {
  const records: MeshRecord[] = [];

  api.StreamAllMeshes(handle, (mesh) => {
    for (let gi = 0; gi < mesh.geometries.size(); gi++) {
      const placed = mesh.geometries.get(gi);
      const raw = api.GetGeometry(handle, placed.geometryExpressID);
      try {
        const vertices = api.GetVertexArray(raw.GetVertexData(), raw.GetVertexDataSize());
        const indices = api.GetIndexArray(raw.GetIndexData(), raw.GetIndexDataSize()).slice();
        if (!vertices.length || !indices.length) continue;

        const vertexCount = vertices.length / 6;
        const positions = new Float32Array(vertexCount * 3);
        const normals = new Float32Array(vertexCount * 3);

        for (let v = 0; v < vertexCount; v++) {
          positions[v * 3]     = vertices[v * 6];
          positions[v * 3 + 1] = vertices[v * 6 + 1];
          positions[v * 3 + 2] = vertices[v * 6 + 2];
          normals[v * 3]     = vertices[v * 6 + 3];
          normals[v * 3 + 1] = vertices[v * 6 + 4];
          normals[v * 3 + 2] = vertices[v * 6 + 5];
        }

        // Apply transformation matrix (column-major flatTransformation)
        const m = placed.flatTransformation;
        for (let v = 0; v < vertexCount; v++) {
          const px = positions[v * 3], py = positions[v * 3 + 1], pz = positions[v * 3 + 2];
          const w = m[3] * px + m[7] * py + m[11] * pz + m[15];
          const invW = w !== 0 ? 1 / w : 1;
          positions[v * 3]     = (m[0] * px + m[4] * py + m[8]  * pz + m[12]) * invW;
          positions[v * 3 + 1] = (m[1] * px + m[5] * py + m[9]  * pz + m[13]) * invW;
          positions[v * 3 + 2] = (m[2] * px + m[6] * py + m[10] * pz + m[14]) * invW;

          const nx = normals[v * 3], ny = normals[v * 3 + 1], nz = normals[v * 3 + 2];
          normals[v * 3]     = m[0] * nx + m[4] * ny + m[8]  * nz;
          normals[v * 3 + 1] = m[1] * nx + m[5] * ny + m[9]  * nz;
          normals[v * 3 + 2] = m[2] * nx + m[6] * ny + m[10] * nz;
        }

        records.push({
          expressId: mesh.expressID,
          positions,
          normals,
          indices,
          r: placed.color.x,
          g: placed.color.y,
          b: placed.color.z,
          a: placed.color.w,
        });
      } finally {
        raw.delete();
      }
    }
  });

  return records;
}

// ── Selective metadata extraction ─────────────────────────────────────────────

export function extractMetadata(
  api: IfcAPI,
  handle: number,
  /** Express IDs seen in geometry — used to discover elements not reached via spatial relations. */
  geometryExpressIds?: ReadonlySet<number>,
): { elements: ElementRecord[]; hierarchy: HierarchyNode; schema: string } {
  const schema = api.GetModelSchema(handle);
  const spatialTypes = new Set([IFCPROJECT, IFCSITE, IFCBUILDING, IFCBUILDINGSTOREY, IFCSPACE, IFCZONE, IFCSPATIALZONE]);

  // Selectively cache only the relation/spatial lines we need — avoids loading
  // every IFC entity (the main performance fix vs GetAllLines).
  const lineCache = new Map<number, Line>();

  const relTypes = [
    IFCPROJECT, IFCSITE, IFCBUILDING, IFCBUILDINGSTOREY,
    IFCSPACE, IFCZONE, IFCSPATIALZONE,
    IFCRELAGGREGATES, IFCRELCONTAINEDINSPATIALSTRUCTURE,
    IFCRELDEFINESBYPROPERTIES, IFCRELDEFINESBYTYPE,
  ];
  for (const type of relTypes) {
    for (const id of vectorValues(api.GetLineIDsWithType(handle, type))) {
      const line = api.GetLine(handle, id, false) as Line;
      if (line) lineCache.set(id, line);
    }
  }

  const elementMetaRaw = new Map<number, {
    ifcClass: string; name?: string; globalId?: string;
    typeName?: string; storeyExpressId?: number; storeyName?: string;
  }>();

  const getLine = (id: number): Line | undefined => {
    if (lineCache.has(id)) return lineCache.get(id);
    const line = api.GetLine(handle, id, false) as Line;
    if (line) { lineCache.set(id, line); return line; }
    return undefined;
  };

  const ensureElement = (id: number): void => {
    if (elementMetaRaw.has(id)) return;
    const line = getLine(id);
    if (!line) return;
    const name = api.GetNameFromTypeCode(line.type).toUpperCase();
    if (!name.startsWith('IFC') || line.type === IFCPROJECT) return;
    if (/^(IFCREL|IFCPROPERTY|IFCQUANTITY|IFCUNIT|IFCCARTESIAN|IFCAXIS|IFCDIRECTION|IFCGEOMETRIC|IFCPRODUCTDEFINITIONS|IFCSHAPE|IFCPROFILE|IFCEXTRUDED|IFCOWNER|IFCAPPLICATION|IFCPERSON|IFCORGANIZATION|IFCCONTEXT|IFCLOCALPLACEMENT)/.test(name)) return;
    if (spatialTypes.has(line.type)) return;
    elementMetaRaw.set(id, {
      ifcClass: api.GetNameFromTypeCode(line.type) || `IFC_TYPE_${line.type}`,
      name: fieldName(line),
      globalId: typeof line.GlobalId === 'object' && line.GlobalId !== null
        ? String((line.GlobalId as { value?: unknown }).value ?? '') || undefined : undefined,
    });
  };

  const parent = new Map<number, number>();
  const children = new Map<number, number[]>();

  const addChild = (container: number, child: number) => {
    const list = children.get(container) ?? [];
    if (!list.includes(child)) list.push(child);
    children.set(container, list);
    if (!parent.has(child)) parent.set(child, container);
  };

  for (const id of vectorValues(api.GetLineIDsWithType(handle, IFCRELAGGREGATES))) {
    const rel = lineCache.get(id);
    if (!rel) continue;
    const container = ref(rel.RelatingObject);
    if (container === undefined) continue;
    refs(rel.RelatedObjects).forEach((child) => addChild(container, child));
  }

  for (const id of vectorValues(api.GetLineIDsWithType(handle, IFCRELCONTAINEDINSPATIALSTRUCTURE))) {
    const rel = lineCache.get(id);
    const container = rel ? ref(rel.RelatingStructure) : undefined;
    if (!rel || container === undefined) continue;
    refs(rel.RelatedElements).forEach((child) => {
      addChild(container, child);
      ensureElement(child);
      const current = elementMetaRaw.get(child);
      const storey = getLine(container);
      if (current && storey) {
        elementMetaRaw.set(child, { ...current, storeyExpressId: container, storeyName: fieldName(storey) });
      }
    });
  }

  const groups = new Map<number, FieldGroup[]>();

  const addGroups = (elementId: number, definitionId: number, source: 'occurrence' | 'type') => {
    const definition = getLine(definitionId);
    if (!definition) return;
    const kind = definition.type === IFCELEMENTQUANTITY ? 'qto' : 'pset';
    const entries = refs(definition.HasProperties ?? definition.Quantities)
      .map((entryId): FieldEntry | undefined => {
        const entry = getLine(entryId);
        const name = entry && fieldName(entry);
        return entry && name ? { name, value: propertyValue(entry) } : undefined;
      })
      .filter((e): e is FieldEntry => e !== undefined);
    const group: FieldGroup = { name: fieldName(definition) ?? `${kind} #${definitionId}`, kind, source, entries };
    const current = groups.get(elementId) ?? [];
    current.push(group);
    groups.set(elementId, current);
  };

  for (const id of vectorValues(api.GetLineIDsWithType(handle, IFCRELDEFINESBYPROPERTIES))) {
    const rel = lineCache.get(id);
    if (!rel) continue;
    const defId = ref(rel.RelatingPropertyDefinition);
    if (defId !== undefined) {
      refs(rel.RelatedObjects).forEach((elementId) => {
        ensureElement(elementId);
        if (elementMetaRaw.has(elementId)) addGroups(elementId, defId, 'occurrence');
      });
    }
  }

  for (const id of vectorValues(api.GetLineIDsWithType(handle, IFCRELDEFINESBYTYPE))) {
    const rel = lineCache.get(id);
    if (!rel) continue;
    const typeId = ref(rel.RelatingType);
    if (typeId === undefined) continue;
    const typeLine = getLine(typeId);
    const typeLabel = typeLine ? fieldName(typeLine) : undefined;
    refs(rel.RelatedObjects).forEach((elementId) => {
      ensureElement(elementId);
      const current = elementMetaRaw.get(elementId);
      if (current) elementMetaRaw.set(elementId, { ...current, typeName: typeLabel });
      const typeDefinitions = typeLine && refs(typeLine.HasPropertySets);
      typeDefinitions?.forEach((defId) => {
        if (elementMetaRaw.has(elementId)) addGroups(elementId, defId, 'type');
      });
    });
  }

  // Back-fill any elements visible in geometry but not reached via spatial relations
  // (common in minimal/synthetic IFC files that omit IfcRelContainedInSpatialStructure).
  if (geometryExpressIds) {
    for (const id of geometryExpressIds) ensureElement(id);
  }

  // Hierarchy tree
  const labelForId = (id: number, className: string): string => {
    const line = getLine(id);
    return (line && fieldName(line)) || `${className} #${id}`;
  };

  const buildNode = (id: number, visiting: Set<number>): HierarchyNode => {
    const line = getLine(id);
    const className = line ? entityTypeName(api, line.type) : 'IFC_UNASSIGNED';
    const isElement = elementMetaRaw.has(id);
    if (visiting.has(id)) {
      return { expressId: id, ifcClass: className, label: `${labelForId(id, className)} (cycle)`, nodeKind: isElement ? 'element' : 'spatial', children: [] };
    }
    const next = new Set(visiting).add(id);
    return {
      expressId: id, ifcClass: className, label: labelForId(id, className),
      nodeKind: isElement ? 'element' : 'spatial',
      children: (children.get(id) ?? []).map((child) => buildNode(child, next)),
    };
  };

  const projectIds = vectorValues(api.GetLineIDsWithType(handle, IFCPROJECT));
  const roots: HierarchyNode[] = projectIds.map((id) => buildNode(id, new Set()));

  const elementIds = [...elementMetaRaw.keys()];
  const unassigned = elementIds.filter((id) => !parent.has(id));
  if (unassigned.length) {
    roots.push({
      expressId: -1, ifcClass: 'IFC_UNASSIGNED', label: 'Unassigned elements',
      nodeKind: 'spatial', children: unassigned.map((id) => buildNode(id, new Set())),
    });
  }

  const hierarchy: HierarchyNode = roots.length === 1
    ? roots[0]
    : { expressId: -1, ifcClass: 'IFC_ROOT', label: 'Model', nodeKind: 'spatial', children: roots };

  const elements: ElementRecord[] = [...elementMetaRaw.entries()].map(([expressId, meta]) => ({
    expressId,
    ifcClass: meta.ifcClass,
    name: meta.name,
    globalId: meta.globalId,
    typeName: meta.typeName,
    storeyExpressId: meta.storeyExpressId,
    storeyName: meta.storeyName,
    groups: groups.get(expressId) ?? [],
  }));

  return { elements, hierarchy, schema };
}

// ── Combined processor ────────────────────────────────────────────────────────

export interface ProcessResult {
  readonly glb: ArrayBuffer;
  readonly metadata: ModelMetadata;
}

/**
 * Runs geometry + metadata extraction on an already-open web-ifc model handle.
 * Caller is responsible for calling api.CloseModel(handle) after this returns.
 * Throws if no geometry was found.
 */
export function processModel(api: IfcAPI, handle: number): ProcessResult {
  const meshRecords = streamGeometry(api, handle);
  const glb = buildGlb(meshRecords);
  if (!glb) throw new Error('No supported 3D geometry found in this IFC file.');

  // Collect all expressIds seen in geometry so metadata extraction can back-fill
  // elements that aren't reachable through spatial containment relations.
  const geometryExpressIds = new Set(meshRecords.map((r) => r.expressId));

  const { elements, hierarchy, schema } = extractMetadata(api, handle, geometryExpressIds);
  const metadata: ModelMetadata = { version: 1, schema, elements, hierarchy };
  return { glb, metadata };
}
