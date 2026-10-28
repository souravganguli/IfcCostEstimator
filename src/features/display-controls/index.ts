import type { FeatureHandle, ModelSession } from '../../core/contracts';
import { fluentCheckbox, fluentSlider } from '../../core/fluent';

export interface DisplayViewer {
  setModelDisplay(modelId: number, options: { wireframe?: boolean; opacity?: number }): void;
}

export function mountDisplayControls(target: HTMLElement, session: ModelSession, viewer: DisplayViewer): FeatureHandle {
  const panel = document.createElement('section');
  panel.className = 'feature-panel display-panel';
  panel.setAttribute('aria-label', 'Display controls');

  const heading = document.createElement('h2');
  heading.textContent = 'Display';
  panel.append(heading);
  target.append(panel);

  const render = () => {
    panel.replaceChildren(heading);
    session.getModels().filter((model) => model.state === 'loaded').forEach((model) => {
      const row = document.createElement('div');
      row.className = 'display-row';
      const label = document.createElement('span');
      label.textContent = model.name;

      const wire = fluentCheckbox({ ariaLabel: `Wireframe ${model.id}` });
      const opacity = fluentSlider({ ariaLabel: `Opacity ${model.id}`, min: 0.1, max: 1, step: 0.05, value: 1 });
      wire.addEventListener('change', () => viewer.setModelDisplay(model.id, { wireframe: wire.checked }));
      opacity.addEventListener('input', () => viewer.setModelDisplay(model.id, { opacity: Number(opacity.value) }));

      row.append(label, wire, opacity);
      panel.append(row);
    });
  };

  const off = session.subscribe(render);
  render();

  return {
    dispose() {
      off();
      panel.remove();
    },
  };
}
