import './style.css';
import { IfcAdapter, disposeModel } from '../adapters/ifc';
import { Viewer } from '../adapters/viewer';
import { ModelRegistry } from '../core/session';
import { ViewerAvailability } from '../core/availability';
import { deploymentStorage } from '../core/settings';
import type { FeatureHandle, ViewerControls } from '../core/contracts';
import { mountIfcLoading } from '../features/ifc-loading';
import { mountModelControls } from '../features/model-controls';
import { mountNavigation } from '../features/viewer-navigation';
import { mountSettings } from '../features/viewer-settings';
import { mountFeedback } from '../features/loading-and-errors';

export function mountApplication(root: HTMLElement): FeatureHandle {
  root.innerHTML = `
    <header class="topbar"><span data-slot="models-toggle"></span><h1>IFC <span>Viewer</span></h1><span data-slot="loading" class="loading-slot"></span></header>
    <main class="workspace">
      <aside id="models-sidebar" class="sidebar" aria-label="Models"></aside>
      <section class="viewport" aria-label="3D viewer"><div class="viewer-toolbar"><span data-slot="navigation"></span><span data-slot="settings"></span></div><div class="viewer-overlay" data-slot="feedback"></div></section>
    </main>
    <footer></footer>
  `;
  const slot = (name: string) => root.querySelector<HTMLElement>(`[data-slot="${name}"]`)!;
  const panel = root.querySelector<HTMLElement>('.sidebar')!;
  const workspace = root.querySelector<HTMLElement>('.workspace')!;
  const viewport = root.querySelector<HTMLElement>('.viewport')!;
  const availability = new ViewerAvailability();
  const adapter = new IfcAdapter();
  let viewer: Viewer | undefined;
  let disposed = false;
  const session = new ModelRegistry(async (bytes) => {
    if (!availability.available || disposed) throw new Error('Viewer unavailable. Reload to start a new session.');
    const result = await adapter.load(bytes);
    if (disposed || !availability.available || !viewer) {
      disposeModel(result.group);
      throw new Error('Viewer session ended.');
    }
    try { viewer.add(result.group); } catch (error) { disposeModel(result.group); throw error; }
    return {
      schema: result.schema,
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
      panel.hidden = collapsed;
      workspace.classList.toggle('sidebar-collapsed', collapsed);
    }),
    mountNavigation(slot('navigation'), session, availability, controls),
    mountSettings(slot('settings'), deploymentStorage(import.meta.env.BASE_URL), controls, feedback.notice),
  ];
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
      session.dispose();
      viewer?.dispose();
      availability.dispose();
      root.replaceChildren();
    },
  };
}