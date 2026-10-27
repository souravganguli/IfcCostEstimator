import type { FeatureHandle, ViewerControls } from '../../core/contracts';
import { readSettings, saveSettings } from '../../core/settings';
import './style.css';

export function mountSettings(host: HTMLElement, storage: Pick<Storage, 'getItem' | 'setItem'>, viewer: Pick<ViewerControls, 'setGridVisible'>, notice: (message: string) => void): FeatureHandle {
  const events = new AbortController();
  const settings = readSettings(storage);
  const label = document.createElement('label');
  label.className = 'viewer-settings-toggle';
  const input = document.createElement('input');
  input.id = 'grid';
  input.type = 'checkbox';
  input.checked = settings.showGrid;
  label.append(input, ' Grid');
  viewer.setGridVisible(settings.showGrid);
  input.addEventListener('change', () => {
    settings.showGrid = input.checked;
    viewer.setGridVisible(input.checked);
    notice(saveSettings(storage, settings) ? 'Settings saved' : 'Settings kept for this session');
  }, { signal: events.signal });
  host.replaceChildren(label);
  return { dispose() { events.abort(); host.replaceChildren(); } };
}