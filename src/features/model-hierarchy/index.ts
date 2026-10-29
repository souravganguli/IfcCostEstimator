import { Box, Building2, createElement, DoorOpen, Eye, EyeOff, Folder, Layers3, ScanSearch } from 'lucide';
import type { ElementVisibility, FeatureHandle, HierarchyNode, ModelSession, SelectionCapability } from '../../core/contracts';
import { fluentButton, fluentTextInput } from '../../core/fluent';
import { iconButton } from '../../core/ui';
import './style.css';

type IconFactory = typeof Box;

/**
 * Picks a type icon for a node by its kind and IFC class so spatial containers
 * read distinctly: spaces/zones get a room (door) icon, storeys and sites a
 * layers icon, buildings a building icon, and contained products a box icon.
 */
function iconFor(node: HierarchyNode): IconFactory {
  if (node.nodeKind === 'element') return Box;
  const ifcClass = node.ifcClass.toLowerCase();
  // IfcSpace / IfcZone / IfcSpatialZone — rooms and zones, not structural levels.
  if (ifcClass.includes('space') || ifcClass.includes('zone')) return DoorOpen;
  if (ifcClass.includes('project')) return Folder;
  if (ifcClass.includes('building') && ifcClass.includes('storey')) return Layers3;
  if (ifcClass.includes('building')) return Building2;
  if (ifcClass.includes('site')) return Layers3;
  return Folder;
}

/** Flattens the express ids of every element at or under a node. */
function elementDescendants(node: HierarchyNode): number[] {
  return [
    ...(node.nodeKind === 'element' ? [node.expressId] : []),
    ...node.children.flatMap(elementDescendants),
  ];
}

/**
 * Levels and hierarchy pane. Presents each loaded model as an indented,
 * collapsible Fluent 2 tree with single-line rows, hover/focus-revealed
 * visibility actions, visible hidden/mixed state, a filter box, and a live
 * "Show all (n)" control. Children are built lazily on first expand so the DOM
 * stays bounded on large models.
 */
export function mountModelHierarchy(target: HTMLElement, session: ModelSession, selection: SelectionCapability, visibility?: ElementVisibility): FeatureHandle {
  const panel = document.createElement('section');
  panel.className = 'feature-panel hierarchy-panel';
  panel.setAttribute('aria-label', 'Levels and hierarchy');

  const heading = document.createElement('h2');
  heading.textContent = 'Levels and hierarchy';

  // Toolbar: filter box + Show all (n).
  const toolbar = document.createElement('div');
  toolbar.className = 'hierarchy-toolbar';
  const filter = fluentTextInput({ placeholder: 'Filter tree…', ariaLabel: 'Filter hierarchy by name or class', type: 'search' });
  filter.classList.add('hierarchy-filter');
  const showAll = fluentButton('Show all', { appearance: 'subtle' });
  showAll.classList.add('hierarchy-show-all');
  toolbar.append(filter, showAll);

  const tree = document.createElement('fluent-tree');
  tree.className = 'hierarchy-tree';
  tree.setAttribute('aria-label', 'Model hierarchy tree');

  const empty = document.createElement('p');
  empty.className = 'hierarchy-empty';
  empty.textContent = 'Load a model to browse its levels and hierarchy.';

  panel.append(heading, toolbar, tree, empty);
  target.append(panel);

  // Row registry keyed by `${modelId}:${expressId}` so selection sync and
  // visibility refresh can find a rendered row without walking the DOM.
  type RowRecord = {
    readonly modelId: number;
    readonly node: HierarchyNode;
    readonly item: HTMLElement;
    readonly label: HTMLElement;
    readonly searchText: string;
    childrenBuilt: boolean;
  };
  const rows = new Map<string, RowRecord>();
  const key = (modelId: number, expressId: number) => `${modelId}:${expressId}`;

  let filterText = '';
  let suppressSelectionSync = false;
  let filtering = false;

  /** Returns the composed hidden set for a model (empty when no capability). */
  const hiddenOf = (modelId: number): ReadonlySet<number> => visibility?.hiddenOf(modelId) ?? new Set<number>();

  /** Live count of elements hidden by the hierarchy across all loaded models. */
  const hiddenCount = (): number => session.getModels()
    .filter((model) => model.state === 'loaded')
    .reduce((total, model) => total + hiddenOf(model.id).size, 0);

  const updateShowAll = () => {
    const count = hiddenCount();
    showAll.textContent = `Show all (${count})`;
    (showAll as HTMLButtonElement).disabled = !visibility || count === 0;
  };

  /**
   * Computes visibility state for a node: `hidden` when every element in its
   * subtree is hidden, `mixed` when only some are, otherwise `visible`.
   */
  const visibilityState = (modelId: number, node: HierarchyNode): 'visible' | 'hidden' | 'mixed' => {
    const ids = elementDescendants(node);
    if (ids.length === 0) return 'visible';
    const hidden = hiddenOf(modelId);
    let hiddenHits = 0;
    for (const id of ids) if (hidden.has(id)) hiddenHits += 1;
    if (hiddenHits === 0) return 'visible';
    if (hiddenHits === ids.length) return 'hidden';
    return 'mixed';
  };

  /** Applies hidden/mixed styling and swaps the hide/show action affordance. */
  const refreshRow = (record: RowRecord) => {
    const state = visibilityState(record.modelId, record.node);
    record.item.dataset.visibility = state;
    const badge = record.item.querySelector<HTMLElement>('.hierarchy-hidden-badge');
    if (badge) badge.hidden = state !== 'hidden';
    const mixedBadge = record.item.querySelector<HTMLElement>('.hierarchy-mixed-badge');
    if (mixedBadge) mixedBadge.hidden = state !== 'mixed';
    const toggle = record.item.querySelector<HTMLElement>('[data-action="visibility"]');
    if (toggle) {
      const willShow = state !== 'visible';
      const verb = willShow ? 'Show' : 'Hide';
      const label = `${verb} ${record.node.label}`;
      toggle.title = label;
      toggle.setAttribute('aria-label', label);
      toggle.replaceChildren(createIcon(willShow ? EyeOff : Eye));
    }
  };

  const refreshAllRows = () => {
    rows.forEach(refreshRow);
    updateShowAll();
  };

  const createIcon = (icon: IconFactory) => createElement(icon);

  /** Builds the trailing action affordances for a row (hidden in the aside slot until hover/focus). */
  const buildActions = (record: RowRecord): HTMLElement => {
    const aside = document.createElement('span');
    aside.className = 'hierarchy-actions';
    aside.setAttribute('slot', 'aside');

    const hiddenBadge = document.createElement('span');
    hiddenBadge.className = 'hierarchy-hidden-badge';
    hiddenBadge.textContent = 'Hidden';
    hiddenBadge.hidden = true;
    aside.append(hiddenBadge);

    const mixedBadge = document.createElement('span');
    mixedBadge.className = 'hierarchy-mixed-badge';
    mixedBadge.textContent = 'Partly hidden';
    mixedBadge.hidden = true;
    aside.append(mixedBadge);

    if (visibility) {
      const supportsIsolate = record.node.nodeKind === 'spatial';
      if (supportsIsolate) {
        const isolate = iconButton(`Isolate ${record.node.label}`, ScanSearch);
        isolate.classList.add('hierarchy-action');
        isolate.dataset.action = 'isolate';
        isolate.addEventListener('click', (event) => {
          event.stopPropagation();
          if (visibility.isIsolated(record.modelId)) visibility.restore(record.modelId);
          else visibility.isolate(record.modelId, elementDescendants(record.node));
          refreshAllRows();
        });
        aside.append(isolate);
      }
      const toggle = iconButton(`Hide ${record.node.label}`, Eye);
      toggle.classList.add('hierarchy-action');
      toggle.dataset.action = 'visibility';
      toggle.addEventListener('click', (event) => {
        event.stopPropagation();
        const ids = elementDescendants(record.node);
        if (ids.length === 0) return;
        const state = visibilityState(record.modelId, record.node);
        if (state === 'visible') visibility.hide(record.modelId, ids);
        else visibility.show(record.modelId, ids);
        refreshAllRows();
      });
      aside.append(toggle);
    }
    return aside;
  };

  /** Creates a `fluent-tree-item` for a node without building its children yet. */
  const createItem = (modelId: number, node: HierarchyNode): RowRecord => {
    const item = document.createElement('fluent-tree-item');
    item.dataset.modelId = String(modelId);
    item.dataset.expressId = String(node.expressId);
    item.dataset.kind = node.nodeKind;
    item.dataset.ifcClass = node.ifcClass;

    const startIcon = document.createElement('span');
    startIcon.className = 'hierarchy-icon';
    startIcon.setAttribute('slot', 'start');
    startIcon.setAttribute('aria-hidden', 'true');
    startIcon.append(createIcon(iconFor(node)));
    item.append(startIcon);

    const label = document.createElement('span');
    label.className = 'hierarchy-label';
    label.textContent = node.label;
    label.title = node.label;
    item.append(label);

    const searchText = `${node.label} ${node.ifcClass}`.toLowerCase();
    const record: RowRecord = { modelId, node, item, label, searchText, childrenBuilt: false };
    item.append(buildActions(record));

    // Lazy-expansion placeholder: Fluent's `fluent-tree-item` auto-sets the
    // `empty` attribute (hiding the chevron and blocking expansion) when its
    // `item` slot has no child tree items. For nodes that *will* have children
    // once expanded, slot an invisible placeholder item so the chevron shows;
    // it is replaced by the real children on first expand. Genuine leaves keep
    // no placeholder and stay correctly non-expandable.
    if (node.children.length > 0) {
      const placeholder = document.createElement('fluent-tree-item');
      placeholder.setAttribute('slot', 'item');
      placeholder.dataset.placeholder = 'true';
      placeholder.setAttribute('aria-hidden', 'true');
      placeholder.hidden = true;
      item.append(placeholder);
    }

    // Select on activation (click/Enter via the change event).
    item.addEventListener('change', () => {
      if (suppressSelectionSync) return;
      if ((item as unknown as { selected: boolean }).selected && node.nodeKind === 'element') {
        selection.set({ modelId, expressId: node.expressId });
      }
    });

    // Lazily build children the first time the node expands.
    item.addEventListener('toggle', () => {
      if (record.childrenBuilt) return;
      if (!(item as unknown as { expanded: boolean }).expanded) return;
      buildChildren(record);
    });

    rows.set(key(modelId, node.expressId), record);
    refreshRow(record);
    return record;
  };

  /** Builds and slots the child tree items for an expanded node. */
  const buildChildren = (record: RowRecord) => {
    record.childrenBuilt = true;
    const fragment = document.createDocumentFragment();
    for (const child of record.node.children) {
      const childRecord = createItem(record.modelId, child);
      childRecord.item.setAttribute('slot', 'item');
      fragment.append(childRecord.item);
    }
    // Drop the lazy-expansion placeholder now that real children exist.
    record.item.querySelector(':scope > [data-placeholder="true"]')?.remove();
    record.item.append(fragment);
    if (!filtering) applyFilter();
  };

  /** True when a node, or any of its descendants, matches the filter term. */
  const subtreeMatches = (node: HierarchyNode, term: string): boolean => {
    if (`${node.label} ${node.ifcClass}`.toLowerCase().includes(term)) return true;
    return node.children.some((child) => subtreeMatches(child, term));
  };

  /**
   * Non-destructive filter: shows nodes whose label/class matches (plus their
   * ancestors) and forces matching branches open so lazily-built children are
   * materialised. An empty filter restores the full tree. Visibility of
   * elements is never changed.
   */
  const applyFilter = () => {
    const term = filterText.trim().toLowerCase();
    if (!term) {
      rows.forEach((record) => { record.item.hidden = false; });
      return;
    }
    filtering = true;
    try {
      const loaded = session.getModels().filter((model) => model.state === 'loaded');
      for (const model of loaded) {
        const hierarchy = session.getAsset(model.id)?.hierarchy?.getHierarchy(model.id);
        if (!hierarchy) continue;
        const walk = (node: HierarchyNode): boolean => {
          const record = rows.get(key(model.id, node.expressId));
          const matched = subtreeMatches(node, term);
          if (matched && node.children.length > 0 && record && !record.childrenBuilt) {
            buildChildren(record);
          }
          if (matched && record) (record.item as unknown as { expanded: boolean }).expanded = true;
          node.children.forEach(walk);
          if (record) record.item.hidden = !matched;
          return matched;
        };
        walk(hierarchy.root);
      }
    } finally {
      filtering = false;
    }
  };

  const render = () => {
    rows.clear();
    tree.replaceChildren();
    const loaded = session.getModels().filter((model) => model.state === 'loaded');
    empty.hidden = loaded.length > 0;
    for (const model of loaded) {
      const hierarchy = session.getAsset(model.id)?.hierarchy?.getHierarchy(model.id);
      if (!hierarchy) continue;
      const root = createItem(model.id, hierarchy.root);
      // Present the model file name on the root row for clarity.
      root.label.textContent = model.name;
      root.label.title = model.name;
      root.item.classList.add('hierarchy-model-root');
      tree.append(root.item);
    }
    refreshAllRows();
    applyFilter();
  };

  filter.addEventListener('input', () => {
    filterText = filter.value;
    applyFilter();
  });

  showAll.addEventListener('click', () => {
    visibility?.showAll();
    refreshAllRows();
  });

  // Reflect external selection: mark the matching row active and reveal it by
  // expanding its ancestors (building them lazily as needed).
  const revealSelection = (modelId: number, expressId: number) => {
    const chain: HierarchyNode[] = [];
    const hierarchy = session.getAsset(modelId)?.hierarchy?.getHierarchy(modelId);
    if (!hierarchy) return;
    const find = (node: HierarchyNode, trail: HierarchyNode[]): HierarchyNode[] | null => {
      const next = [...trail, node];
      if (node.nodeKind === 'element' && node.expressId === expressId) return next;
      for (const child of node.children) {
        const hit = find(child, next);
        if (hit) return hit;
      }
      return null;
    };
    const path = find(hierarchy.root, []);
    if (!path) return;
    chain.push(...path);
    // Expand/build ancestors from the root down to the target's parent.
    for (let depth = 0; depth < chain.length - 1; depth += 1) {
      const record = rows.get(key(modelId, chain[depth].expressId));
      if (!record) return;
      (record.item as unknown as { expanded: boolean }).expanded = true;
      if (!record.childrenBuilt) buildChildren(record);
    }
    const targetRow = rows.get(key(modelId, expressId));
    if (targetRow) {
      targetRow.item.scrollIntoView({ block: 'nearest' });
    }
  };

  const syncSelection = (identity: ReturnType<SelectionCapability['current']>) => {
    suppressSelectionSync = true;
    rows.forEach((record) => {
      const active = identity !== null && record.modelId === identity.modelId
        && record.node.nodeKind === 'element' && record.node.expressId === identity.expressId;
      (record.item as unknown as { selected: boolean }).selected = active;
    });
    if (identity) revealSelection(identity.modelId, identity.expressId);
    suppressSelectionSync = false;
  };

  const unsubscribeSession = session.subscribe(() => { render(); syncSelection(selection.current()); });
  const unsubscribeSelection = selection.subscribe(syncSelection);
  const unsubscribeVisibility = visibility?.subscribe(refreshAllRows) ?? (() => {});

  render();
  syncSelection(selection.current());

  return {
    dispose() {
      unsubscribeSession();
      unsubscribeSelection();
      unsubscribeVisibility();
      rows.clear();
      panel.remove();
    },
  };
}
