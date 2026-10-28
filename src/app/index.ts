import './style.css';
import { IfcAdapter, disposeModel } from '../adapters/ifc';
import { Viewer } from '../adapters/viewer';
import { ModelRegistry } from '../core/session';
import { ViewerAvailability } from '../core/availability';
import { deploymentStorage } from '../core/settings';
import type { FeatureHandle, ViewerControls } from '../core/contracts';
import { SelectionStore } from '../core/selection';
import { mountElementSelection } from '../features/element-selection';
import { mountElementProperties } from '../features/element-properties';
import { mountModelHierarchy } from '../features/model-hierarchy';
import { mountModelSearch } from '../features/model-search';
import { mountModelFiltering } from '../features/model-filtering';
import { mountIfcLoading } from '../features/ifc-loading';
import { mountModelControls } from '../features/model-controls';
import { mountNavigation } from '../features/viewer-navigation';
import { mountSettings } from '../features/viewer-settings';
import { mountFeedback } from '../features/loading-and-errors';
import { mountDisplayControls } from '../features/display-controls';
import { mountSectionClipping } from '../features/section-clipping';
import { mountModelMeasurement } from '../features/model-measurement';
import { mountFirstPerson } from '../features/first-person';
import { mountViewpoints } from '../features/viewpoints';
import { mountPropertyColoring } from '../features/property-coloring';
import { mountQuantityTakeoff } from '../features/quantity-takeoff';
import { mountEstimate } from '../features/estimate';
import { mountCostBreakdown } from '../features/cost-breakdown';
import { mountDrawings } from '../features/drawings';
import { createElement, PanelLeftClose, Boxes, Layers3, Bookmark, Search, Palette, Ruler, Scissors, PersonStanding, ClipboardList, Calculator, LayoutPanelLeft, List, X } from 'lucide';
import './fluent-bootstrap';
import './fluent2.css';

export function mountApplication(root: HTMLElement): FeatureHandle {
  root.innerHTML = `
    <header class="topbar">
      <span data-slot="models-toggle"></span>
      <h1>IFC <span>Viewer</span></h1>
      <nav class="application-ribbon" aria-label="Application ribbon">
        <span data-slot="loading" class="loading-slot"></span>
        <details class="ribbon-menu" data-ribbon-menu="view">
          <summary aria-label="View">View</summary>
          <div class="ribbon-menu-panel" role="group" aria-label="View options">
            <fluent-button appearance="subtle" type="button" data-action="toggle-properties" aria-controls="property-dock" aria-pressed="false">Properties</fluent-button>
          </div>
        </details>
        <details class="ribbon-menu" data-ribbon-menu="settings">
          <summary aria-label="Settings">Settings</summary>
          <div class="ribbon-menu-panel ribbon-settings-panel" data-slot="settings"></div>
        </details>
      </nav>
    </header>
    <main class="workspace">
      <nav class="tool-rail" aria-label="Viewer tools">
        <fluent-button appearance="subtle" icon-only type="button" class="tool-rail-item is-active" data-pane="models" aria-label="Model browser" aria-pressed="true" title="Model browser"></fluent-button>
        <fluent-button appearance="subtle" icon-only type="button" class="tool-rail-item" data-pane="levels" aria-label="Levels and hierarchy" aria-pressed="false" title="Levels and hierarchy"></fluent-button>
        <fluent-button appearance="subtle" icon-only type="button" class="tool-rail-item" data-action="toggle-properties" aria-label="Element properties" aria-controls="property-dock" aria-expanded="false" aria-pressed="false" title="Element properties"></fluent-button>
        <fluent-button appearance="subtle" icon-only type="button" class="tool-rail-item" data-pane="viewpoints" aria-label="Viewpoints" aria-pressed="false" title="Viewpoints"></fluent-button>
        <fluent-button appearance="subtle" icon-only type="button" class="tool-rail-item" data-pane="search" aria-label="Search and filter" aria-pressed="false" title="Search and filter"></fluent-button>
        <fluent-button appearance="subtle" icon-only type="button" class="tool-rail-item" data-pane="appearance" aria-label="Appearance" aria-pressed="false" title="Appearance"></fluent-button>
        <fluent-button appearance="subtle" icon-only type="button" class="tool-rail-item" data-pane="measure" aria-label="Measurement" aria-pressed="false" title="Measurement"></fluent-button>
        <fluent-button appearance="subtle" icon-only type="button" class="tool-rail-item" data-pane="clipping" aria-label="Section clipping" aria-pressed="false" title="Section clipping"></fluent-button>
        <fluent-button appearance="subtle" icon-only type="button" class="tool-rail-item" data-pane="walkthrough" aria-label="First person" aria-pressed="false" title="First person"></fluent-button>
        <fluent-button appearance="subtle" icon-only type="button" class="tool-rail-item" data-pane="takeoff" aria-label="Quantity takeoff" aria-pressed="false" title="Quantity takeoff"></fluent-button>
        <fluent-button appearance="subtle" icon-only type="button" class="tool-rail-item" data-pane="estimate" aria-label="Cost estimate" aria-pressed="false" title="Cost estimate"></fluent-button>
        <fluent-button appearance="subtle" icon-only type="button" class="tool-rail-item" data-pane="drawings" aria-label="Plan and section drawings" aria-pressed="false" title="Plan and section drawings"></fluent-button>
      </nav>
      <aside id="tool-sidebar" class="tool-sidebar" aria-label="Model browser and tools">
        <div class="tool-sidebar-header"><h2 data-slot="pane-title">Model browser</h2><fluent-button appearance="subtle" icon-only type="button" class="icon-button" data-action="close-pane" aria-label="Close side pane" title="Close side pane"></fluent-button></div>
        <div class="tool-pane" data-tool-pane="models"><aside id="models-sidebar" class="sidebar" aria-label="Models"></aside></div>
        <div class="tool-pane" data-tool-pane="levels" hidden><div data-slot="hierarchy"></div></div>
        <div class="tool-pane" data-tool-pane="viewpoints" hidden><div data-slot="viewpoints"></div></div>
        <div class="tool-pane" data-tool-pane="search" hidden><div data-slot="search"></div><div data-slot="filter"></div></div>
        <div class="tool-pane" data-tool-pane="appearance" hidden><div data-slot="display"></div><div data-slot="coloring"></div></div>
        <div class="tool-pane" data-tool-pane="measure" hidden><div data-slot="measurement"></div></div>
        <div class="tool-pane" data-tool-pane="clipping" hidden><div data-slot="clipping"></div></div>
        <div class="tool-pane" data-tool-pane="walkthrough" hidden><div data-slot="walkthrough"></div></div>
        <div class="tool-pane" data-tool-pane="takeoff" hidden><div data-slot="takeoff"></div></div>
        <div class="tool-pane" data-tool-pane="estimate" hidden><div data-slot="estimate"></div><div data-slot="cost-breakdown"></div></div>
        <div class="tool-pane" data-tool-pane="drawings" hidden><div data-slot="drawings"></div></div>
        <div class="pane-resize-handle" data-resize="tools" role="separator" aria-orientation="vertical" aria-label="Resize tool pane" aria-valuemin="240" aria-valuemax="520" aria-valuenow="310" tabindex="0"></div>
      </aside>
      <section class="viewport" aria-label="3D viewer"><div class="viewer-toolbar"><span data-slot="navigation"></span></div><div class="viewer-overlay" data-slot="feedback"></div></section>
      <aside id="property-dock" class="property-dock" data-slot="property-dock" aria-label="Element properties" hidden>
        <div class="property-dock-header">
          <h2>Properties</h2>
          <fluent-button appearance="subtle" icon-only type="button" class="icon-button" data-action="close-properties" aria-label="Close property pane" title="Close properties"></fluent-button>
        </div>
        <div class="property-resize-handle" data-resize="properties" role="separator" aria-orientation="vertical" aria-label="Resize property pane" aria-valuemin="260" aria-valuemax="560" aria-valuenow="360" tabindex="0"></div>
        <div class="property-dock-content" data-slot="properties"></div>
      </aside>
    </main>
    <footer></footer>
  `;
  const slot = (name: string) => root.querySelector<HTMLElement>(`[data-slot="${name}"]`)!;
  const panel = root.querySelector<HTMLElement>('#models-sidebar')!;
  const toolSidebar = root.querySelector<HTMLElement>('#tool-sidebar')!;
  const workspace = root.querySelector<HTMLElement>('.workspace')!;
  const viewport = root.querySelector<HTMLElement>('.viewport')!;
  const paneTitle = slot('pane-title');
  const paneLabels: Record<string, string> = {
    models: 'Model browser', levels: 'Levels and hierarchy', viewpoints: 'Viewpoints',
    search: 'Search and filter', appearance: 'Appearance', measure: 'Measurement',
    clipping: 'Section clipping', walkthrough: 'First person', takeoff: 'Quantity takeoff',
    estimate: 'Cost estimate', drawings: 'Plan and section drawings',
  };
  const railButtons = [...root.querySelectorAll<HTMLElement>('.tool-rail-item')];
  const propertyButton = root.querySelector<HTMLElement>('.tool-rail [data-action="toggle-properties"]')!;
  const ribbonPropertiesButton = root.querySelector<HTMLElement>('.ribbon-menu [data-action="toggle-properties"]')!;
  const viewMenu = root.querySelector<HTMLDetailsElement>('[data-ribbon-menu="view"]')!;
  const railIcons = [Boxes, Layers3, List, Bookmark, Search, Palette, Ruler, Scissors, PersonStanding, ClipboardList, Calculator, LayoutPanelLeft];
  railButtons.forEach((button, index) => { if (button !== propertyButton) button.append(createElement(railIcons[index])); });
  const toolRailButtons = railButtons.filter((button): button is HTMLElement => button !== propertyButton);
  propertyButton.append(createElement(List));
  const propertyDock = slot('property-dock');
  const setPropertyDockVisible = (visible: boolean) => {
    propertyDock.hidden = !visible;
    workspace.classList.toggle('property-open', visible);
    propertyButton.setAttribute('aria-pressed', String(visible));
    propertyButton.setAttribute('aria-expanded', String(visible));
    ribbonPropertiesButton.setAttribute('aria-pressed', String(visible));
    propertyButton.classList.toggle('is-active', visible);
  };
  const toolResizeHandle = root.querySelector<HTMLElement>('[data-resize="tools"]')!;
  const propertyResizeHandle = root.querySelector<HTMLElement>('[data-resize="properties"]')!;
  const resizeCleanups: Array<() => void> = [];
  const installResizer = (handle: HTMLElement, pane: 'tools' | 'properties') => {
    let activePointer: number | undefined;
    let startX = 0;
    let startWidth = 0;
    const min = pane === 'tools' ? 240 : 260;
    const max = pane === 'tools' ? 520 : 560;
    const width = () => pane === 'tools'
      ? toolSidebar.getBoundingClientRect().width
      : propertyDock.getBoundingClientRect().width;
    const setWidth = (next: number) => {
      const bounded = Math.max(min, Math.min(max, Math.round(next)));
      workspace.style.setProperty(pane === 'tools' ? '--tool-sidebar-width' : '--property-pane-width', `${bounded}px`);
      handle.setAttribute('aria-valuenow', String(bounded));
      handle.setAttribute('aria-valuetext', `${bounded} pixels`);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      activePointer = event.pointerId;
      startX = event.clientX;
      startWidth = width();
      handle.classList.add('is-resizing');
      handle.setPointerCapture(event.pointerId);
      event.preventDefault();
    };
    const onPointerMove = (event: PointerEvent) => {
      if (activePointer !== event.pointerId) return;
      const delta = event.clientX - startX;
      const growth = pane === 'tools' ? delta : -delta;
      setWidth(startWidth + growth);
    };
    const stop = (event: PointerEvent) => {
      if (activePointer !== event.pointerId) return;
      activePointer = undefined;
      handle.classList.remove('is-resizing');
      if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const sign = pane === 'tools' ? direction : -direction;
      setWidth(width() + sign * (event.shiftKey ? 40 : 16));
    };
    handle.addEventListener('pointerdown', onPointerDown);
    handle.addEventListener('pointermove', onPointerMove);
    handle.addEventListener('pointerup', stop);
    handle.addEventListener('pointercancel', stop);
    handle.addEventListener('keydown', onKeyDown);
    resizeCleanups.push(() => {
      handle.removeEventListener('pointerdown', onPointerDown);
      handle.removeEventListener('pointermove', onPointerMove);
      handle.removeEventListener('pointerup', stop);
      handle.removeEventListener('pointercancel', stop);
      handle.removeEventListener('keydown', onKeyDown);
    });
  };
  installResizer(toolResizeHandle, 'tools');
  installResizer(propertyResizeHandle, 'properties');
  propertyButton.addEventListener('click', () => setPropertyDockVisible(propertyDock.hidden));
  ribbonPropertiesButton.addEventListener('click', () => {
    setPropertyDockVisible(propertyDock.hidden);
    viewMenu.open = false;
    viewMenu.querySelector('summary')?.focus();
  });
  root.querySelector<HTMLElement>('[data-action="close-properties"]')!.append(createElement(X));
  root.querySelector<HTMLElement>('[data-action="close-properties"]')!.addEventListener('click', () => {
    setPropertyDockVisible(false);
    propertyButton.focus();
  });
  let sidebarToggle: HTMLElement | undefined;
  const showPaneContent = (pane: string) => {
    const content = root.querySelector<HTMLElement>(`[data-tool-pane="${pane}"]`);
    if (!content) return;
    root.querySelectorAll<HTMLElement>('.tool-pane').forEach((item) => { item.hidden = item !== content; });
    toolRailButtons.forEach((button) => {
      const active = button.dataset.pane === pane;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    paneTitle.textContent = paneLabels[pane] ?? 'Tools';
  };
  const setPaneVisible = (visible: boolean) => {
    if (sidebarToggle && (sidebarToggle.getAttribute('aria-expanded') === 'true') !== visible) {
      sidebarToggle.click();
      return;
    }
    toolSidebar.hidden = !visible;
    workspace.classList.toggle('pane-closed', !visible);
  };
  const activatePane = (pane: string) => {
    setPaneVisible(true);
    showPaneContent(pane);
  };
  toolRailButtons.forEach((button) => button.addEventListener('click', () => {
    const samePane = button.classList.contains('is-active') && !toolSidebar.hidden;
    if (samePane) {
      setPaneVisible(false);
      button.setAttribute('aria-pressed', 'false');
      button.classList.remove('is-active');
    } else activatePane(button.dataset.pane ?? 'models');
  }));
  root.querySelector<HTMLElement>('[data-action="close-pane"]')!.append(createElement(PanelLeftClose));
  root.querySelector<HTMLElement>('[data-action="close-pane"]')!.addEventListener('click', () => {
    const activeButton = toolRailButtons.find((button) => button.classList.contains('is-active'));
    setPaneVisible(false);
    toolRailButtons.forEach((button) => { button.classList.remove('is-active'); button.setAttribute('aria-pressed', 'false'); });
    (activeButton ?? toolRailButtons[0])?.focus();
  });
  activatePane('models');
  const availability = new ViewerAvailability();
  const adapter = new IfcAdapter();
  let viewer: Viewer | undefined;
  const selection = new SelectionStore();
  let disposed = false;
  const session = new ModelRegistry(async (bytes, modelId) => {
    if (!availability.available || disposed) throw new Error('Viewer unavailable. Reload to start a new session.');
    const result = await adapter.load(bytes, modelId);
    if (disposed || !availability.available || !viewer) {
      disposeModel(result.group);
      throw new Error('Viewer session ended.');
    }
    result.group.userData.modelId = modelId;
    try { viewer.add(result.group); } catch (error) { disposeModel(result.group); throw error; }
    return {
      schema: result.schema,
      properties: result.properties,
      hierarchy: result.hierarchy,
      elements: result.elements,
      triangles: result.triangles,
      get visible() { return result.group.visible; },
      setVisible(value) { result.group.visible = value; },
      dispose() { viewer?.remove(result.group); disposeModel(result.group); },
    };
  });
  try {
    viewer = new Viewer(viewport, (message) => { session.dispose(); availability.fail(message); });
  } catch {
    availability.fail('3D graphics are unavailable. Enable hardware acceleration or try a supported desktop browser.');
  }
  const controls: ViewerControls = {
    fit: () => viewer?.fit(),
    setGridVisible: (visible) => { if (viewer) viewer.grid.visible = visible; },
  };
  const feedback = mountFeedback(slot('feedback'), root.querySelector('footer')!, session, availability);
  const features: FeatureHandle[] = [
    feedback,
    mountIfcLoading(slot('loading'), session, availability),
    mountModelControls(panel, slot('models-toggle'), session, (collapsed) => {
      toolSidebar.hidden = collapsed;
      workspace.classList.toggle('pane-closed', collapsed);
      if (collapsed) toolRailButtons.forEach((button) => { button.classList.remove('is-active'); button.setAttribute('aria-pressed', 'false'); });
      else showPaneContent('models');
    }),
    mountNavigation(slot('navigation'), session, availability, controls),
    mountSettings(slot('settings'), deploymentStorage(import.meta.env.BASE_URL), controls, feedback.notice),
    mountElementSelection(viewport, selection, { pick: (x, y) => viewer?.pick(x, y) ?? null, highlight: (identity) => viewer?.highlight(identity) }),
    mountElementProperties(slot('properties'), selection, session),
    mountModelHierarchy(slot('hierarchy'), session, selection, viewer),
    mountModelSearch(slot('search'), session, selection),
    mountModelFiltering(slot('filter'), session, selection),
    ...(viewer ? [
      mountDisplayControls(slot('display'), session, viewer),
      mountSectionClipping(slot('clipping'), viewer),
      mountModelMeasurement(slot('measurement'), {
        pick: (x, y) => viewer!.pick(x, y),
        highlight: (identity) => viewer!.highlight(identity),
        getPoint: (x, y) => viewer!.getPoint(x, y),
        renderer: viewer.renderer.domElement,
      }, selection),
      mountFirstPerson(slot('walkthrough'), viewer),
      mountViewpoints(slot('viewpoints'), viewer),
      mountPropertyColoring(slot('coloring'), session, viewer),
      mountQuantityTakeoff(slot('takeoff'), session, selection),
      mountEstimate(slot('estimate'), session, feedback.notice),
      mountCostBreakdown(slot('cost-breakdown'), session, selection),
      mountDrawings(slot('drawings'), session),
    ] : []),
  ];
  sidebarToggle = slot('models-toggle').querySelector<HTMLElement>('button, fluent-button') ?? undefined;
  sidebarToggle?.setAttribute('aria-controls', 'tool-sidebar');
  let loadedCount = 0;
  const unsubscribe = session.subscribe(() => {
    const count = session.getModels().filter((model) => model.state === 'loaded').length;
    if (count > loadedCount) controls.fit();
    loadedCount = count;
  });
  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      unsubscribe();
      features.slice().reverse().forEach((feature) => feature.dispose());
      resizeCleanups.forEach((cleanup) => cleanup());
      session.dispose();
      viewer?.dispose();
      availability.dispose();
      root.replaceChildren();
    },
  };
}