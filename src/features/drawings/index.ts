import type { FeatureHandle, ModelSession } from '../../core/contracts';
import { projectPlan, sectionSegments, type Triangle } from '../../core/drawings';
import { fluentButton, fluentTextInput } from '../../core/fluent';

const DRAWING_STROKE = 'var(--fluent-brand-primary, #0f6cbd)';

const SVG_NS = 'http://www.w3.org/2000/svg';

type Point = { x: number; y: number };
type Segment = { start: Point; end: Point };

export function mountDrawings(target: HTMLElement, session: ModelSession): FeatureHandle {
  const panel = document.createElement('section');
  panel.className = 'feature-panel drawings-panel';

  const heading = document.createElement('h2');
  heading.textContent = 'Plan and section drawings';

  const plan = fluentButton('Plan view', { appearance: 'outline' });
  const section = fluentButton('Section view', { appearance: 'outline' });
  const elevation = fluentTextInput({ type: 'number', value: '0', ariaLabel: 'Section elevation' });

  const output = document.createElementNS(SVG_NS, 'svg');
  output.setAttribute('viewBox', '0 0 240 160');
  output.setAttribute('role', 'img');
  output.setAttribute('aria-label', 'Drawing preview');

  const status = document.createElement('p');
  panel.append(heading, plan, section, elevation, output, status);
  target.append(panel);

  const render = (kind: 'plan' | 'section') => {
    const triangles: Triangle[] = [];
    session.getModels().filter((model) => model.state === 'loaded').forEach((model) => {
      session.getAsset(model.id)?.triangles?.forEach((triangle) => triangles.push(triangle));
    });

    output.replaceChildren();
    const geometry = kind === 'plan' ? projectPlan(triangles) : sectionSegments(triangles, Number(elevation.value));
    status.textContent = `${kind === 'plan' ? 'Plan' : 'Section'} preview · ${geometry.length} line/triangle records · source geometry only`;

    if (!geometry.length) {
      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('x', '12');
      text.setAttribute('y', '80');
      text.textContent = 'Load a model to generate drawing geometry';
      output.append(text);
      return;
    }

    const points: Point[] =
      kind === 'plan'
        ? (geometry as readonly Triangle[]).flatMap((triangle) =>
            [triangle.a, triangle.b, triangle.c].map((point) => ({ x: point.x, y: point.y })),
          )
        : (geometry as readonly Segment[]).flatMap((segment) => [segment.start, segment.end]);

    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    const minY = Math.min(...points.map((point) => point.y));
    const maxY = Math.max(...points.map((point) => point.y));
    const scale = Math.min(216 / Math.max(1e-6, maxX - minX), 136 / Math.max(1e-6, maxY - minY));
    const projectX = (point: Point) => 12 + (point.x - minX) * scale;
    const projectY = (point: Point) => 148 - (point.y - minY) * scale;
    const project = (point: Point) => `${projectX(point)},${projectY(point)}`;

    if (kind === 'plan') {
      (geometry as readonly Triangle[]).forEach((triangle) => {
        const polygon = document.createElementNS(SVG_NS, 'polygon');
        polygon.setAttribute('points', [triangle.a, triangle.b, triangle.c].map(project).join(' '));
        polygon.setAttribute('fill', 'none');
        polygon.setAttribute('stroke', DRAWING_STROKE);
        output.append(polygon);
      });
    } else {
      (geometry as readonly Segment[]).forEach((segment) => {
        const line = document.createElementNS(SVG_NS, 'line');
        line.setAttribute('x1', String(projectX(segment.start)));
        line.setAttribute('y1', String(projectY(segment.start)));
        line.setAttribute('x2', String(projectX(segment.end)));
        line.setAttribute('y2', String(projectY(segment.end)));
        line.setAttribute('stroke', DRAWING_STROKE);
        output.append(line);
      });
    }
  };

  plan.addEventListener('click', () => render('plan'));
  section.addEventListener('click', () => render('section'));
  elevation.addEventListener('input', () => render('section'));

  const off = session.subscribe(() => render('plan'));
  render('plan');

  return {
    dispose() {
      off();
      panel.remove();
    },
  };
}
