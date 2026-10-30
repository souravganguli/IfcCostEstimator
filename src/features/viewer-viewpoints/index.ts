import type { FeatureHandle } from '../../core/contracts';
import {
  addFolder,
  addView,
  atViewLimit,
  clearViews,
  createSavedView,
  duplicateView,
  emptyLibrary,
  exceedsComponentThreshold,
  moveViewToFolder,
  removeFolder,
  removeViews,
  renameFolder,
  renameView,
  reorderView,
  SNAPSHOT_CATEGORIES,
  snapshotsDiffer,
  updateViewSnapshot,
  type SavedView,
  type SavedViewLibrary,
  type SnapshotCategory,
} from '../../core/saved-views';
import { fluentButton, fluentCheckbox, fluentText, fluentTextInput } from '../../core/fluent';
import {
  exportLibraryToBcf,
  exportLibraryToJson,
  importFromFile,
  loadLibrary,
  loadOpenTabs,
  saveLibrary,
  saveOpenTabs,
  type LibraryStorage,
} from './persistence';
import { captureSnapshot, restoreSnapshot, type ViewpointCapabilities } from './scene-capture';

const THUMBNAIL_MAX = 240;
const CATEGORY_LABELS: Record<SnapshotCategory, string> = {
  camera: 'Camera + projection',
  clipping: 'Clipping',
  visibility: 'Visibility',
  selection: 'Selection',
  coloring: 'Coloring',
};

export interface ViewpointsOptions {
  /** Host element for the view-tab strip (shell-owned location, above the canvas). */
  readonly tabStripHost?: HTMLElement;
  /** Persistence surface; defaults to window.localStorage when available. */
  readonly storage?: LibraryStorage;
  /** Non-blocking user notice channel (toast/status). */
  notice?(message: string): void;
}

interface OpenTab {
  readonly id: string;
  dirty: boolean;
}

function defaultStorage(): LibraryStorage | undefined {
  try {
    const probe = window.localStorage;
    probe.getItem('saved-views:probe');
    return probe;
  } catch {
    return undefined;
  }
}

/**
 * Mount the Saved Views feature: a persistent library with folders, a save
 * dialog with per-category capture, a view-tab strip over the shared canvas,
 * deterministic restore, and BCF-ZIP / JSON import/export.
 */
export function mountViewerViewpoints(
  target: HTMLElement,
  capabilities: ViewpointCapabilities,
  options: ViewpointsOptions = {},
): FeatureHandle {
  const storage = options.storage ?? defaultStorage();
  const notice = options.notice ?? (() => {});

  // --- state -----------------------------------------------------------
  const loaded = storage ? loadLibrary(storage) : { library: emptyLibrary(), warning: undefined };
  let library: SavedViewLibrary = loaded.library;
  if (loaded.warning) notice(loaded.warning);
  const openTabs: OpenTab[] = [];
  let activeTabId: string | undefined;
  /** Snapshot keys of what was last applied per open tab, for dirty detection. */
  const multiSelected = new Set<string>();

  const persist = () => {
    if (!storage) {
      notice('Saved views storage is unavailable. Export to a file to keep your views.');
      return;
    }
    const warning = saveLibrary(storage, library);
    if (warning) notice(warning);
    saveOpenTabs(storage, openTabs.map((tab) => tab.id), activeTabId);
  };

  const findView = (id: string): SavedView | undefined => library.views.find((view) => view.id === id);

  // --- DOM scaffold ----------------------------------------------------
  const panel = document.createElement('section');
  panel.className = 'feature-panel viewpoints-panel';
  const heading = document.createElement('h2');
  heading.textContent = 'Saved views';

  const saveCurrent = fluentButton('Save current view', { appearance: 'primary' });
  const newFolderButton = fluentButton('New folder', { appearance: 'subtle' });
  const importButton = fluentButton('Import…', { appearance: 'subtle' });
  const importPicker = document.createElement('input');
  importPicker.type = 'file';
  importPicker.accept = '.bcfzip,.bcf,.zip,.json';
  importPicker.hidden = true;
  const exportBcfButton = fluentButton('Export BCF', { appearance: 'subtle' });
  const exportJsonButton = fluentButton('Export JSON', { appearance: 'subtle' });
  const clearAllButton = fluentButton('Clear all', { appearance: 'subtle' });
  const deleteSelectedButton = fluentButton('Delete selected', { appearance: 'subtle' });

  const toolbar = document.createElement('div');
  toolbar.className = 'viewpoints-toolbar';
  toolbar.append(saveCurrent, newFolderButton, importButton, exportBcfButton, exportJsonButton, deleteSelectedButton, clearAllButton);

  const dialogHost = document.createElement('div');
  dialogHost.className = 'viewpoints-dialog-host';

  const list = document.createElement('div');
  list.className = 'viewpoints-library';
  list.setAttribute('role', 'list');

  panel.append(heading, toolbar, dialogHost, list, importPicker);
  target.append(panel);

  // --- tab strip -------------------------------------------------------
  const tabStrip = document.createElement('div');
  tabStrip.className = 'view-tab-strip';
  tabStrip.setAttribute('role', 'tablist');
  tabStrip.setAttribute('aria-label', 'Open views');
  (options.tabStripHost ?? panel).append(tabStrip);

  // --- capture / restore helpers --------------------------------------
  const markActiveDirtyState = () => {
    const tab = openTabs.find((item) => item.id === activeTabId);
    if (!tab) return;
    const view = findView(tab.id);
    if (!view) return;
    const current = captureSnapshot(capabilities, new Set(effectiveCategories(view)));
    tab.dirty = snapshotsDiffer(current, view.snapshot);
  };

  /** Categories a view actually covers (so dirty detection ignores excluded ones). */
  const effectiveCategories = (view: SavedView): SnapshotCategory[] =>
    SNAPSHOT_CATEGORIES.filter((category) => {
      switch (category) {
        case 'camera':
          return view.snapshot.camera !== undefined;
        case 'clipping':
          return view.snapshot.clippingPlanes !== undefined;
        case 'visibility':
          return view.snapshot.visibility !== undefined;
        case 'selection':
          return view.snapshot.selection !== undefined;
        case 'coloring':
          return view.snapshot.coloring !== undefined;
        default:
          return false;
      }
    });

  const restore = (view: SavedView) => {
    const result = restoreSnapshot(capabilities, view.snapshot);
    if (result.cameraOnly && (view.snapshot.visibility || view.snapshot.coloring)) {
      notice('Source model not loaded: camera and clipping restored; element visibility/coloring skipped.');
    } else if (result.missing > 0) {
      notice(`${result.missing} element${result.missing === 1 ? '' : 's'} not found; those overrides were skipped.`);
    }
  };

  const openTab = (id: string) => {
    const view = findView(id);
    if (!view) return;
    if (!openTabs.some((tab) => tab.id === id)) openTabs.push({ id, dirty: false });
    activeTabId = id;
    restore(view);
    const tab = openTabs.find((item) => item.id === id);
    if (tab) tab.dirty = false;
    renderTabs();
    renderLibrary();
    persist();
  };

  const closeTab = (id: string) => {
    const index = openTabs.findIndex((tab) => tab.id === id);
    if (index < 0) return;
    openTabs.splice(index, 1);
    if (activeTabId === id) activeTabId = openTabs[Math.max(0, index - 1)]?.id;
    renderTabs();
    renderLibrary();
    persist();
  };

  // --- save dialog -----------------------------------------------------
  let dialogOpen = false;
  const openSaveDialog = (prefill?: SavedView) => {
    if (dialogOpen) return;
    if (!prefill && atViewLimit(library)) {
      notice('Maximum number of saved views reached. Delete a view before saving another.');
      return;
    }
    dialogOpen = true;
    dialogHost.replaceChildren();

    const dialog = document.createElement('div');
    dialog.className = 'viewpoints-dialog';
    dialog.setAttribute('role', 'group');
    dialog.setAttribute('aria-label', 'Save current view');

    const nameInput = fluentTextInput({ ariaLabel: 'View name', placeholder: 'View name', value: prefill ? `${prefill.name}` : 'New view' });

    const categoryList = document.createElement('div');
    categoryList.className = 'viewpoints-categories';
    const checks = new Map<SnapshotCategory, HTMLInputElement>();
    SNAPSHOT_CATEGORIES.forEach((category) => {
      const checkbox = fluentCheckbox({ label: CATEGORY_LABELS[category], checked: true, ariaLabel: CATEGORY_LABELS[category] });
      checks.set(category, checkbox);
      categoryList.append(checkbox);
    });

    const thumb = capabilities.scene.captureThumbnail(THUMBNAIL_MAX);
    const preview = document.createElement('img');
    preview.className = 'viewpoints-thumb-preview';
    preview.alt = 'View preview';
    if (thumb) preview.src = thumb;

    const confirm = fluentButton('Save', { appearance: 'primary' });
    const cancel = fluentButton('Cancel', { appearance: 'subtle' });
    const actions = document.createElement('div');
    actions.className = 'viewpoints-dialog-actions';
    actions.append(confirm, cancel);

    const close = () => {
      dialogOpen = false;
      dialogHost.replaceChildren();
    };

    confirm.addEventListener('click', () => {
      const categories = new Set<SnapshotCategory>(
        [...checks].filter(([, checkbox]) => checkbox.checked).map(([category]) => category),
      );
      if (categories.size === 0) {
        notice('Select at least one category to capture.');
        return;
      }
      const snapshot = captureSnapshot(capabilities, categories);
      if (exceedsComponentThreshold(snapshot)) {
        notice('This view references a large number of elements; it was saved without dropping any.');
      }
      if (atViewLimit(library)) {
        notice('Maximum number of saved views reached.');
        close();
        return;
      }
      const view = createSavedView(nameInput.value, snapshot, { thumbnail: thumb });
      library = addView(library, view);
      close();
      openTab(view.id);
    });
    cancel.addEventListener('click', close);

    dialog.append(
      fluentText('Save current view', { weight: 'semibold', block: true }),
      nameInput,
      fluentText('Capture', { size: 200, block: true }),
      categoryList,
      preview,
      actions,
    );
    dialogHost.append(dialog);
    nameInput.focus();
  };

  // --- rename (inline) -------------------------------------------------
  const promptRename = (view: SavedView) => {
    const nextName = window.prompt('Rename view', view.name);
    if (nextName === null) return;
    library = renameView(library, view.id, nextName);
    renderLibrary();
    renderTabs();
    persist();
  };

  // --- library rendering ----------------------------------------------
  const folderOptions = () =>
    [{ value: '', text: 'No folder' }, ...library.folders.map((folder) => ({ value: folder.id, text: folder.name }))];

  const renderEntry = (view: SavedView, index: number): HTMLElement => {
    const row = document.createElement('div');
    row.className = 'viewpoints-entry';
    row.setAttribute('role', 'listitem');
    row.dataset.viewId = view.id;
    row.draggable = true;

    const select = fluentCheckbox({ ariaLabel: `Select ${view.name}`, checked: multiSelected.has(view.id) });
    select.addEventListener('change', () => {
      if (select.checked) multiSelected.add(view.id);
      else multiSelected.delete(view.id);
      updateToolbarState();
    });

    const thumb = document.createElement('img');
    thumb.className = 'viewpoints-thumb';
    thumb.alt = '';
    if (view.thumbnail) thumb.src = view.thumbnail;

    const label = document.createElement('button');
    label.type = 'button';
    label.className = 'viewpoints-entry-label';
    const dirty = openTabs.find((tab) => tab.id === view.id)?.dirty;
    label.textContent = `${view.name}${dirty ? ' *' : ''}`;
    label.title = 'Double-click to open as a tab';
    label.addEventListener('dblclick', () => openTab(view.id));
    label.addEventListener('click', () => openTab(view.id));

    const rename = fluentButton('Rename', { appearance: 'subtle' });
    rename.addEventListener('click', () => promptRename(view));
    const duplicate = fluentButton('Duplicate', { appearance: 'subtle' });
    duplicate.addEventListener('click', () => {
      library = duplicateView(library, view.id);
      renderLibrary();
      persist();
    });
    const up = fluentButton('↑', { appearance: 'subtle', iconOnly: true, ariaLabel: `Move ${view.name} up`, disabled: index === 0 });
    up.addEventListener('click', () => {
      library = reorderView(library, view.id, index - 1);
      renderLibrary();
      persist();
    });
    const down = fluentButton('↓', { appearance: 'subtle', iconOnly: true, ariaLabel: `Move ${view.name} down`, disabled: index === library.views.length - 1 });
    down.addEventListener('click', () => {
      library = reorderView(library, view.id, index + 1);
      renderLibrary();
      persist();
    });
    const del = fluentButton('Delete', { appearance: 'subtle', ariaLabel: `Delete ${view.name}` });
    del.addEventListener('click', () => {
      library = removeViews(library, [view.id]);
      multiSelected.delete(view.id);
      closeTab(view.id);
      renderLibrary();
      persist();
    });

    const folderSelect = document.createElement('select');
    folderSelect.className = 'viewpoints-folder-select';
    folderSelect.setAttribute('aria-label', `Folder for ${view.name}`);
    folderOptions().forEach((option) => {
      const element = document.createElement('option');
      element.value = option.value;
      element.textContent = option.text;
      if ((view.folderId ?? '') === option.value) element.selected = true;
      folderSelect.append(element);
    });
    folderSelect.addEventListener('change', () => {
      library = moveViewToFolder(library, view.id, folderSelect.value || undefined);
      renderLibrary();
      persist();
    });

    const actions = document.createElement('div');
    actions.className = 'viewpoints-entry-actions';
    actions.append(rename, duplicate, up, down, folderSelect, del);

    row.addEventListener('dragstart', (event) => event.dataTransfer?.setData('text/plain', view.id));
    row.addEventListener('dragover', (event) => event.preventDefault());
    row.addEventListener('drop', (event) => {
      event.preventDefault();
      const draggedId = event.dataTransfer?.getData('text/plain');
      if (!draggedId || draggedId === view.id) return;
      library = reorderView(library, draggedId, index);
      renderLibrary();
      persist();
    });

    row.append(select, thumb, label, actions);
    return row;
  };

  const renderLibrary = () => {
    list.replaceChildren();
    if (library.views.length === 0) {
      const empty = fluentText('No saved views yet. Set up the scene and choose Save current view.', { size: 200, block: true });
      list.append(empty);
      updateToolbarState();
      return;
    }

    const grouped = new Map<string | undefined, SavedView[]>();
    library.views.forEach((view) => {
      const key = view.folderId;
      const bucket = grouped.get(key) ?? [];
      bucket.push(view);
      grouped.set(key, bucket);
    });

    let flatIndex = 0;
    const renderBucket = (views: SavedView[]) => {
      views.forEach((view) => {
        const index = library.views.findIndex((item) => item.id === view.id);
        list.append(renderEntry(view, index));
        flatIndex += 1;
      });
    };

    const rootViews = grouped.get(undefined) ?? [];
    if (rootViews.length) renderBucket(rootViews);

    library.folders.forEach((folder) => {
      const header = document.createElement('div');
      header.className = 'viewpoints-folder-header';
      const title = fluentText(folder.name, { weight: 'semibold' });
      const renameFolderButton = fluentButton('Rename', { appearance: 'subtle', ariaLabel: `Rename folder ${folder.name}` });
      renameFolderButton.addEventListener('click', () => {
        const next = window.prompt('Rename folder', folder.name);
        if (next === null) return;
        library = renameFolder(library, folder.id, next);
        renderLibrary();
        persist();
      });
      const deleteFolderButton = fluentButton('Delete folder', { appearance: 'subtle', ariaLabel: `Delete folder ${folder.name}` });
      deleteFolderButton.addEventListener('click', () => {
        library = removeFolder(library, folder.id);
        renderLibrary();
        persist();
      });
      header.append(title, renameFolderButton, deleteFolderButton);
      list.append(header);
      renderBucket(grouped.get(folder.id) ?? []);
    });

    void flatIndex;
    updateToolbarState();
  };

  const renderTabs = () => {
    tabStrip.replaceChildren();
    openTabs.forEach((tab) => {
      const view = findView(tab.id);
      if (!view) return;
      const tabElement = document.createElement('div');
      tabElement.className = 'view-tab';
      tabElement.setAttribute('role', 'tab');
      tabElement.dataset.viewId = tab.id;
      tabElement.setAttribute('aria-selected', String(tab.id === activeTabId));
      if (tab.id === activeTabId) tabElement.classList.add('is-active');

      const activate = document.createElement('button');
      activate.type = 'button';
      activate.className = 'view-tab-label';
      activate.textContent = `${view.name}${tab.dirty ? ' *' : ''}`;
      activate.addEventListener('click', () => openTab(tab.id));

      const save = fluentButton('Save', { appearance: 'subtle', ariaLabel: `Save ${view.name}` });
      save.addEventListener('click', () => {
        const snapshot = captureSnapshot(capabilities, new Set(effectiveCategories(view)));
        const thumbnail = capabilities.scene.captureThumbnail(THUMBNAIL_MAX);
        library = updateViewSnapshot(library, tab.id, snapshot, thumbnail);
        tab.dirty = false;
        renderTabs();
        renderLibrary();
        persist();
        notice('View updated.');
      });

      const saveAsNew = fluentButton('Save as new', { appearance: 'subtle', ariaLabel: `Save ${view.name} as a new view` });
      saveAsNew.addEventListener('click', () => {
        if (atViewLimit(library)) {
          notice('Maximum number of saved views reached.');
          return;
        }
        const snapshot = captureSnapshot(capabilities, new Set(effectiveCategories(view)));
        const thumbnail = capabilities.scene.captureThumbnail(THUMBNAIL_MAX);
        const copy = createSavedView(`${view.name} copy`, snapshot, { thumbnail, folderId: view.folderId });
        library = addView(library, copy);
        openTab(copy.id);
      });

      const close = fluentButton('×', { appearance: 'subtle', iconOnly: true, ariaLabel: `Close ${view.name} tab` });
      close.addEventListener('click', (event) => {
        event.stopPropagation();
        closeTab(tab.id);
      });

      tabElement.append(activate);
      if (tab.dirty) tabElement.append(save, saveAsNew);
      tabElement.append(close);
      tabStrip.append(tabElement);
    });
  };

  const updateToolbarState = () => {
    deleteSelectedButton.toggleAttribute('disabled', multiSelected.size === 0);
    clearAllButton.toggleAttribute('disabled', library.views.length === 0);
    exportBcfButton.toggleAttribute('disabled', library.views.length === 0);
    exportJsonButton.toggleAttribute('disabled', library.views.length === 0);
  };

  // --- toolbar wiring --------------------------------------------------
  saveCurrent.addEventListener('click', () => openSaveDialog());
  newFolderButton.addEventListener('click', () => {
    const name = window.prompt('Folder name', 'Folder');
    if (name === null) return;
    library = addFolder(library, name);
    renderLibrary();
    persist();
  });
  clearAllButton.addEventListener('click', () => {
    library = clearViews(library);
    multiSelected.clear();
    openTabs.splice(0, openTabs.length);
    activeTabId = undefined;
    renderLibrary();
    renderTabs();
    persist();
  });
  deleteSelectedButton.addEventListener('click', () => {
    const ids = [...multiSelected];
    library = removeViews(library, ids);
    ids.forEach((id) => closeTab(id));
    multiSelected.clear();
    renderLibrary();
    persist();
  });
  exportBcfButton.addEventListener('click', () => {
    const ids = multiSelected.size ? [...multiSelected] : undefined;
    exportLibraryToBcf(library, ids);
  });
  exportJsonButton.addEventListener('click', () => {
    const ids = multiSelected.size ? [...multiSelected] : undefined;
    exportLibraryToJson(library, ids);
  });
  importButton.addEventListener('click', () => importPicker.click());
  const onImport = async () => {
    const file = importPicker.files?.[0];
    importPicker.value = '';
    if (!file) return;
    const result = await importFromFile(file, library);
    if (result.error) {
      notice(result.error);
      return;
    }
    if (result.library) {
      library = result.library;
      renderLibrary();
      persist();
      notice(`Imported ${result.imported} view${result.imported === 1 ? '' : 's'}.`);
    }
  };
  importPicker.addEventListener('change', onImport);

  // Mark the active tab dirty when the scene diverges. The viewer re-renders
  // every frame; poll at a modest cadence to update the `*` marker.
  const dirtyTimer = window.setInterval(() => {
    const before = openTabs.find((tab) => tab.id === activeTabId)?.dirty;
    markActiveDirtyState();
    const after = openTabs.find((tab) => tab.id === activeTabId)?.dirty;
    if (before !== after) {
      renderTabs();
      renderLibrary();
    }
  }, 500);

  // --- restore persisted open tabs ------------------------------------
  if (storage) {
    const persistedTabs = loadOpenTabs(storage);
    persistedTabs.ids.forEach((id) => {
      if (findView(id)) openTabs.push({ id, dirty: false });
    });
    if (persistedTabs.activeId && findView(persistedTabs.activeId)) {
      openTab(persistedTabs.activeId);
    }
  }

  renderLibrary();
  renderTabs();

  return {
    dispose() {
      window.clearInterval(dirtyTimer);
      importPicker.removeEventListener('change', onImport);
      tabStrip.remove();
      panel.remove();
    },
  };
}
