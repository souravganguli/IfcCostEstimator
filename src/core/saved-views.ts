// Saved Views domain model (BCF 3.0 "visualization info" aligned).
//
// This module is pure and framework-free: it owns the snapshot data shape, the
// library (folders + ordered entries), dirty/diff detection, scale guardrails,
// and JSON serialisation for persistence and the documented export fallback.
// It deliberately knows nothing about Three.js, the DOM, or local storage;
// those live behind the viewer adapter and the feature module respectively.
//
// Field names and semantics follow BCF-XML 3.0: exactly one Perspective or
// Orthogonal camera; Components = Selection + Visibility (DefaultVisibility +
// ViewSetupHints + Exceptions) + Coloring (ARGB per element); optional
// ClippingPlanes (Location + Direction into the clipped half-space). Lengths
// are metres, angles degrees.

export type Vec3Tuple = readonly [number, number, number];

/** A model-scoped element reference carried by a snapshot. */
export interface SavedViewComponent {
  /** Session model id the reference was captured against. */
  readonly modelId: number;
  /** Express id within that model. */
  readonly expressId: number;
  /** IFC GlobalId (GUID) for cross-session / cross-device matching, when known. */
  readonly globalId?: string;
}

/** A colored element (ARGB hex `#aarrggbb` or `#rrggbb`). */
export interface SavedViewColoring extends SavedViewComponent {
  readonly color: string;
}

/** BCF PerspectiveCamera. */
export interface PerspectiveCameraSnapshot {
  readonly kind: 'perspective';
  readonly position: Vec3Tuple;
  readonly target: Vec3Tuple;
  readonly up: Vec3Tuple;
  /** Vertical field of view, degrees. */
  readonly fieldOfView: number;
}

/** BCF OrthogonalCamera. */
export interface OrthographicCameraSnapshot {
  readonly kind: 'orthographic';
  readonly position: Vec3Tuple;
  readonly target: Vec3Tuple;
  readonly up: Vec3Tuple;
  /** Vertical world-space extent visible (metres), BCF ViewToWorldScale analogue. */
  readonly viewToWorldScale: number;
}

export type CameraSnapshot = PerspectiveCameraSnapshot | OrthographicCameraSnapshot;

/** A single clipping plane: direction points into the clipped (hidden) half-space. */
export interface ClippingPlaneSnapshot {
  readonly location: Vec3Tuple;
  readonly direction: Vec3Tuple;
}

/** BCF ViewSetupHints flags for broad visibility categories. */
export interface ViewSetupHints {
  readonly spacesVisible: boolean;
  readonly spaceBoundariesVisible: boolean;
  readonly openingsVisible: boolean;
}

/** BCF Components.Visibility. */
export interface VisibilitySnapshot {
  /** When true, all elements default to visible and `exceptions` are hidden; when false, inverted. */
  readonly defaultVisibility: boolean;
  readonly viewSetupHints: ViewSetupHints;
  /** Elements whose visibility differs from `defaultVisibility`. */
  readonly exceptions: readonly SavedViewComponent[];
}

/**
 * The full, BCF-aligned scene snapshot. Each category is optional at the model
 * level: excluding a category means "do not capture / do not restore it", which
 * supports the save dialog's per-category opt-out and the restore contract of
 * replacing only the categories a view covers.
 */
export interface SavedViewSnapshot {
  readonly camera?: CameraSnapshot;
  readonly clippingPlanes?: readonly ClippingPlaneSnapshot[];
  readonly visibility?: VisibilitySnapshot;
  readonly selection?: readonly SavedViewComponent[];
  readonly coloring?: readonly SavedViewColoring[];
}

/** The snapshot categories a user can choose to capture / exclude. */
export type SnapshotCategory = 'camera' | 'clipping' | 'visibility' | 'selection' | 'coloring';

export const SNAPSHOT_CATEGORIES: readonly SnapshotCategory[] = [
  'camera',
  'clipping',
  'visibility',
  'selection',
  'coloring',
];

/** A persisted library entry. Identity is `id` (a stable GUID). */
export interface SavedView {
  readonly id: string;
  readonly name: string;
  /** Owning folder id, or undefined for the library root. */
  readonly folderId?: string;
  readonly snapshot: SavedViewSnapshot;
  /** Small data: URL PNG thumbnail, when captured. */
  readonly thumbnail?: string;
  readonly createdAt: number;
  readonly updatedAt: number;
}

/** A named folder grouping saved views. */
export interface SavedViewFolder {
  readonly id: string;
  readonly name: string;
}

/** The persisted, serialisable library document. */
export interface SavedViewLibrary {
  readonly version: 1;
  readonly folders: readonly SavedViewFolder[];
  /** Ordered entries; order is the display/reorder order. */
  readonly views: readonly SavedView[];
}

/** Default maximum number of saved views per library (§R11, numeric defaults). */
export const MAX_SAVED_VIEWS = 50;

/** Default component-list size that triggers a scale warning (BCF ~1000). */
export const COMPONENT_WARNING_THRESHOLD = 1000;

let idCounter = 0;
/** Generate a stable, collision-resistant GUID-like identity. */
export function newId(prefix = 'sv'): string {
  idCounter += 1;
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}-${rand}`;
}

export function emptyLibrary(): SavedViewLibrary {
  return { version: 1, folders: [], views: [] };
}

function sanitizeName(name: string, fallback: string): string {
  const trimmed = name.replace(/\s+/g, ' ').trim();
  return trimmed || fallback;
}

/**
 * Create a saved view from a snapshot. Display names may collide; identity is
 * the generated id, independent of names, filenames and element ids.
 */
export function createSavedView(
  name: string,
  snapshot: SavedViewSnapshot,
  options: { folderId?: string; thumbnail?: string } = {},
): SavedView {
  const now = Date.now();
  return {
    id: newId(),
    name: sanitizeName(name, 'Saved view'),
    folderId: options.folderId,
    snapshot,
    thumbnail: options.thumbnail,
    createdAt: now,
    updatedAt: now,
  };
}

/** Add a view to the library (immutably). Caller enforces the max-count rule via {@link atViewLimit}. */
export function addView(library: SavedViewLibrary, view: SavedView): SavedViewLibrary {
  return { ...library, views: [...library.views, view] };
}

export function atViewLimit(library: SavedViewLibrary, max = MAX_SAVED_VIEWS): boolean {
  return library.views.length >= max;
}

export function renameView(library: SavedViewLibrary, id: string, name: string): SavedViewLibrary {
  return {
    ...library,
    views: library.views.map((view) =>
      view.id === id ? { ...view, name: sanitizeName(name, view.name), updatedAt: Date.now() } : view,
    ),
  };
}

export function duplicateView(library: SavedViewLibrary, id: string): SavedViewLibrary {
  const source = library.views.find((view) => view.id === id);
  if (!source) return library;
  const copy = createSavedView(`${source.name} copy`, source.snapshot, {
    folderId: source.folderId,
    thumbnail: source.thumbnail,
  });
  const index = library.views.findIndex((view) => view.id === id);
  const views = [...library.views];
  views.splice(index + 1, 0, copy);
  return { ...library, views };
}

/** Update a view's snapshot/thumbnail in place (Save-back), bumping updatedAt. */
export function updateViewSnapshot(
  library: SavedViewLibrary,
  id: string,
  snapshot: SavedViewSnapshot,
  thumbnail?: string,
): SavedViewLibrary {
  return {
    ...library,
    views: library.views.map((view) =>
      view.id === id
        ? { ...view, snapshot, thumbnail: thumbnail ?? view.thumbnail, updatedAt: Date.now() }
        : view,
    ),
  };
}

/** Remove one or more views by id. */
export function removeViews(library: SavedViewLibrary, ids: readonly string[]): SavedViewLibrary {
  const drop = new Set(ids);
  return { ...library, views: library.views.filter((view) => !drop.has(view.id)) };
}

/** Clear every saved view (folders are kept). */
export function clearViews(library: SavedViewLibrary): SavedViewLibrary {
  return { ...library, views: [] };
}

/** Move a view to a new ordered position within the flat list. */
export function reorderView(library: SavedViewLibrary, id: string, toIndex: number): SavedViewLibrary {
  const from = library.views.findIndex((view) => view.id === id);
  if (from < 0) return library;
  const views = [...library.views];
  const [moved] = views.splice(from, 1);
  const bounded = Math.max(0, Math.min(views.length, toIndex));
  views.splice(bounded, 0, moved);
  return { ...library, views };
}

export function addFolder(library: SavedViewLibrary, name: string): SavedViewLibrary {
  const folder: SavedViewFolder = { id: newId('fld'), name: sanitizeName(name, 'Folder') };
  return { ...library, folders: [...library.folders, folder] };
}

export function renameFolder(library: SavedViewLibrary, id: string, name: string): SavedViewLibrary {
  return {
    ...library,
    folders: library.folders.map((folder) =>
      folder.id === id ? { ...folder, name: sanitizeName(name, folder.name) } : folder,
    ),
  };
}

/** Delete a folder; its views move to the root (never deleted with the folder). */
export function removeFolder(library: SavedViewLibrary, id: string): SavedViewLibrary {
  return {
    ...library,
    folders: library.folders.filter((folder) => folder.id !== id),
    views: library.views.map((view) => (view.folderId === id ? { ...view, folderId: undefined } : view)),
  };
}

/** Move a view into a folder (or to the root when folderId is undefined). */
export function moveViewToFolder(library: SavedViewLibrary, id: string, folderId?: string): SavedViewLibrary {
  return {
    ...library,
    views: library.views.map((view) =>
      view.id === id ? { ...view, folderId, updatedAt: Date.now() } : view,
    ),
  };
}

/** Total number of element references across selection/visibility/coloring. */
export function componentCount(snapshot: SavedViewSnapshot): number {
  return (
    (snapshot.selection?.length ?? 0) +
    (snapshot.visibility?.exceptions.length ?? 0) +
    (snapshot.coloring?.length ?? 0)
  );
}

/** True when any component list exceeds the configured threshold (scale guardrail). */
export function exceedsComponentThreshold(
  snapshot: SavedViewSnapshot,
  threshold = COMPONENT_WARNING_THRESHOLD,
): boolean {
  return componentCount(snapshot) > threshold;
}

function roundVec(v: Vec3Tuple): Vec3Tuple {
  return [round(v[0]), round(v[1]), round(v[2])];
}
function round(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

/**
 * Stable structural key for a snapshot, used for dirty/diff detection. Rounds
 * floating-point camera/clip values so imperceptible camera jitter does not
 * falsely mark a tab modified; component lists are order-normalised.
 */
export function snapshotKey(snapshot: SavedViewSnapshot): string {
  const camera = snapshot.camera
    ? snapshot.camera.kind === 'perspective'
      ? ['P', roundVec(snapshot.camera.position), roundVec(snapshot.camera.target), roundVec(snapshot.camera.up), round(snapshot.camera.fieldOfView)]
      : ['O', roundVec(snapshot.camera.position), roundVec(snapshot.camera.target), roundVec(snapshot.camera.up), round(snapshot.camera.viewToWorldScale)]
    : null;
  const clipping = snapshot.clippingPlanes
    ? snapshot.clippingPlanes.map((p) => [roundVec(p.location), roundVec(p.direction)])
    : null;
  const visibility = snapshot.visibility
    ? [
        snapshot.visibility.defaultVisibility,
        snapshot.visibility.viewSetupHints,
        [...snapshot.visibility.exceptions]
          .map((c) => `${c.modelId}:${c.expressId}`)
          .sort(),
      ]
    : null;
  const selection = snapshot.selection
    ? [...snapshot.selection].map((c) => `${c.modelId}:${c.expressId}`).sort()
    : null;
  const coloring = snapshot.coloring
    ? [...snapshot.coloring].map((c) => `${c.modelId}:${c.expressId}:${c.color.toLowerCase()}`).sort()
    : null;
  return JSON.stringify({ camera, clipping, visibility, selection, coloring });
}

/** True when two snapshots differ structurally (used for the unsaved `*` marker). */
export function snapshotsDiffer(a: SavedViewSnapshot, b: SavedViewSnapshot): boolean {
  return snapshotKey(a) !== snapshotKey(b);
}

/** Serialise the library to a JSON string for local storage or export. */
export function serializeLibrary(library: SavedViewLibrary): string {
  return JSON.stringify(library);
}

/**
 * Parse a library document, ignoring unknown/extra fields (BCF-style forward
 * compatibility). Returns `undefined` for malformed input or an incompatible
 * version so the caller can warn without crashing.
 */
export function parseLibrary(text: string): SavedViewLibrary | undefined {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (!raw || typeof raw !== 'object') return undefined;
  const doc = raw as Record<string, unknown>;
  if (doc.version !== 1) return undefined;
  const folders = Array.isArray(doc.folders) ? doc.folders.flatMap(coerceFolder) : [];
  const views = Array.isArray(doc.views) ? doc.views.flatMap(coerceView) : [];
  return { version: 1, folders, views };
}

function coerceFolder(value: unknown): SavedViewFolder[] {
  if (!value || typeof value !== 'object') return [];
  const folder = value as Record<string, unknown>;
  if (typeof folder.id !== 'string' || typeof folder.name !== 'string') return [];
  return [{ id: folder.id, name: folder.name }];
}

function coerceView(value: unknown): SavedView[] {
  if (!value || typeof value !== 'object') return [];
  const view = value as Record<string, unknown>;
  if (typeof view.id !== 'string' || typeof view.name !== 'string') return [];
  const snapshot = coerceSnapshot(view.snapshot);
  const now = Date.now();
  return [
    {
      id: view.id,
      name: view.name,
      folderId: typeof view.folderId === 'string' ? view.folderId : undefined,
      snapshot,
      thumbnail: typeof view.thumbnail === 'string' ? view.thumbnail : undefined,
      createdAt: typeof view.createdAt === 'number' ? view.createdAt : now,
      updatedAt: typeof view.updatedAt === 'number' ? view.updatedAt : now,
    },
  ];
}

function coerceVec3(value: unknown): Vec3Tuple | undefined {
  if (!Array.isArray(value) || value.length < 3) return undefined;
  const [x, y, z] = value;
  if ([x, y, z].every((n) => typeof n === 'number' && Number.isFinite(n))) return [x, y, z];
  return undefined;
}

function coerceComponent(value: unknown): SavedViewComponent[] {
  if (!value || typeof value !== 'object') return [];
  const c = value as Record<string, unknown>;
  if (typeof c.modelId !== 'number' || typeof c.expressId !== 'number') return [];
  return [{ modelId: c.modelId, expressId: c.expressId, globalId: typeof c.globalId === 'string' ? c.globalId : undefined }];
}

function coerceSnapshot(value: unknown): SavedViewSnapshot {
  if (!value || typeof value !== 'object') return {};
  const s = value as Record<string, unknown>;
  const snapshot: {
    camera?: CameraSnapshot;
    clippingPlanes?: ClippingPlaneSnapshot[];
    visibility?: VisibilitySnapshot;
    selection?: SavedViewComponent[];
    coloring?: SavedViewColoring[];
  } = {};

  const cam = s.camera as Record<string, unknown> | undefined;
  if (cam && typeof cam === 'object') {
    const position = coerceVec3(cam.position);
    const target = coerceVec3(cam.target);
    const up = coerceVec3(cam.up);
    if (position && target && up) {
      if (cam.kind === 'orthographic' && typeof cam.viewToWorldScale === 'number') {
        snapshot.camera = { kind: 'orthographic', position, target, up, viewToWorldScale: cam.viewToWorldScale };
      } else if (typeof cam.fieldOfView === 'number') {
        snapshot.camera = { kind: 'perspective', position, target, up, fieldOfView: cam.fieldOfView };
      }
    }
  }

  if (Array.isArray(s.clippingPlanes)) {
    const planes = s.clippingPlanes.flatMap((p) => {
      if (!p || typeof p !== 'object') return [];
      const plane = p as Record<string, unknown>;
      const location = coerceVec3(plane.location);
      const direction = coerceVec3(plane.direction);
      return location && direction ? [{ location, direction }] : [];
    });
    if (planes.length) snapshot.clippingPlanes = planes;
  }

  const vis = s.visibility as Record<string, unknown> | undefined;
  if (vis && typeof vis === 'object') {
    const hints = vis.viewSetupHints as Record<string, unknown> | undefined;
    snapshot.visibility = {
      defaultVisibility: vis.defaultVisibility !== false,
      viewSetupHints: {
        spacesVisible: hints?.spacesVisible !== false,
        spaceBoundariesVisible: hints?.spaceBoundariesVisible !== false,
        openingsVisible: hints?.openingsVisible !== false,
      },
      exceptions: Array.isArray(vis.exceptions) ? vis.exceptions.flatMap(coerceComponent) : [],
    };
  }

  if (Array.isArray(s.selection)) snapshot.selection = s.selection.flatMap(coerceComponent);

  if (Array.isArray(s.coloring)) {
    snapshot.coloring = s.coloring.flatMap((value) => {
      const base = coerceComponent(value);
      if (!base.length) return [];
      const c = value as Record<string, unknown>;
      if (typeof c.color !== 'string') return [];
      return [{ ...base[0], color: c.color }];
    });
  }

  return snapshot;
}
