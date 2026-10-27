import type { FeatureHandle, ModelSession, SelectionCapability } from '../../core/contracts';

export function mountElementProperties(target: HTMLElement, selection: SelectionCapability, session: ModelSession): FeatureHandle {
  const panel = document.createElement('section');
  panel.className = 'feature-panel properties-panel';
  panel.setAttribute('aria-label', 'Element properties');
  target.append(panel);
  const render = () => {
    const identity = selection.current();
    const asset = identity ? session.getAsset(identity.modelId) : undefined;
    const properties = identity ? asset?.properties?.getProperties(identity) : undefined;
    panel.replaceChildren();
    const heading = document.createElement('h2');
    heading.textContent = 'Properties';
    panel.append(heading);
    const body = document.createElement('p');
    if (!properties) body.textContent = identity ? 'No properties available.' : 'Select an element to inspect its properties.';
    else {
      body.textContent = `${properties.metadata.ifcClass} #${properties.identity.expressId}${properties.metadata.name ? ` - ${properties.metadata.name}` : ''}`;
      for (const group of properties.groups) {
        const groupHeading = document.createElement('h3');
        groupHeading.textContent = `${group.name} (${group.kind === 'qto' ? 'IFC quantities' : 'properties'})`;
        panel.append(groupHeading);
        const list = document.createElement('dl');
        for (const entry of group.entries) {
          const term = document.createElement('dt');
          term.textContent = entry.name;
          const value = document.createElement('dd');
          value.textContent = entry.value.kind === 'unset' ? 'Unset' : entry.value.kind === 'number' ? `${entry.value.value}${entry.value.unit ? ` ${entry.value.unit}` : ''}` : String(entry.value.value);
          list.append(term, value);
        }
        panel.append(list);
      }
    }
    panel.append(body);
  };
  const unsubscribeSelection = selection.subscribe(render);
  const unsubscribeSession = session.subscribe(render);
  render();
  return { dispose() { unsubscribeSelection(); unsubscribeSession(); panel.remove(); } };
}
