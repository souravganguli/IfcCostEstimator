import type { FeatureHandle, ViewerPicking, SelectionCapability } from '../../core/contracts';
import { measurePoints, formatMeasurement, type Point3 } from '../../core/measurement';
import { fluentButton } from '../../core/fluent';

export interface MeasurementViewer extends ViewerPicking {
  getPoint?(x: number, y: number): Point3 | null;
  renderer?: {
    addEventListener(type: string, listener: EventListener): void;
    removeEventListener(type: string, listener: EventListener): void;
  };
}

export function mountModelMeasurement(
  target: HTMLElement,
  viewer: MeasurementViewer,
  selection?: SelectionCapability,
): FeatureHandle {
  const panel = document.createElement('section');
  panel.className = 'feature-panel measurement-panel';

  const heading = document.createElement('h2');
  heading.textContent = 'Measurement';

  const start = fluentButton('Measure', { appearance: 'outline' });
  const reset = fluentButton('Reset', { appearance: 'subtle', disabled: true });

  const status = document.createElement('p');
  status.setAttribute('aria-live', 'polite');
  status.textContent = 'Select two points.';

  panel.append(heading, start, reset, status);
  target.append(panel);

  let first: Point3 | undefined;

  const click = (event: MouseEvent) => {
    if (!viewer.getPoint) return;
    const point = viewer.getPoint(event.clientX, event.clientY);
    if (!point) return;
    if (!first) {
      first = point;
      status.textContent = 'Start point set. Select an end point.';
      reset.toggleAttribute('disabled', false);
      return;
    }
    const result = measurePoints(first, point);
    status.textContent = `${formatMeasurement(result.distance, result.unit)} · H ${formatMeasurement(
      result.horizontal,
      result.unit,
    )} · V ${formatMeasurement(result.vertical, result.unit)}`;
    start.toggleAttribute('disabled', true);
    selection?.clear();
  };

  start.addEventListener('click', () => {
    first = undefined;
    start.toggleAttribute('disabled', false);
    status.textContent = 'Select two points.';
    viewer.renderer?.addEventListener('click', click as EventListener);
  });
  reset.addEventListener('click', () => {
    first = undefined;
    start.toggleAttribute('disabled', false);
    reset.toggleAttribute('disabled', true);
    status.textContent = 'Select two points.';
  });

  return {
    dispose() {
      viewer.renderer?.removeEventListener('click', click as EventListener);
      panel.remove();
    },
  };
}
