import { describe, expect, it } from 'vitest';
import {
  importFromFile,
  loadLibrary,
  loadOpenTabs,
  saveLibrary,
  saveOpenTabs,
  type LibraryStorage,
} from '../../src/features/viewer-viewpoints/persistence';
import { exportBcfZip } from '../../src/core/bcf-zip';
import { addView, createSavedView, emptyLibrary, serializeLibrary, type SavedViewSnapshot } from '../../src/core/saved-views';

const snapshot: SavedViewSnapshot = {
  camera: { kind: 'perspective', position: [1, 2, 3], target: [0, 0, 0], up: [0, 1, 0], fieldOfView: 45 },
};

function memoryStorage(): LibraryStorage & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => void store.set(key, value),
  };
}

describe('saved-views persistence (T4, T5)', () => {
  it('loads an empty library when storage is empty', () => {
    const result = loadLibrary(memoryStorage());
    expect(result.library.views.length).toBe(0);
    expect(result.warning).toBeUndefined();
  });

  it('round-trips the library through storage (T4)', () => {
    const storage = memoryStorage();
    const library = addView(emptyLibrary(), createSavedView('A', snapshot));
    expect(saveLibrary(storage, library)).toBeUndefined();
    const reloaded = loadLibrary(storage);
    expect(reloaded.library.views[0].name).toBe('A');
  });

  it('warns and does not throw when storage reads fail (T5)', () => {
    const throwing: LibraryStorage = {
      getItem() { throw new Error('denied'); },
      setItem() {},
    };
    const result = loadLibrary(throwing);
    expect(result.library.views.length).toBe(0);
    expect(result.warning).toMatch(/unavailable/i);
  });

  it('warns on quota-exceeded writes instead of losing views (T5)', () => {
    const throwing: LibraryStorage = {
      getItem: () => null,
      setItem() { throw new Error('QuotaExceeded'); },
    };
    const warning = saveLibrary(throwing, addView(emptyLibrary(), createSavedView('A', snapshot)));
    expect(warning).toMatch(/full or unavailable/i);
  });

  it('resets on corrupt stored content with a warning', () => {
    const storage = memoryStorage();
    storage.store.set('saved-views:library', '{ not valid');
    const result = loadLibrary(storage);
    expect(result.library.views.length).toBe(0);
    expect(result.warning).toMatch(/reset/i);
  });

  it('persists and restores open tab ids and the active tab', () => {
    const storage = memoryStorage();
    saveOpenTabs(storage, ['v1', 'v2'], 'v2');
    const loaded = loadOpenTabs(storage);
    expect(loaded.ids).toEqual(['v1', 'v2']);
    expect(loaded.activeId).toBe('v2');
  });
});

describe('saved-views import (T6)', () => {
  it('imports a JSON export and merges it into the existing library', async () => {
    const existing = addView(emptyLibrary(), createSavedView('Existing', snapshot));
    const incoming = addView(emptyLibrary(), createSavedView('Incoming', snapshot));
    const file = new File([serializeLibrary(incoming)], 'saved-views.json', { type: 'application/json' });
    const result = await importFromFile(file, existing);
    expect(result.error).toBeUndefined();
    expect(result.imported).toBe(1);
    expect(result.library?.views.map((v) => v.name)).toEqual(['Existing', 'Incoming']);
  });

  it('imports a BCF-ZIP export (T6)', async () => {
    const view = createSavedView('From BCF', snapshot);
    const bytes = exportBcfZip([view]);
    const file = new File([bytes as BlobPart], 'saved-views.bcfzip');
    const result = await importFromFile(file, emptyLibrary());
    expect(result.error).toBeUndefined();
    expect(result.imported).toBe(1);
    expect(result.library?.views[0].name).toBe('From BCF');
  });

  it('reports a clear error for malformed JSON files', async () => {
    const file = new File(['{ bad json'], 'saved-views.json', { type: 'application/json' });
    const result = await importFromFile(file, emptyLibrary());
    expect(result.imported).toBe(0);
    expect(result.error).toMatch(/not a valid/i);
  });
});
