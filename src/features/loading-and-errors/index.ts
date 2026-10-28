import { createElement, Box } from 'lucide';
import type { Availability, FeatureHandle, ModelSession } from '../../core/contracts';
import './style.css';

export interface FeedbackHandle extends FeatureHandle { notice(message: string): void }

export function mountFeedback(overlay: HTMLElement, footer: HTMLElement, session: ModelSession, availability: Availability): FeedbackHandle {
  const empty = document.createElement('div');
  empty.className = 'feedback-empty';
  const heading = document.createElement('h2');
  empty.append(createElement(Box), heading);
  const error = document.createElement('fluent-message-bar');
  error.setAttribute('intent', 'error');
  error.className = 'feedback-error';
  error.setAttribute('role', 'alert');
  error.hidden = true;
  const status = document.createElement('span');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const summary = document.createElement('span');
  summary.id = 'session-summary';
  overlay.replaceChildren(empty, error);
  footer.replaceChildren(status, summary);
  const refresh = () => {
    const models = session.getModels();
    const loaded = models.filter((model) => model.state === 'loaded');
    const visible = loaded.filter((model) => model.visible);
    const busy = models.find((model) => model.state === 'loading');
    error.hidden = availability.available;
    error.textContent = availability.error ?? '';
    empty.hidden = visible.length > 0 || !availability.available;
    heading.textContent = loaded.length ? 'All models hidden' : 'No models loaded';
    summary.textContent = `${loaded.length} models · ${visible.length} visible`;
    status.textContent = !availability.available ? 'Viewer unavailable' : busy ? `Loading model #${busy.id}…` : 'Ready';
  };
  const offSession = session.subscribe(refresh);
  const offAvailability = availability.subscribe(refresh);
  refresh();
  return {
    notice(message) { if (availability.available) status.textContent = message; },
    dispose() { offSession(); offAvailability(); overlay.replaceChildren(); footer.replaceChildren(); },
  };
}