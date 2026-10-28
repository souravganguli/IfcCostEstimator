import type { FeatureHandle } from '../../core/contracts';
import { fluentButton, fluentDropdown, fluentSlider } from '../../core/fluent';

export interface ClippingViewer {
  setClipping(plane: { normal: { x: number; y: number; z: number }; constant: number } | null): void;
}

export function mountSectionClipping(target: HTMLElement, viewer: ClippingViewer): FeatureHandle {
  const panel = document.createElement('section');
  panel.className = 'feature-panel clipping-panel';

  const heading = document.createElement('h2');
  heading.textContent = 'Section clipping';

  const toggle = fluentButton('Enable clipping', { appearance: 'outline' });
  const orientation = fluentDropdown(
    [
      { text: 'Horizontal', value: '0,1,0' },
      { text: 'Vertical X', value: '1,0,0' },
      { text: 'Vertical Z', value: '0,0,1' },
    ],
    { ariaLabel: 'Clip orientation', value: '0,1,0' },
  );
  const offset = fluentSlider({ ariaLabel: 'Clip position', min: -100, max: 100, step: 1, value: 0 });
  const reset = fluentButton('Reset', { appearance: 'subtle' });

  let enabled = false;

  const apply = () => {
    const [x, y, z] = orientation.value.split(',').map(Number);
    viewer.setClipping(enabled ? { normal: { x, y, z }, constant: Number(offset.value) } : null);
  };

  toggle.addEventListener('click', () => {
    enabled = !enabled;
    toggle.textContent = enabled ? 'Disable clipping' : 'Enable clipping';
    apply();
  });
  orientation.addEventListener('change', apply);
  offset.addEventListener('input', apply);
  reset.addEventListener('click', () => {
    offset.value = '0';
    enabled = false;
    toggle.textContent = 'Enable clipping';
    apply();
  });

  panel.append(heading, toggle, orientation, offset, reset);
  target.append(panel);

  return {
    dispose() {
      viewer.setClipping(null);
      panel.remove();
    },
  };
}
