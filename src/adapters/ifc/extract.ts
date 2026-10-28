import type { IfcAPI } from 'web-ifc';
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
import type {
  ElementIdentity,
  ElementFilterCriterion,
  ElementMetadata,
  ElementProperties,
  ElementQuery,
  ElementSearchResult,
  FieldEntry,
  FieldGroup,
  HierarchyNode,
  ModelHierarchy,
  PropertyQuery,
} from '../../core/contracts';
import { evaluateCondition, type FieldValue } from '../../core/predicate';

type Ref = { value?: number };
type Line = Record<string, unknown> & { expressID: number; type: number };

function ref(value: unknown): number | undefined {
  return typeof value === 'object' && value !== null && typeof (value as Ref).value === 'number'
    ? (value as Ref).value
    : undefined;
}

function refs(value: unknown): number[] {
  return Array.isArray(value) ? value.map(ref).filter((id): id is number => id !== undefined) : [];
}

function scalar(value: unknown): FieldValue {
  if (value === null || value === undefined) return { kind: 'unset' };
  if (typeof value === 'boolean') return { kind: 'boolean', value };
  if (typeof value === 'number') return { kind: 'number', value };
  if (typeof value === 'string') return { kind: 'text', value };
  if (typeof value === 'object') {
    const candidate = value as { value?: unknown; _representationValue?: unknown; name?: unknown; [key: string]: unknown };
    if (candidate.value !== undefined) return scalar(candidate.value);
    if (candidate._representationValue !== undefined) return scalar(candidate._representationValue);
    if (typeof candidate.name === 'string') return { kind: 'enum', value: candidate.name };
  }
  return { kind: 'unset' };
}

function fieldName(line: Line): string | undefined {
  const name = line.Name;
  return typeof name === 'object' && name !== null && typeof (name as { value?: unknown }).value === 'string'
    ? (name as { value: string }).value
    : undefined;
}

function propertyValue(line: Line): FieldValue {
  const ignored = new Set(['expressID', 'type', 'Name', 'Description', 'Unit', 'Formula', 'MethodOfMeasurement', 'GlobalId']);
  for (const [key, value] of Object.entries(line)) {
    if (!ignored.has(key) && /Value$/.test(key)) return scalar(value);
  }
  return { kind: 'unset' };
}

function typeName(api: IfcAPI, type: number): string {
  return api.GetNameFromTypeCode(type) || `IFC_TYPE_${type}`;
}

function vectorValues(vector: { size(): number; get(index: number): number }): number[] {
  const values: number[] = [];
  for (let index = 0; index < vector.size(); index++) values.push(vector.get(index));
  return values;
}

function label(line: Line, className: string): string {
  return fieldName(line) || `${className} #${line.expressID}`;
}

function elementClass(api: IfcAPI, line: Line): boolean {
  const name = api.GetNameFromTypeCode(line.type).toUpperCase();
  if (!name.startsWith('IFC') || line.type === IFCPROJECT) return false;
  return !/^(IFCREL|IFCPROPERTY|IFCQUANTITY|IFCUNIT|IFCCARTESIAN|IFCAXIS|IFCDIRECTION|IFCGEOMETRIC|IFCPRODUCTDEFINITIONS|IFCSHAPE|IFCPROFILE|IFCEXTRUDED|IFCOWNER|IFCAPPLICATION|IFCPERSON|IFCORGANIZATION|IFCCONTEXT|IFCLOCALPLACEMENT)/.test(name);
}

export interface ExtractedModel {
  readonly properties: PropertyQuery;
  readonly elements: ElementQuery;
  readonly hierarchy: { getHierarchy(modelId: number): ModelHierarchy | undefined };
  readonly elementIds: readonly number[];
}

export function extractModel(api: IfcAPI, handle: number, modelId = 0): ExtractedModel {
  const lines = new Map<number, Line>();
  const ids = api.GetAllLines(handle);
  for (let index = 0; index < ids.size(); index++) {
    const id = ids.get(index);
    const line = api.GetLine(handle, id, false) as Line;
    if (line) lines.set(id, line);
  }

  const metadata = new Map<number, ElementMetadata>();
  const groups = new Map<number, FieldGroup[]>();
  const parent = new Map<number, number>();
  const children = new Map<number, number[]>();
  const spatialTypes = new Set([IFCPROJECT, IFCSITE, IFCBUILDING, IFCBUILDINGSTOREY, IFCSPACE, IFCZONE, IFCSPATIALZONE]);

  for (const line of lines.values()) {
    const className = typeName(api, line.type);
    if (elementClass(api, line) && !spatialTypes.has(line.type)) {
      metadata.set(line.expressID, {
        ifcClass: className,
        name: fieldName(line),
        globalId: typeof line.GlobalId === 'object' && line.GlobalId !== null
          ? String((line.GlobalId as { value?: unknown }).value ?? '') || undefined
          : undefined,
      });
    }
  }

  const addChild = (container: number, child: number) => {
    const list = children.get(container) ?? [];
    if (!list.includes(child)) list.push(child);
    children.set(container, list);
    if (!parent.has(child)) parent.set(child, container);
  };

  for (const id of vectorValues(api.GetLineIDsWithType(handle, IFCRELAGGREGATES))) {
    const relation = lines.get(id);
    if (!relation) continue;
    const container = ref(relation.RelatingObject);
    if (container === undefined) continue;
    refs(relation.RelatedObjects).forEach((child) => addChild(container, child));
  }
  for (const id of vectorValues(api.GetLineIDsWithType(handle, IFCRELCONTAINEDINSPATIALSTRUCTURE))) {
    const relation = lines.get(id);
    const container = relation ? ref(relation.RelatingStructure) : undefined;
    if (container === undefined || !relation) continue;
    refs(relation.RelatedElements).forEach((child) => {
      addChild(container, child);
      const current = metadata.get(child);
      const storey = lines.get(container);
      if (current && storey) metadata.set(child, {
        ...current,
        storeyExpressId: container,
        storeyName: fieldName(storey),
      });
    });
  }

  const addGroups = (elementId: number, definitionId: number, source: 'occurrence' | 'type') => {
    const definition = lines.get(definitionId);
    if (!definition) return;
    const kind = definition.type === IFCELEMENTQUANTITY ? 'qto' : 'pset';
    const entries = (refs(definition.HasProperties ?? definition.Quantities))
      .map((entryId): FieldEntry | undefined => {
        const entry = lines.get(entryId);
        const name = entry && fieldName(entry);
        return entry && name ? { name, value: propertyValue(entry) } : undefined;
      })
      .filter((entry): entry is FieldEntry => entry !== undefined);
    const group: FieldGroup = { name: fieldName(definition) ?? `${kind} #${definitionId}`, kind, source, entries };
    const current = groups.get(elementId) ?? [];
    current.push(group);
    groups.set(elementId, current);
  };
  for (const id of vectorValues(api.GetLineIDsWithType(handle, IFCRELDEFINESBYPROPERTIES))) {
    const relation = lines.get(id);
    if (!relation) continue;
    const definitionId = ref(relation.RelatingPropertyDefinition);
    if (definitionId !== undefined) refs(relation.RelatedObjects).forEach((elementId) => addGroups(elementId, definitionId, 'occurrence'));
  }
  for (const id of vectorValues(api.GetLineIDsWithType(handle, IFCRELDEFINESBYTYPE))) {
    const relation = lines.get(id);
    if (!relation) continue;
    const typeId = ref(relation.RelatingType);
    if (typeId === undefined) continue;
    const typeLine = lines.get(typeId);
    const typeLabel = typeLine ? fieldName(typeLine) : undefined;
    refs(relation.RelatedObjects).forEach((elementId) => {
      const current = metadata.get(elementId);
      if (current) metadata.set(elementId, { ...current, typeName: typeLabel });
      const typeDefinitions = typeLine && refs(typeLine.HasPropertySets);
      typeDefinitions?.forEach((definitionId) => addGroups(elementId, definitionId, 'type'));
    });
  }

  const elementIds = [...metadata.keys()];
  const buildNode = (id: number, visiting: Set<number>): HierarchyNode => {
    const line = lines.get(id);
    const className = line ? typeName(api, line.type) : 'IFC_UNASSIGNED';
    const isElement = metadata.has(id);
    if (visiting.has(id)) return { expressId: id, ifcClass: className, label: `${label(line ?? { expressID: id, type: 0 }, className)} (cycle)`, nodeKind: isElement ? 'element' : 'spatial', children: [] };
    const next = new Set(visiting).add(id);
    return {
      expressId: id,
      ifcClass: className,
      label: label(line ?? { expressID: id, type: 0 }, className),
      nodeKind: isElement ? 'element' : 'spatial',
      children: (children.get(id) ?? []).map((child) => buildNode(child, next)),
    };
  };
  const roots = [...lines.values()].filter((line) => line.type === IFCPROJECT).map((line) => buildNode(line.expressID, new Set()));
  const unassigned = elementIds.filter((id) => !parent.has(id));
  if (unassigned.length) roots.push({
    expressId: -1,
    ifcClass: 'IFC_UNASSIGNED',
    label: 'Unassigned elements',
    nodeKind: 'spatial',
    children: unassigned.map((id) => buildNode(id, new Set())),
  });
  const root: HierarchyNode = roots.length === 1 ? roots[0] : {
    expressId: -1, ifcClass: 'IFC_ROOT', label: 'Model', nodeKind: 'spatial', children: roots,
  };

  const properties: PropertyQuery = {
    getMetadata: (identity: ElementIdentity) => identity.modelId === modelId ? metadata.get(identity.expressId) : undefined,
    getProperties: (identity: ElementIdentity): ElementProperties | undefined => {
      const item = metadata.get(identity.expressId);
      if (identity.modelId !== modelId || !item) return undefined;
      return { identity, metadata: item, groups: groups.get(identity.expressId) ?? [] };
    },
  };
  const fieldValues = (expressId: number) => {
    const item = properties.getProperties({ modelId, expressId });
    const values = new Map<string, FieldValue>();
    if (!item) return values;
    values.set('IfcClass', { kind: 'text', value: item.metadata.ifcClass });
    if (item.metadata.name !== undefined) values.set('Name', { kind: 'text', value: item.metadata.name });
    if (item.metadata.globalId !== undefined) values.set('GlobalId', { kind: 'text', value: item.metadata.globalId });
    if (item.metadata.typeName !== undefined) values.set('TypeName', { kind: 'text', value: item.metadata.typeName });
    if (item.metadata.storeyName !== undefined) values.set('Storey', { kind: 'text', value: item.metadata.storeyName });
    item.groups.forEach((group) => group.entries.forEach((entry) => values.set(`${group.name}.${entry.name}`, entry.value)));
    return values;
  };
  const elements: ElementQuery = {
    getAll: () => elementIds.map((expressId) => ({ modelId, expressId })),
    search: (query, limit = 100): readonly ElementSearchResult[] => {
      const needle = query.trim().toLocaleLowerCase();
      if (!needle || limit <= 0) return [];
      const results: ElementSearchResult[] = [];
      for (const expressId of elementIds) {
        const item = properties.getProperties({ modelId, expressId });
        if (!item) continue;
        const matchedFields: Array<ElementSearchResult['matchedFields'][number]> = [];
        if (item.metadata.name?.toLocaleLowerCase().includes(needle)) matchedFields.push('name');
        if (item.metadata.globalId?.toLocaleLowerCase().includes(needle)) matchedFields.push('globalId');
        if (item.metadata.ifcClass.toLocaleLowerCase().includes(needle)) matchedFields.push('ifcClass');
        if ([...fieldValues(expressId)].some(([key, value]) => {
          if (key.toLocaleLowerCase().includes(needle)) return true;
          if (value.kind === 'text' || value.kind === 'enum') return value.value.toLocaleLowerCase().includes(needle);
          if (value.kind === 'number' || value.kind === 'boolean') return String(value.value).toLocaleLowerCase().includes(needle);
          return false;
        })) matchedFields.push('property');
        if (matchedFields.length) results.push({ identity: { modelId, expressId }, metadata: item.metadata, matchedFields });
        if (results.length >= limit) break;
      }
      const priority = { name: 0, globalId: 1, ifcClass: 2, property: 3 };
      return results.sort((a, b) => priority[a.matchedFields[0]] - priority[b.matchedFields[0]]);
    },
    filter: (criteria: readonly ElementFilterCriterion[]): readonly ElementIdentity[] => elementIds
      .map((expressId) => ({ modelId, expressId }))
      .filter((identity) => criteria.every((criterion) => {
        const values = fieldValues(identity.expressId);
        const value = values.get(criterion.field);
        return criterion.conditions.length > 0 && criterion.conditions.some((condition) =>
          evaluateCondition(() => value, condition) === 'match');
      })),
  };
  return {
    properties,
    elements,
    hierarchy: { getHierarchy: (id) => id === modelId ? { modelId, root, elementIds } : undefined },
    elementIds,
  };
}
