// Local-storage persistence and file import/export for the saved-view library.
// Storage is treated as optional: denied access, corrupt values, incompatible
// versions, or quota errors fall back to in-memory defaults and are reported
// to the caller, never silently losing the in-session library.

import {
  emptyLibrary,
  parseLibrary,
  serializeLibrary,
  type SavedViewLibrary,
} from '../../core/saved-views';
import { exportBcfZip, importBcfZip } from '../../core/bcf-zip';

/** The minimal storage surface the library needs (localStorage-compatible). */
export interface LibraryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const LIBRARY_KEY = 'saved-views:library';
const OPEN_TABS_KEY = 'saved-views:open-tabs';

export interface LoadResult {
  readonly library: SavedViewLibrary;
  /** When storage could not be read, a human-readable reason. */
  readonly warning?: string;
}

/** Load the persisted library, falling back to an empty one on any failure. */
export function loadLibrary(storage: LibraryStorage): LoadResult {
  let raw: string | null = null;
  try {
    raw = storage.getItem(LIBRARY_KEY);
  } catch {
    return { library: emptyLibrary(), warning: 'Saved views storage is unavailable; views are kept for this session only.' };
  }
  if (!raw) return { library: emptyLibrary() };
  const parsed = parseLibrary(raw);
  if (!parsed) return { library: emptyLibrary(), warning: 'Saved views could not be read and were reset.' };
  return { library: parsed };
}

/** Persist the library; returns a warning when storage rejects the write. */
export function saveLibrary(storage: LibraryStorage, library: SavedViewLibrary): string | undefined {
  try {
    storage.setItem(LIBRARY_KEY, serializeLibrary(library));
    return undefined;
  } catch {
    return 'Saved views storage is full or unavailable. Export to a file to keep your views.';
  }
}

/** Load the persisted open-tab ids (view ids), ignoring failures. */
export function loadOpenTabs(storage: LibraryStorage): { ids: readonly string[]; activeId?: string } {
  try {
    const raw = storage.getItem(OPEN_TABS_KEY);
    if (!raw) return { ids: [] };
    const parsed = JSON.parse(raw) as { ids?: unknown; activeId?: unknown };
    const ids = Array.isArray(parsed.ids) ? parsed.ids.filter((id): id is string => typeof id === 'string') : [];
    const activeId = typeof parsed.activeId === 'string' ? parsed.activeId : undefined;
    return { ids, activeId };
  } catch {
    return { ids: [] };
  }
}

export function saveOpenTabs(storage: LibraryStorage, ids: readonly string[], activeId?: string): void {
  try {
    storage.setItem(OPEN_TABS_KEY, JSON.stringify({ ids, activeId }));
  } catch {
    // Non-fatal: the library itself is the source of truth.
  }
}

/** Trigger a browser download of a byte array as a file. */
export function downloadBytes(bytes: Uint8Array, filename: string, mime: string): void {
  const blob = new Blob([bytes as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Export views to a BCF-ZIP file download. */
export function exportLibraryToBcf(library: SavedViewLibrary, ids?: readonly string[]): void {
  const selected = ids ? library.views.filter((view) => ids.includes(view.id)) : library.views;
  const bytes = exportBcfZip(selected);
  downloadBytes(bytes, 'saved-views.bcfzip', 'application/octet-stream');
}

/** Export views to a JSON file download (documented fallback). */
export function exportLibraryToJson(library: SavedViewLibrary, ids?: readonly string[]): void {
  const selected = ids ? { ...library, views: library.views.filter((view) => ids.includes(view.id)) } : library;
  const bytes = new TextEncoder().encode(serializeLibrary(selected));
  downloadBytes(bytes, 'saved-views.json', 'application/json');
}

export interface ImportResult {
  readonly library?: SavedViewLibrary;
  readonly imported: number;
  readonly error?: string;
}

/**
 * Import views from a file (BCF-ZIP or JSON), merging into the existing
 * library. Returns the merged library and the number of imported views, or an
 * error message for malformed input.
 */
export async function importFromFile(file: File, existing: SavedViewLibrary): Promise<ImportResult> {
  const lower = file.name.toLowerCase();
  try {
    if (lower.endsWith('.json')) {
      const text = await file.text();
      const parsed = parseLibrary(text);
      if (!parsed) return { imported: 0, error: 'The file is not a valid saved-views export.' };
      const merged: SavedViewLibrary = {
        version: 1,
        folders: [...existing.folders, ...parsed.folders],
        views: [...existing.views, ...parsed.views],
      };
      return { library: merged, imported: parsed.views.length };
    }
    const buffer = await file.arrayBuffer();
    const views = importBcfZip(new Uint8Array(buffer));
    if (!views.length) return { imported: 0, error: 'No saved views were found in the file.' };
    const merged: SavedViewLibrary = { ...existing, views: [...existing.views, ...views] };
    return { library: merged, imported: views.length };
  } catch {
    return { imported: 0, error: 'The file could not be read or is not a supported saved-views file.' };
  }
}
