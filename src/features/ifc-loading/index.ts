import { createElement, FolderOpen } from 'lucide';
import type { Availability, FeatureHandle, ModelSession } from '../../core/contracts';
import { createFilePickerButton } from '../../components/file-picker-button';
import './style.css';

export function mountIfcLoading(host: HTMLElement, session: ModelSession, availability: Availability): FeatureHandle {
  host.classList.add('ifc-loading');

  // Presented as an item inside the File ribbon menu, so it uses the subtle
  // appearance to read as an ordinary menu action rather than a prominent
  // brand-filled call to action.
  const picker = createFilePickerButton({
    label: 'Open IFC',
    accept: '.ifc',
    multiple: true,
    ariaLabel: 'Open IFC files',
    appearance: 'subtle',
    icon: createElement(FolderOpen),
  });
  const { element: button, input } = picker;
  button.id = 'open';
  button.className = 'ribbon-open-ifc';
  input.id = 'file-input';

  const refresh = () => {
    button.toggleAttribute('disabled', !availability.available);
  };
  picker.onFiles((files) => {
    if (availability.available) void session.enqueue(files);
  });

  const unsubscribe = availability.subscribe(refresh);
  host.replaceChildren(button, input);
  refresh();

  return {
    dispose() {
      picker.dispose();
      unsubscribe();
      host.replaceChildren();
      host.classList.remove('ifc-loading');
    },
  };
}