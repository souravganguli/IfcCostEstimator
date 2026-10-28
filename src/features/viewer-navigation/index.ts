import { Maximize } from 'lucide';
import type { Availability, FeatureHandle, ModelSession, ViewerControls } from '../../core/contracts';
import { iconButton } from '../../core/ui';

export function mountNavigation(host: HTMLElement, session: ModelSession, availability: Availability, viewer: Pick<ViewerControls, 'fit'>): FeatureHandle {
  const button = iconButton('Fit visible models', Maximize);
  button.id = 'fit';
  const events = new AbortController();
  const refresh = () => {
    const hasVisibleModel = session.getModels().some((model) => model.state === 'loaded' && model.visible);
    button.toggleAttribute('disabled', !availability.available || !hasVisibleModel);
  };
  button.addEventListener('click', () => viewer.fit(), { signal: events.signal });
  const offSession = session.subscribe(refresh);
  const offAvailability = availability.subscribe(refresh);
  host.replaceChildren(button);
  refresh();
  return { dispose() { events.abort(); offSession(); offAvailability(); host.replaceChildren(); } };
}