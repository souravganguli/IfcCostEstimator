import type { ElementVisibility, FeatureHandle, HierarchyNode, ModelSession, SelectionCapability } from '../../core/contracts';
import { fluentButton } from '../../core/fluent';

export function mountModelHierarchy(target: HTMLElement, session: ModelSession, selection: SelectionCapability, visibility?: ElementVisibility): FeatureHandle {
  const panel = document.createElement('section');
  panel.className = 'feature-panel hierarchy-panel';
  panel.setAttribute('aria-label', 'Model hierarchy');
  const heading = document.createElement('h2');
  heading.textContent = 'Hierarchy';
  const showAll = fluentButton('Show all', { appearance: 'subtle' });
  panel.append(heading, showAll);
  target.append(panel);
  const descendants = (node: HierarchyNode): number[] => [
    ...(node.nodeKind === 'element' ? [node.expressId] : []),
    ...node.children.flatMap(descendants),
  ];
  const renderNode = (node: HierarchyNode, modelId: number): HTMLElement => {
    const row = document.createElement('div');
    row.className = 'hierarchy-row';
    const button = fluentButton(node.label, { appearance: 'subtle' });
    button.addEventListener('click', () => {
      if (node.nodeKind === 'element') selection.set({ modelId, expressId: node.expressId });
    });
    row.append(button);
    const action = fluentButton(node.nodeKind === 'element' ? 'Hide' : 'Isolate', { appearance: 'subtle' });
    action.addEventListener('click', (event) => {
      event.stopPropagation();
      const ids = descendants(node);
      if (node.nodeKind === 'element') visibility?.hide(modelId, ids);
      else visibility?.isolate(modelId, ids);
    });
    row.append(action);
    if (node.children.length) {
      const children = document.createElement('div');
      children.className = 'hierarchy-children';
      node.children.forEach((child) => children.append(renderNode(child, modelId)));
      row.append(children);
    }
    return row;
  };
  const render = () => {
    panel.querySelectorAll('.hierarchy-model').forEach((item) => item.remove());
    session.getModels().filter((model) => model.state === 'loaded').forEach((model) => {
      const hierarchy = session.getAsset(model.id)?.hierarchy?.getHierarchy(model.id);
      if (!hierarchy) return;
      const section = document.createElement('div');
      section.className = 'hierarchy-model';
      const modelHeading = document.createElement('h3');
      modelHeading.textContent = model.name;
      section.append(modelHeading, renderNode(hierarchy.root, model.id));
      panel.append(section);
    });
  };
  showAll.addEventListener('click', () => {
    visibility?.showAll();
    render();
  });
  const unsubscribe = session.subscribe(render);
  render();
  return {
    dispose() {
      unsubscribe();
      panel.remove();
    },
  };
}
