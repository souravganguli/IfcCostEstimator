import type { FeatureHandle } from '../../core/contracts';
import { createViewpoint, removeViewpoint, type Viewpoint } from '../../core/viewpoints';
import { fluentButton, fluentTextInput } from '../../core/fluent';

type Vec3 = { x: number; y: number; z: number };

export interface ViewpointViewer {
  readonly camera: { position: Vec3; rotation: Vec3 };
  readonly controls: { target: Vec3 };
  fit(): void;
}

export function mountViewpoints(target: HTMLElement, viewer: ViewpointViewer): FeatureHandle {
  const panel = document.createElement('section');
  panel.className = 'feature-panel viewpoints-panel';

  const heading = document.createElement('h2');
  heading.textContent = 'Viewpoints';

  const name = fluentTextInput({ placeholder: 'Viewpoint name', ariaLabel: 'Viewpoint name' });
  const save = fluentButton('Save viewpoint', { appearance: 'primary' });

  const list = document.createElement('div');
  panel.append(heading, name, save, list);
  target.append(panel);

  let items: Viewpoint[] = [];

  const render = () => {
    list.replaceChildren();
    items.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'viewpoint-row';

      const go = fluentButton(item.name, { appearance: 'subtle' });
      go.addEventListener('click', () => {
        [viewer.camera.position.x, viewer.camera.position.y, viewer.camera.position.z] = item.position;
        [viewer.controls.target.x, viewer.controls.target.y, viewer.controls.target.z] = item.target;
      });

      const del = fluentButton('×', { appearance: 'subtle', iconOnly: true, ariaLabel: `Delete ${item.name}` });
      del.addEventListener('click', () => {
        items = [...removeViewpoint(items, item.id)];
        render();
      });

      row.append(go, del);
      list.append(row);
    });
  };

  save.addEventListener('click', () => {
    items.push(
      createViewpoint(
        name.value,
        [viewer.camera.position.x, viewer.camera.position.y, viewer.camera.position.z],
        [viewer.controls.target.x, viewer.controls.target.y, viewer.controls.target.z],
      ),
    );
    name.value = '';
    render();
  });

  render();

  return {
    dispose() {
      panel.remove();
    },
  };
}
