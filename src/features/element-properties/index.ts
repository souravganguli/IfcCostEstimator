import type { ElementProperties, FeatureHandle, ModelSession, SelectionCapability } from '../../core/contracts';
import type { FieldValue } from '../../core/predicate';

function formatValue(value: FieldValue): string {
  switch (value.kind) {
    case 'unset': return 'Unset';
    case 'list': return value.value.map(formatValue).join(', ');
    case 'number': return `${value.value}${value.unit ? ` ${value.unit}` : ''}`;
    case 'boolean': return value.value ? 'True' : 'False';
    case 'enum':
    case 'text': return value.value;
  }
}

function propertyRow(name: string, value: string): HTMLElement {
  const row = document.createElement('div');
  row.className = 'property-row';
  const label = document.createElement('div');
  label.className = 'property-name';
  label.textContent = name;
  label.title = name;
  const separator = document.createElement('span');
  separator.className = 'property-separator';
  const content = document.createElement('div');
  content.className = 'property-value';
  content.textContent = value;
  content.title = value;
  row.append(label, separator, content);
  return row;
}

function category(name: string, rows: readonly HTMLElement[]): HTMLElement {
  const item = document.createElement('fluent-accordion-item');
  item.className = 'property-category';
  item.setAttribute('expanded', '');
  const summary = document.createElement('span');
  summary.slot = 'heading';
  summary.className = 'property-category-heading';
  summary.textContent = name;
  const content = document.createElement('div');
  content.className = 'property-category-content';
  content.append(...rows);
  item.append(summary, content);
  return item;
}

function renderProperties(panel: HTMLElement, properties: ElementProperties, modelName: string): void {
  const heading = document.createElement('div');
  heading.className = 'properties-element-summary';
  const identity = document.createElement('strong');
  identity.textContent = properties.metadata.name || properties.metadata.ifcClass;
  const model = document.createElement('span');
  model.textContent = `${modelName} · ${properties.metadata.ifcClass} #${properties.identity.expressId}`;
  heading.append(identity, model);
  panel.append(heading);

  const identityRows = [
    propertyRow('Model', modelName),
    propertyRow('Element ID', String(properties.identity.expressId)),
    propertyRow('IFC Type', properties.metadata.ifcClass),
    ...(properties.metadata.name ? [propertyRow('Name', properties.metadata.name)] : []),
    ...(properties.metadata.globalId ? [propertyRow('GlobalId', properties.metadata.globalId)] : []),
    ...(properties.metadata.typeName ? [propertyRow('Type', properties.metadata.typeName)] : []),
    ...(properties.metadata.storeyName ? [propertyRow('Storey', properties.metadata.storeyName)] : []),
  ];
  panel.append(category('Identity Data', identityRows));

  if (!properties.groups.length) {
    const empty = document.createElement('p');
    empty.className = 'properties-empty';
    empty.textContent = 'No property or quantity sets are available for this element.';
    panel.append(empty);
    return;
  }
  properties.groups.forEach((group) => {
    const source = group.source === 'type' ? 'Type' : 'Element';
    const kind = group.kind === 'qto' ? 'IFC Quantities' : 'Properties';
    const rows = group.entries.length
      ? group.entries.map((entry) => propertyRow(entry.name, formatValue(entry.value)))
      : [propertyRow('Contents', 'No values')];
    panel.append(category(`${group.name} · ${source} ${kind}`, rows));
  });
}

export function mountElementProperties(target: HTMLElement, selection: SelectionCapability, session: ModelSession): FeatureHandle {
  const panel = document.createElement('section');
  panel.className = 'properties-content';
  panel.setAttribute('aria-label', 'Selected element properties');
  target.append(panel);
  const render = () => {
    panel.replaceChildren();
    const identity = selection.current();
    const properties = identity ? session.getAsset(identity.modelId)?.properties?.getProperties(identity) : undefined;
    if (!properties) {
      const empty = document.createElement('p');
      empty.className = 'properties-empty';
      empty.textContent = identity ? 'No properties available for the selected element.' : 'Select an element to inspect its properties.';
      panel.append(empty);
      return;
    }
    const modelName = session.getModels().find((model) => model.id === identity?.modelId)?.name ?? `Model #${identity?.modelId}`;
    renderProperties(panel, properties, modelName);
  };
  const unsubscribeSelection = selection.subscribe(render);
  const unsubscribeSession = session.subscribe(render);
  render();
  return {
    dispose() {
      unsubscribeSelection();
      unsubscribeSession();
      panel.remove();
    },
  };
}
