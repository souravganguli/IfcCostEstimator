import type { FeatureHandle, ModelSession, SelectionCapability } from '../../core/contracts';
import { toMetric, type QuantityKind } from '../../core/units';
import { fluentButton, fluentCheckbox, fluentDropdown } from '../../core/fluent';

export interface TakeoffRow {
  readonly key: string;
  readonly kind: QuantityKind;
  readonly quantity: number;
  readonly count: number;
  readonly source: 'source' | 'geometry-derived (approximate)';
  readonly identities: readonly { modelId: number; expressId: number }[];
}

type Vec3 = { x: number; y: number; z: number };

function signedVolume(a: Vec3, b: Vec3, c: Vec3): number {
  return (a.x * (b.y * c.z - b.z * c.y) - a.y * (b.x * c.z - b.z * c.x) + a.z * (b.x * c.y - b.y * c.x)) / 6;
}

interface TakeoffOptions {
  scope?: 'all' | 'visible' | number;
  groupBy?: 'class' | 'type' | 'storey';
  geometryFallback?: boolean;
}

export function collectTakeoff(session: ModelSession, options: TakeoffOptions = {}): readonly TakeoffRow[] {
  type Accumulator = {
    kind: QuantityKind;
    quantity: number;
    count: number;
    source: 'source' | 'geometry-derived (approximate)';
    identities: { modelId: number; expressId: number }[];
  };
  const rows = new Map<string, Accumulator>();

  const bucketFor = (metadata: { typeName?: string; storeyName?: string; ifcClass: string }) => {
    if (options.groupBy === 'type') return metadata.typeName ?? 'Unassigned type';
    if (options.groupBy === 'storey') return metadata.storeyName ?? 'Unassigned storey';
    return metadata.ifcClass;
  };

  const inScope = (model: { state: string; id: number; visible: boolean }) =>
    model.state === 'loaded' &&
    (options.scope === undefined ||
      options.scope === 'all' ||
      options.scope === model.id ||
      (options.scope === 'visible' && model.visible));

  session.getModels().filter(inScope).forEach((model) => {
    const asset = session.getAsset(model.id);
    asset?.elements?.getAll().forEach((identity) => {
      const properties = asset.properties?.getProperties(identity);
      properties?.groups
        .filter((group) => group.kind === 'qto')
        .forEach((group) =>
          group.entries.forEach((entry) => {
            if (entry.value.kind !== 'number' || !entry.value.unit) return;
            const metric = toMetric(entry.value.value, entry.value.unit);
            if (!metric.ok) return;
            const key = `${bucketFor(properties.metadata)} · ${entry.name}`;
            const row =
              rows.get(key) ?? { kind: metric.kind, quantity: 0, count: 0, source: 'source' as const, identities: [] };
            row.quantity += metric.value;
            row.count += 1;
            row.identities.push(identity);
            rows.set(key, row);
          }),
        );
    });

    if (options.geometryFallback) {
      const triangles = asset?.triangles ?? [];
      const byElement = new Map<number, number>();
      triangles.forEach((triangle) =>
        byElement.set(
          triangle.elementId,
          (byElement.get(triangle.elementId) ?? 0) + signedVolume(triangle.a, triangle.b, triangle.c),
        ),
      );
      byElement.forEach((value, expressId) => {
        const identity = { modelId: model.id, expressId };
        const properties = asset?.properties?.getProperties(identity);
        const hasSourceQuantity = properties?.groups.some(
          (group) => group.kind === 'qto' && group.entries.some((entry) => entry.value.kind === 'number'),
        );
        if (!properties || hasSourceQuantity) return;
        const key = `${bucketFor(properties.metadata)} · Geometry volume`;
        const row =
          rows.get(key) ??
          {
            kind: 'volume' as QuantityKind,
            quantity: 0,
            count: 0,
            source: 'geometry-derived (approximate)' as const,
            identities: [],
          };
        row.quantity += Math.abs(value);
        row.count += 1;
        row.identities.push(identity);
        rows.set(key, row);
      });
    }
  });

  return [...rows.entries()].map(([key, row]) => ({ key, ...row }));
}

export function mountQuantityTakeoff(
  target: HTMLElement,
  session: ModelSession,
  selection: SelectionCapability,
): FeatureHandle {
  const panel = document.createElement('section');
  panel.className = 'feature-panel takeoff-panel';

  const heading = document.createElement('h2');
  heading.textContent = 'Quantity takeoff';

  const table = document.createElement('div');

  const scope = fluentDropdown(
    [{ value: 'all', text: 'All models' }, { value: 'visible', text: 'Visible models' }],
    { ariaLabel: 'Takeoff scope', value: 'all' },
  );
  const grouping = fluentDropdown(
    [{ value: 'class', text: 'IFC class' }, { value: 'type', text: 'Type' }, { value: 'storey', text: 'Storey' }],
    { ariaLabel: 'Takeoff grouping', value: 'class' },
  );
  const fallback = fluentCheckbox({
    ariaLabel: 'Enable geometry-derived fallback',
    label: 'Include geometry-derived fallback (approximate)',
  });
  const fallbackLabel = document.createElement('div');
  fallbackLabel.className = 'takeoff-fallback';
  fallbackLabel.append(fallback);

  panel.append(heading, scope, grouping, fallbackLabel, table);
  target.append(panel);

  const render = () => {
    table.replaceChildren();
    const rows = collectTakeoff(session, {
      scope: scope.value as 'all' | 'visible',
      groupBy: grouping.value as 'class' | 'type' | 'storey',
      geometryFallback: fallback.checked,
    });
    rows.forEach((row) => {
      const label = `${row.key}: ${row.quantity.toFixed(3)} ${row.kind} (${row.count}) · ${row.source}`;
      const button = fluentButton(label, { appearance: 'subtle' });
      button.className = 'search-result';
      button.addEventListener('click', () => selection.set(row.identities[0] ?? null));
      table.append(button);
    });
    if (!table.children.length) {
      const empty = document.createElement('p');
      empty.textContent = fallback.checked
        ? 'No source or geometry-derived quantities available.'
        : 'No IFC source quantities available. Missing quantities are excluded, not treated as zero.';
      table.append(empty);
    }
  };

  scope.addEventListener('change', render);
  grouping.addEventListener('change', render);
  fallback.addEventListener('change', render);

  const off = session.subscribe(render);
  render();

  return {
    dispose() {
      off();
      panel.remove();
    },
  };
}
