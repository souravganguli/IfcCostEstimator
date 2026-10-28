import type { FeatureHandle, ModelSession } from '../../core/contracts';
import { matchColorRule, type ColorRule } from '../../core/color-rules';
import type { FieldValue } from '../../core/predicate';
import { fluentButton, fluentTextInput } from '../../core/fluent';
import { createColorSwatchInput } from '../../components/color-swatch-input';

export interface ColorViewer {
  setElementColor(modelId: number, expressId: number, color: string | null): void;
}

export function mountPropertyColoring(target: HTMLElement, session: ModelSession, viewer: ColorViewer): FeatureHandle {
  const panel = document.createElement('section');
  panel.className = 'feature-panel coloring-panel';

  const heading = document.createElement('h2');
  heading.textContent = 'Property coloring';

  const field = fluentTextInput({ placeholder: 'Field (e.g. IfcClass)', ariaLabel: 'Color rule field' });
  const value = fluentTextInput({ placeholder: 'Value', ariaLabel: 'Color rule value' });

  const color = createColorSwatchInput({ value: '#ffb000', ariaLabel: 'Color rule color' });

  const add = fluentButton('Add rule', { appearance: 'primary' });
  const clear = fluentButton('Clear colors', { appearance: 'subtle' });

  const list = document.createElement('div');
  panel.append(heading, field, value, color.element, add, clear, list);
  target.append(panel);

  let rules: ColorRule[] = [];

  const apply = () => {
    session.getModels().filter((model) => model.state === 'loaded').forEach((model) => {
      const asset = session.getAsset(model.id);
      asset?.elements?.getAll().forEach((identity) => {
        const properties = asset.properties?.getProperties(identity);
        const entries = new Map<string, FieldValue>([
          ['IfcClass', { kind: 'text', value: properties?.metadata.ifcClass ?? '' }],
          ['Name', { kind: 'text', value: properties?.metadata.name ?? '' }],
          ['GlobalId', { kind: 'text', value: properties?.metadata.globalId ?? '' }],
          ['TypeName', { kind: 'text', value: properties?.metadata.typeName ?? '' }],
          ['Storey', { kind: 'text', value: properties?.metadata.storeyName ?? '' }],
        ]);
        properties?.groups.forEach((group) =>
          group.entries.forEach((entry) => entries.set(`${group.name}.${entry.name}`, entry.value)),
        );
        viewer.setElementColor(model.id, identity.expressId, matchColorRule(rules, (key) => entries.get(key)) ?? null);
      });
    });
  };

  const render = () => {
    list.replaceChildren();
    rules.forEach((rule, index) => {
      const row = document.createElement('div');
      row.className = 'coloring-rule';

      const condition = rule.conditions[0];
      const shown = condition && 'value' in condition ? condition.value : '';
      const text = document.createElement('span');
      text.textContent = `${condition?.field} = ${shown} `;
      text.style.color = rule.color;

      const up = fluentButton('↑', {
        appearance: 'subtle',
        iconOnly: true,
        ariaLabel: `Move rule ${index + 1} up`,
        disabled: index === 0,
      });
      const down = fluentButton('↓', {
        appearance: 'subtle',
        iconOnly: true,
        ariaLabel: `Move rule ${index + 1} down`,
        disabled: index === rules.length - 1,
      });
      const del = fluentButton('Delete', { appearance: 'subtle' });

      del.addEventListener('click', () => {
        rules = rules.filter((item) => item.id !== rule.id);
        render();
      });
      up.addEventListener('click', () => {
        [rules[index - 1], rules[index]] = [rules[index], rules[index - 1]];
        render();
      });
      down.addEventListener('click', () => {
        [rules[index], rules[index + 1]] = [rules[index + 1], rules[index]];
        render();
      });

      row.append(text, up, down, del);
      list.append(row);
    });
    apply();
  };

  add.addEventListener('click', () => {
    if (!field.value.trim()) return;
    rules.push({
      id: String(Date.now()),
      color: color.value,
      conditions: [{ field: field.value.trim(), op: 'equals', value: value.value }],
    });
    render();
  });
  clear.addEventListener('click', () => {
    rules = [];
    render();
  });

  const off = session.subscribe(render);
  render();

  return {
    dispose() {
      off();
      panel.remove();
    },
  };
}
