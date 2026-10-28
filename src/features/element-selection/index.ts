import type { ElementIdentity, FeatureHandle, SelectionCapability, ViewerPicking } from '../../core/contracts';
import { fluentButton } from '../../core/fluent';

export function mountElementSelection(
  target: HTMLElement,
  selection: SelectionCapability,
  picking: ViewerPicking,
): FeatureHandle {
  const clear = fluentButton('Clear selection', { appearance: 'subtle' });
  clear.hidden = true;
  clear.addEventListener('click', () => selection.clear());
  target.append(clear);
  const onPointer = (event: PointerEvent) => {
    if (event.button !== 0) return;
    selection.set(picking.pick(event.clientX, event.clientY));
  };
  const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') selection.clear(); };
  target.addEventListener('pointerup', onPointer);
  target.addEventListener('keydown', onKey);
  const unsubscribe = selection.subscribe((identity: ElementIdentity | null) => {
    picking.highlight(identity);
    clear.hidden = identity === null;
  });
  return {
    dispose() {
      target.removeEventListener('pointerup', onPointer);
      target.removeEventListener('keydown', onKey);
      unsubscribe();
      picking.highlight(null);
      clear.remove();
    },
  };
}
