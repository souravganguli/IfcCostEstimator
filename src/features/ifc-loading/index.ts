import { createElement, FolderOpen } from 'lucide';
import type { Availability, FeatureHandle, ModelSession } from '../../core/contracts';
import './style.css';

export function mountIfcLoading(host: HTMLElement, session: ModelSession, availability: Availability): FeatureHandle {
  const events = new AbortController();
  host.classList.add('ifc-loading');
  const button = document.createElement('button');
  button.id = 'open';
  button.className = 'primary';
  button.append(createElement(FolderOpen), 'Open IFC');
  const input = document.createElement('input');
  input.id = 'file-input';
  input.type = 'file';
  input.accept = '.ifc';
  input.multiple = true;
  input.hidden = true;
  input.setAttribute('aria-label', 'Open IFC files');
  const refresh = () => { button.disabled = !availability.available; };
  button.addEventListener('click', () => input.click(), { signal: events.signal });
  input.addEventListener('change', () => {
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (availability.available) void session.enqueue(files);
  }, { signal: events.signal });
  const unsubscribe = availability.subscribe(refresh);
  host.replaceChildren(button, input);
  refresh();
  return { dispose() { events.abort(); unsubscribe(); host.replaceChildren(); host.classList.remove('ifc-loading'); } };
}