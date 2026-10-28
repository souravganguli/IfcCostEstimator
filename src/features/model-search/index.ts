import type { ElementSearchResult, FeatureHandle, ModelSession, SelectionCapability } from '../../core/contracts';
import { fluentButton, fluentTextInput } from '../../core/fluent';

const PAGE_SIZE = 100;

export function mountModelSearch(target: HTMLElement, session: ModelSession, selection: SelectionCapability): FeatureHandle {
  const panel = document.createElement('section');
  panel.className = 'feature-panel search-panel';
  panel.setAttribute('aria-label', 'Search models');
  const heading = document.createElement('h2');
  heading.textContent = 'Search';
  const input = fluentTextInput({ type: 'search', placeholder: 'Name, type, property or GlobalId', ariaLabel: 'Search loaded models' });
  const results = document.createElement('div');
  results.setAttribute('aria-live', 'polite');
  const more = fluentButton('Load more', { appearance: 'subtle' });
  more.hidden = true;
  panel.append(heading, input, results, more);
  target.append(panel);
  let generation = 0;
  let shown = PAGE_SIZE;
  let all: ElementSearchResult[] = [];

  const render = () => {
    results.replaceChildren();
    if (!input.value.trim()) return;
    if (!all.length) {
      const empty = document.createElement('p');
      empty.textContent = 'No matching elements.';
      results.append(empty);
    } else {
      const fragment = document.createDocumentFragment();
      all.slice(0, shown).forEach((result) => {
        const button = fluentButton(`${result.metadata.name ?? result.metadata.ifcClass} (#${result.identity.expressId})`, { appearance: 'subtle' });
        button.className = 'search-result';
        button.addEventListener('click', () => selection.set(result.identity));
        fragment.append(button);
      });
      results.append(fragment);
    }
    more.hidden = all.length <= shown;
  };
  const refresh = () => {
    const query = input.value.trim();
    const currentGeneration = ++generation;
    shown = PAGE_SIZE;
    all = [];
    if (!query) { render(); return; }
    queueMicrotask(() => {
      if (currentGeneration !== generation) return;
      const found: ElementSearchResult[] = [];
      session.getModels().filter((model) => model.state === 'loaded').forEach((model) => {
        const matches = session.getAsset(model.id)?.elements?.search(query, PAGE_SIZE);
        if (matches) found.push(...matches);
      });
      if (currentGeneration !== generation) return;
      all = found;
      render();
    });
  };
  input.addEventListener('input', refresh);
  more.addEventListener('click', () => { shown += PAGE_SIZE; render(); });
  const unsubscribe = session.subscribe(refresh);
  refresh();
  return {
    dispose() {
      generation++;
      unsubscribe();
      panel.remove();
    },
  };
}
