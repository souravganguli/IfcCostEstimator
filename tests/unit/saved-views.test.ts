import { describe, expect, it } from 'vitest';
import {
  addFolder,
  addView,
  atViewLimit,
  clearViews,
  COMPONENT_WARNING_THRESHOLD,
  componentCount,
  createSavedView,
  duplicateView,
  emptyLibrary,
  exceedsComponentThreshold,
  moveViewToFolder,
  MAX_SAVED_VIEWS,
  parseLibrary,
  removeFolder,
  removeViews,
  renameFolder,
  renameView,
  reorderView,
  serializeLibrary,
  snapshotsDiffer,
  updateViewSnapshot,
  type SavedViewSnapshot,
} from '../../src/core/saved-views';

const perspective: SavedViewSnapshot = {
  camera: { kind: 'perspective', position: [1, 2, 3], target: [0, 0, 0], up: [0, 1, 0], fieldOfView: 45 },
};

describe('saved-views library model', () => {
  it('creates views with stable unique ids independent of names (T3)', () => {
    const a = createSavedView('Lobby', perspective);
    const b = createSavedView('Lobby', perspective);
    expect(a.id).not.toBe(b.id);
    expect(a.name).toBe('Lobby');
    expect(b.name).toBe('Lobby'); // duplicate display names allowed
  });

  it('falls back to a default name when blank', () => {
    expect(createSavedView('   ', perspective).name).toBe('Saved view');
  });

  it('renames, duplicates, reorders, multi-deletes, and clears (T3)', () => {
    let library = emptyLibrary();
    const a = createSavedView('A', perspective);
    const b = createSavedView('B', perspective);
    const c = createSavedView('C', perspective);
    library = addView(addView(addView(library, a), b), c);

    library = renameView(library, b.id, 'Beta');
    expect(library.views.find((v) => v.id === b.id)?.name).toBe('Beta');

    library = duplicateView(library, a.id);
    expect(library.views.length).toBe(4);
    expect(library.views[1].name).toBe('A copy');
    expect(library.views[1].id).not.toBe(a.id);

    library = reorderView(library, c.id, 0);
    expect(library.views[0].id).toBe(c.id);

    library = removeViews(library, [a.id, c.id]);
    expect(library.views.some((v) => v.id === a.id)).toBe(false);
    expect(library.views.some((v) => v.id === c.id)).toBe(false);

    library = clearViews(library);
    expect(library.views.length).toBe(0);
  });

  it('manages folders and moves views; deleting a folder keeps its views (T3)', () => {
    let library = emptyLibrary();
    const view = createSavedView('A', perspective);
    library = addView(library, view);
    library = addFolder(library, 'Storey 1');
    const folderId = library.folders[0].id;

    library = moveViewToFolder(library, view.id, folderId);
    expect(library.views[0].folderId).toBe(folderId);

    library = renameFolder(library, folderId, 'Level 1');
    expect(library.folders[0].name).toBe('Level 1');

    library = removeFolder(library, folderId);
    expect(library.folders.length).toBe(0);
    expect(library.views[0].folderId).toBeUndefined(); // view retained, moved to root
  });

  it('enforces the maximum saved-view count (R11)', () => {
    let library = emptyLibrary();
    expect(MAX_SAVED_VIEWS).toBe(50);
    for (let i = 0; i < MAX_SAVED_VIEWS; i += 1) library = addView(library, createSavedView(`V${i}`, perspective));
    expect(atViewLimit(library)).toBe(true);
  });

  it('counts components and detects threshold exceedance (R11, T12)', () => {
    const many = Array.from({ length: COMPONENT_WARNING_THRESHOLD + 1 }, (_, i) => ({ modelId: 1, expressId: i }));
    const snapshot: SavedViewSnapshot = {
      visibility: { defaultVisibility: true, viewSetupHints: { spacesVisible: true, spaceBoundariesVisible: true, openingsVisible: true }, exceptions: many },
    };
    expect(componentCount(snapshot)).toBe(COMPONENT_WARNING_THRESHOLD + 1);
    expect(exceedsComponentThreshold(snapshot)).toBe(true);
    expect(exceedsComponentThreshold(perspective)).toBe(false);
  });

  it('detects snapshot divergence ignoring float jitter (T10)', () => {
    const base: SavedViewSnapshot = { camera: { kind: 'perspective', position: [1, 2, 3], target: [0, 0, 0], up: [0, 1, 0], fieldOfView: 45 } };
    const jittered: SavedViewSnapshot = { camera: { kind: 'perspective', position: [1 + 1e-9, 2, 3], target: [0, 0, 0], up: [0, 1, 0], fieldOfView: 45 } };
    const moved: SavedViewSnapshot = { camera: { kind: 'perspective', position: [5, 2, 3], target: [0, 0, 0], up: [0, 1, 0], fieldOfView: 45 } };
    expect(snapshotsDiffer(base, jittered)).toBe(false);
    expect(snapshotsDiffer(base, moved)).toBe(true);
  });

  it('treats component order as insignificant for dirty detection (AC2)', () => {
    const a: SavedViewSnapshot = { coloring: [{ modelId: 1, expressId: 2, color: '#ff0000' }, { modelId: 1, expressId: 3, color: '#00ff00' }] };
    const b: SavedViewSnapshot = { coloring: [{ modelId: 1, expressId: 3, color: '#00ff00' }, { modelId: 1, expressId: 2, color: '#ff0000' }] };
    expect(snapshotsDiffer(a, b)).toBe(false);
  });

  it('updates a snapshot while preserving identity (T10)', () => {
    let library = emptyLibrary();
    const view = createSavedView('A', perspective);
    library = addView(library, view);
    const next: SavedViewSnapshot = { camera: { kind: 'orthographic', position: [0, 10, 0], target: [0, 0, 0], up: [0, 0, -1], viewToWorldScale: 30 } };
    library = updateViewSnapshot(library, view.id, next, 'data:image/png;base64,AAAA');
    expect(library.views[0].id).toBe(view.id);
    expect(library.views[0].snapshot.camera?.kind).toBe('orthographic');
    expect(library.views[0].thumbnail).toBe('data:image/png;base64,AAAA');
  });
});

describe('saved-views serialization (T4, T7)', () => {
  it('round-trips a library through JSON', () => {
    let library = emptyLibrary();
    library = addFolder(library, 'Folder');
    library = addView(library, createSavedView('A', perspective, { folderId: library.folders[0].id }));
    const text = serializeLibrary(library);
    const parsed = parseLibrary(text);
    expect(parsed?.views[0].name).toBe('A');
    expect(parsed?.folders[0].name).toBe('Folder');
  });

  it('returns undefined for malformed JSON or incompatible versions', () => {
    expect(parseLibrary('not json')).toBeUndefined();
    expect(parseLibrary(JSON.stringify({ version: 2, folders: [], views: [] }))).toBeUndefined();
  });

  it('ignores unknown and extra fields without error (T7)', () => {
    const doc = {
      version: 1,
      extraTopLevel: 'ignored',
      folders: [{ id: 'f1', name: 'F', unknown: true }],
      views: [
        {
          id: 'v1',
          name: 'V',
          futureField: 42,
          snapshot: {
            camera: { kind: 'perspective', position: [1, 2, 3], target: [0, 0, 0], up: [0, 1, 0], fieldOfView: 45, extra: 'x' },
            selection: [{ modelId: 1, expressId: 2, extra: 'y' }],
          },
        },
      ],
    };
    const parsed = parseLibrary(JSON.stringify(doc));
    expect(parsed?.views[0].name).toBe('V');
    expect(parsed?.views[0].snapshot.camera?.kind).toBe('perspective');
    expect(parsed?.views[0].snapshot.selection?.length).toBe(1);
  });

  it('preserves both perspective and orthographic cameras (T8)', () => {
    const ortho: SavedViewSnapshot = { camera: { kind: 'orthographic', position: [0, 10, 0], target: [0, 0, 0], up: [0, 0, -1], viewToWorldScale: 25 } };
    let library = addView(emptyLibrary(), createSavedView('Ortho', ortho));
    library = addView(library, createSavedView('Persp', perspective));
    const parsed = parseLibrary(serializeLibrary(library));
    expect(parsed?.views[0].snapshot.camera).toMatchObject({ kind: 'orthographic', viewToWorldScale: 25 });
    expect(parsed?.views[1].snapshot.camera).toMatchObject({ kind: 'perspective', fieldOfView: 45 });
  });
});
