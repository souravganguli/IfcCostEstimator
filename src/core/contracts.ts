import type { Condition, FieldKey, FieldValue } from './predicate';

export interface ModelAsset {
  readonly schema: string;
  readonly visible: boolean;
  readonly properties?: PropertyQuery;
  readonly hierarchy?: HierarchyQuery;
  readonly elements?: ElementQuery;
  readonly triangles?: readonly import('./drawings').Triangle[];
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
  getAsset(id: number): ModelAsset | undefined;
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

/**
 * Model-scoped identity of a single IFC element. Express IDs repeat across
 * loaded models, so an element is only unique as the pair `(modelId,
 * expressId)`. `modelId` is the session model id from {@link ModelSummary}.
 */
export interface ElementIdentity {
  readonly modelId: number;
  readonly expressId: number;
}

/** True when two identities refer to the same model-scoped element. */
export function sameElement(a: ElementIdentity | null, b: ElementIdentity | null): boolean {
  return a === b || (a !== null && b !== null && a.modelId === b.modelId && a.expressId === b.expressId);
}

/** Basic identity/metadata of an element, resolved by the IFC adapter. */
export interface ElementMetadata {
  /** IFC entity class name, for example `IfcWall`. */
  readonly ifcClass: string;
  /** Element Name attribute, or undefined when unset/absent. */
  readonly name?: string;
  /** IFC GlobalId (GUID), or undefined when unset/absent. */
  readonly globalId?: string;
  /** Type object name via `IfcRelDefinesByType`, when present. */
  readonly typeName?: string;
  /** Express id of the owning spatial storey, when the element is contained. */
  readonly storeyExpressId?: number;
  /** Display name of the owning storey, when known. */
  readonly storeyName?: string;
}

/** A single named field (property or quantity) carrying a typed value. */
export interface FieldEntry {
  readonly name: string;
  readonly value: FieldValue;
}

/** A property set or quantity set with its member fields. */
export interface FieldGroup {
  /** Set name, for example `Pset_WallCommon` or `Qto_WallBaseQuantities`. */
  readonly name: string;
  /** `pset` for IfcPropertySet, `qto` for IfcElementQuantity. */
  readonly kind: 'pset' | 'qto';
  /** `occurrence` for direct properties, `type` for type-level properties. */
  readonly source: 'occurrence' | 'type';
  readonly entries: readonly FieldEntry[];
}

/** Property and quantity data for one element. */
export interface ElementProperties {
  readonly identity: ElementIdentity;
  readonly metadata: ElementMetadata;
  readonly groups: readonly FieldGroup[];
}

/**
 * Typed capability exposing the property and quantity sets of elements keyed
 * by model-scoped identity. Implemented behind the IFC adapter; features never
 * import `web-ifc`.
 */
export interface PropertyQuery {
  /** Resolve identity/class/name and property/quantity groups, or undefined if the model/element is unknown. */
  getProperties(identity: ElementIdentity): ElementProperties | undefined;
  /** Resolve only identity/class/name metadata, or undefined if unknown. */
  getMetadata(identity: ElementIdentity): ElementMetadata | undefined;
}

export interface ElementSearchResult {
  readonly identity: ElementIdentity;
  readonly metadata: ElementMetadata;
  readonly matchedFields: readonly ('name' | 'globalId' | 'ifcClass' | 'property')[];
}

export interface ElementFilterCriterion {
  readonly field: FieldKey;
  readonly conditions: readonly Condition[];
}

export interface ElementQuery {
  getAll(): readonly ElementIdentity[];
  search(query: string, limit?: number): readonly ElementSearchResult[];
  filter(criteria: readonly ElementFilterCriterion[]): readonly ElementIdentity[];
}

/** A node in a model's spatial-structure tree. */
export interface HierarchyNode {
  readonly expressId: number;
  readonly ifcClass: string;
  readonly label: string;
  /** `spatial` for project/site/building/storey/unassigned, `element` for contained products. */
  readonly nodeKind: 'spatial' | 'element';
  readonly children: readonly HierarchyNode[];
}

/** Spatial hierarchy for one model, with a root and a flat element id set. */
export interface ModelHierarchy {
  readonly modelId: number;
  readonly root: HierarchyNode;
  /** Express ids of all selectable/visibility-controllable element nodes. */
  readonly elementIds: readonly number[];
}

/** Typed capability exposing each model's spatial hierarchy. */
export interface HierarchyQuery {
  getHierarchy(modelId: number): ModelHierarchy | undefined;
}

/**
 * Selection capability. Holds at most one selected model-scoped element and
 * notifies subscribers on change. Render objects and highlight resources stay
 * adapter-owned; this contract shares only identity.
 */
export interface SelectionCapability {
  current(): ElementIdentity | null;
  set(identity: ElementIdentity | null): void;
  clear(): void;
  subscribe(listener: (identity: ElementIdentity | null) => void): () => void;
}

export interface ViewerPicking {
  pick(clientX: number, clientY: number): ElementIdentity | null;
  highlight(identity: ElementIdentity | null): void;
}

/**
 * Authoritative composed visibility. Model-level visibility (model controls)
 * is the outer gate; hierarchy isolation/hide adds a reversible element-level
 * mask that can never reveal a model hidden at the model level. Implemented by
 * the viewer adapter which owns scene nodes.
 */
export interface ElementVisibility {
  /** Hide the given element ids for a model (added to its hidden set). */
  hide(modelId: number, expressIds: readonly number[]): void;
  /** Show (unhide) the given element ids for a model. */
  show(modelId: number, expressIds: readonly number[]): void;
  /**
   * Isolate: hide every element of the model outside `expressIds`. The prior
   * hidden set is remembered so {@link restore} returns it unchanged.
   */
  isolate(modelId: number, expressIds: readonly number[]): void;
  /** Undo isolation for a model, returning its prior hidden set. */
  restore(modelId: number): void;
  /** Clear hidden set and isolation for every model (hierarchy Show all). */
  showAll(): void;
  /** Express ids currently hidden by the hierarchy for a model. */
  hiddenOf(modelId: number): ReadonlySet<number>;
  /** Whether a model currently has an active isolation. */
  isIsolated(modelId: number): boolean;
  subscribe(listener: () => void): () => void;
}

/**
 * Model-scoped element reference carried by a captured viewpoint. The saved
 * view feature maps these to/from IFC GlobalIds for cross-session matching.
 */
export interface ViewpointComponent {
  readonly modelId: number;
  readonly expressId: number;
}

/** A colored element in a captured/applied viewpoint (hex color string). */
export interface ViewpointColoring extends ViewpointComponent {
  readonly color: string;
}

/** Camera pose + projection in a captured viewpoint. Lengths metres, angles degrees. */
export type ViewpointCamera =
  | {
      readonly kind: 'perspective';
      readonly position: readonly [number, number, number];
      readonly target: readonly [number, number, number];
      readonly up: readonly [number, number, number];
      readonly fieldOfView: number;
    }
  | {
      readonly kind: 'orthographic';
      readonly position: readonly [number, number, number];
      readonly target: readonly [number, number, number];
      readonly up: readonly [number, number, number];
      readonly viewToWorldScale: number;
    };

/** A clipping plane; direction points into the clipped (hidden) half-space. */
export interface ViewpointClippingPlane {
  readonly location: readonly [number, number, number];
  readonly direction: readonly [number, number, number];
}

/**
 * Serialisable capture/restore boundary for saved views. Implemented by the
 * viewer adapter which owns scene nodes, camera, clipping, coloring, and
 * visibility. The feature captures plain data and applies plain data; it never
 * receives mutable render objects. Restore is deterministic: applying a
 * category replaces (not merges) the prior transient state for that category.
 */
export interface ViewpointScene {
  /** Capture the current camera pose + projection as plain data. */
  captureCamera(): ViewpointCamera;
  /** Apply a camera pose + projection, replacing the current camera state. */
  applyCamera(camera: ViewpointCamera): void;
  /** Capture all active clipping planes (empty when clipping is off). */
  captureClipping(): readonly ViewpointClippingPlane[];
  /** Replace all clipping planes with the given set (empty clears clipping). */
  applyClipping(planes: readonly ViewpointClippingPlane[]): void;
  /** Capture the currently colored elements across all loaded models. */
  captureColoring(): readonly ViewpointColoring[];
  /**
   * Replace all element coloring with the given set. Elements not listed are
   * reset to their authored color (no override leaks across views).
   */
  applyColoring(coloring: readonly ViewpointColoring[]): void;
  /** Capture the currently hidden elements across all loaded models. */
  captureHidden(): readonly ViewpointComponent[];
  /**
   * Replace element visibility: hide exactly the listed elements and show all
   * others, across every loaded model (deterministic, all-or-nothing).
   */
  applyHidden(hidden: readonly ViewpointComponent[]): void;
  /**
   * Render the current frame to a small PNG data URL for a thumbnail, with the
   * longest side at most `maxSize` pixels. Returns undefined when unavailable.
   */
  captureThumbnail(maxSize: number): string | undefined;
}