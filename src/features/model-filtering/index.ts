import type { ElementFilterCriterion, FeatureHandle, ModelSession, SelectionCapability } from '../../core/contracts';
import { fluentButton, fluentDropdown, fluentTextInput } from '../../core/fluent';

type CriterionRow = { field: HTMLSelectElement; values: HTMLInputElement; container: HTMLElement };
const fields = ['IfcClass', 'Name', 'GlobalId', 'TypeName', 'Storey'];

export function mountModelFiltering(target: HTMLElement, session: ModelSession, selection: SelectionCapability): FeatureHandle {
  const panel = document.createElement('section');
  panel.className = 'feature-panel filter-panel';
  panel.setAttribute('aria-label', 'Filter models');
  const heading = document.createElement('h2');
  heading.textContent = 'Filter';
  const rows = document.createElement('div');
  const add = fluentButton('Add criterion', { appearance: 'subtle' });
  const reset = fluentButton('Reset', { appearance: 'subtle' });
  const status = document.createElement('p');
  const results = document.createElement('div');
  panel.append(heading, rows, add, reset, status, results);
  target.append(panel);
  const criteria: CriterionRow[] = [];

  const evaluate = () => {
    const active: ElementFilterCriterion[] = criteria.map((row) => ({
      field: row.field.value,
      conditions: row.values.value.split(',').map((value) => value.trim()).filter(Boolean)
        .map((value) => ({ field: row.field.value, op: 'contains' as const, value })),
    })).filter((criterion) => criterion.conditions.length > 0);
    if (!active.length) {
      status.textContent = 'No criteria applied.';
      return;
    }
    let count = 0;
    results.replaceChildren();
    session.getModels().filter((model) => model.state === 'loaded').forEach((model) => {
      const matches = session.getAsset(model.id)?.elements?.filter(active) ?? [];
      count += matches.length;
      matches.slice(0, 20).forEach((identity) => {
        const button = fluentButton(`${model.name} #${identity.expressId}`, { appearance: 'subtle' });
        button.className = 'search-result';
        button.addEventListener('click', () => selection.set(identity));
        results.append(button);
      });
    });
    status.textContent = `${count} matching element${count === 1 ? '' : 's'}.`;
  };
  const addCriterion = () => {
    const container = document.createElement('div');
    container.className = 'filter-criterion';
    const field = fluentDropdown(fields.map((name) => ({ value: name, text: name })), { ariaLabel: 'Filter field', value: fields[0] });
    const values = fluentTextInput({ type: 'text', placeholder: 'value or comma-separated values', ariaLabel: 'Filter values' });
    const remove = fluentButton('Remove', { appearance: 'subtle' });
    const row = { field, values, container };
    remove.addEventListener('click', () => {
      const index = criteria.indexOf(row);
      if (index >= 0) criteria.splice(index, 1);
      container.remove();
      evaluate();
    });
    field.addEventListener('change', evaluate);
    values.addEventListener('input', evaluate);
    container.append(field, values, remove);
    rows.append(container);
    criteria.push(row);
  };
  add.addEventListener('click', addCriterion);
  reset.addEventListener('click', () => {
    criteria.splice(0).forEach((row) => row.container.remove());
    evaluate();
  });
  const unsubscribe = session.subscribe(evaluate);
  addCriterion();
  evaluate();
  return {
    dispose() {
      unsubscribe();
      panel.remove();
    },
  };
}
