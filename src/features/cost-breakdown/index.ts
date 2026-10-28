import type { FeatureHandle, ModelSession, SelectionCapability } from '../../core/contracts';
import { fluentButton, fluentDropdown, fluentTextInput } from '../../core/fluent';
import { mappingMatches, summarizeMappings, type Mapping } from '../../core/cost-breakdown';

export function mountCostBreakdown(
  target: HTMLElement,
  session: ModelSession,
  selection: SelectionCapability,
): FeatureHandle {
  const panel = document.createElement('section');
  panel.className = 'feature-panel cost-breakdown-panel';

  const heading = document.createElement('h2');
  heading.textContent = 'Cost breakdown and mapping';

  const cbs = fluentTextInput({ placeholder: 'CBS items (comma separated)', ariaLabel: 'CBS items' });
  const status = document.createElement('p');
  const rows = document.createElement('div');
  panel.append(heading, cbs, status, rows);
  target.append(panel);

  let mappings: Mapping[] = [];
  const loadedModels = () => session.getModels().filter((model) => model.state === 'loaded');
  const knownItems = () => cbs.value.split(',').map((item) => item.trim()).filter(Boolean);

  const render = () => {
    rows.replaceChildren();
    const items = knownItems();

    loadedModels().forEach((model) => {
      session.getAsset(model.id)?.elements?.getAll().forEach((identity) => {
        const current = mappings.find((item) => mappingMatches(item, identity.modelId, identity.expressId));

        const row = document.createElement('div');
        row.className = 'mapping-row';

        const label = fluentButton(`${model.name} #${identity.expressId}`, { appearance: 'subtle' });
        label.addEventListener('click', () => selection.set(identity));

        const select = fluentDropdown(
          [{ value: '', text: 'Unmapped' }, ...items.map((item) => ({ value: item, text: item }))],
          { ariaLabel: `CBS mapping ${identity.modelId}-${identity.expressId}`, value: current?.cbs ?? '' },
        );
        const override = fluentTextInput({
          type: 'number',
          placeholder: 'Qty override',
          ariaLabel: `Quantity override ${identity.modelId}-${identity.expressId}`,
          value: current?.override === undefined ? '' : String(current.override),
        });

        const update = () => {
          mappings = mappings.filter((item) => !mappingMatches(item, identity.modelId, identity.expressId));
          if (select.value || override.value) {
            mappings.push({
              modelId: identity.modelId,
              expressId: identity.expressId,
              cbs: select.value,
              override: override.value ? Number(override.value) : undefined,
            });
          }
          render();
        };
        select.addEventListener('change', update);
        override.addEventListener('change', update);

        row.append(label, select, override);
        rows.append(row);
      });
    });

    const elementCount = loadedModels().reduce(
      (count, model) => count + (session.getAsset(model.id)?.elements?.getAll().length ?? 0),
      0,
    );
    const summary = summarizeMappings(mappings, elementCount);
    status.textContent = `${summary.mapped} mapped · ${summary.unmapped} unmapped · quantity ${summary.quantity.toFixed(3)}`;
  };

  cbs.addEventListener('input', render);
  const off = session.subscribe(render);
  render();

  return {
    dispose() {
      off();
      panel.remove();
    },
  };
}
