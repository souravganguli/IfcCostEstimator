import { createElement, Eye, EyeOff, PanelLeftClose, PanelLeftOpen, Trash2 } from 'lucide';
import type { FeatureHandle, ModelSession } from '../../core/contracts';
import { iconButton } from '../../core/ui';
import './style.css';

export function mountModelControls(panel: HTMLElement, toggleHost: HTMLElement, session: ModelSession, setCollapsed: (collapsed: boolean) => void): FeatureHandle {
  const events = new AbortController();
  let rows = new AbortController();
  let collapsed = false;
  const toggle = iconButton('Collapse models panel', PanelLeftClose);
  toggle.id = 'toggle-sidebar';
  toggle.setAttribute('aria-expanded', 'true');
  toggle.setAttribute('aria-controls', panel.id);
  toggle.addEventListener('click', () => {
    collapsed = !collapsed;
    setCollapsed(collapsed);
    const label = collapsed ? 'Expand models panel' : 'Collapse models panel';
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.setAttribute('aria-label', label);
    toggle.title = label;
    toggle.replaceChildren(createElement(collapsed ? PanelLeftOpen : PanelLeftClose));
  }, { signal: events.signal });
  toggleHost.replaceChildren(toggle);
  const refresh = () => {
    rows.abort();
    rows = new AbortController();
    const heading = document.createElement('h2');
    heading.textContent = 'Models';
    const count = document.createElement('span');
    count.id = 'model-count';
    count.className = 'model-controls-count';
    count.textContent = String(session.getModels().filter((model) => model.state === 'loaded').length);
    heading.append(count);
    const list = document.createElement('div');
    list.id = 'model-list';
    for (const model of session.getModels()) {
      const row = document.createElement('article');
      row.className = 'model-controls-row';
      row.dataset.state = model.state;
      row.dataset.modelId = String(model.id);
      const title = document.createElement('div');
      title.className = 'model-controls-title';
      const name = document.createElement('strong');
      name.textContent = model.name;
      name.title = model.name;
      const detail = document.createElement('span');
      detail.textContent = `#${model.id} · ${model.state === 'loaded' ? `${model.schema} · ${model.visible ? 'Visible' : 'Hidden'}` : model.state}`;
      title.append(name, detail);
      row.append(title);
      if (model.state === 'loaded') {
        const visibility = iconButton(`${model.visible ? 'Hide' : 'Show'} model ${model.id}`, model.visible ? Eye : EyeOff);
        visibility.addEventListener('click', () => session.toggle(model.id), { signal: rows.signal });
        row.append(visibility);
      }
      if (model.state === 'loaded' || model.state === 'failed') {
        const remove = iconButton(`Remove model ${model.id}`, Trash2);
        remove.addEventListener('click', () => session.remove(model.id), { signal: rows.signal });
        row.append(remove);
      }
      if (model.error) {
        const error = document.createElement('p');
        error.className = 'model-controls-error';
        error.setAttribute('role', 'alert');
        error.textContent = model.error;
        row.append(error);
      }
      list.append(row);
    }
    panel.replaceChildren(heading, list);
  };
  const unsubscribe = session.subscribe(refresh);
  refresh();
  return { dispose() { events.abort(); rows.abort(); unsubscribe(); panel.replaceChildren(); toggleHost.replaceChildren(); setCollapsed(false); } };
}