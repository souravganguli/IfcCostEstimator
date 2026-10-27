import type { FeatureHandle, HierarchyNode, ModelSession, SelectionCapability } from '../../core/contracts';

export function mountModelHierarchy(target: HTMLElement, session: ModelSession, selection: SelectionCapability): FeatureHandle {
  const panel = document.createElement('section');
  panel.className = 'feature-panel hierarchy-panel';
  panel.setAttribute('aria-label', 'Model hierarchy');
  const heading = document.createElement('h2');
  heading.textContent = 'Hierarchy';
  const showAll = document.createElement('button');
  showAll.type = 'button';
  showAll.textContent = 'Show all';
  panel.append(heading, showAll);
  target.append(panel);
  const renderNode = (node: HierarchyNode, modelId: number): HTMLElement => {
    const row = document.createElement('div');
    row.className = 'hierarchy-row';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = node.label;
    button.addEventListener('click', () => {
      if (node.nodeKind === 'element') selection.set({ modelId, expressId: node.expressId });
    });
    row.append(button);
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
  showAll.addEventListener('click', render);
  const unsubscribe = session.subscribe(render);
  render();
  return { dispose() { unsubscribe(); panel.remove(); } };
}
