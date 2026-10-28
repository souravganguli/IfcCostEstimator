// Custom component (user-approved): a file picker presented as a Fluent button.
//
// Fluent 2 Web Components provide no file-input control, so this composite pairs
// a visible `<fluent-button>` with a hidden native `<input type="file">` and
// exposes a token-aligned, reusable API. It lives under `src/components/` per the
// Fluent 2 design policy; features use this instead of a raw file input.
import { fluentButton } from '../core/fluent';

export interface FilePickerButton {
  /** The Fluent button element to place in the UI. */
  readonly element: HTMLElement;
  /** The backing hidden file input, appended alongside the button. */
  readonly input: HTMLInputElement;
  /** Registers a handler invoked with the chosen files; resets the input after. */
  onFiles(handler: (files: File[]) => void): void;
  /** Removes the component's own listeners. Call from the owning feature's dispose. */
  dispose(): void;
}

export function createFilePickerButton(options: {
  label: string;
  accept?: string;
  multiple?: boolean;
  ariaLabel?: string;
  appearance?: 'primary' | 'outline' | 'subtle' | 'transparent';
  icon?: Node;
}): FilePickerButton {
  const button = fluentButton(options.label, { appearance: options.appearance ?? 'primary' });
  if (options.icon) button.prepend(options.icon);

  const input = document.createElement('input');
  input.type = 'file';
  input.hidden = true;
  if (options.accept) input.accept = options.accept;
  if (options.multiple) input.multiple = true;
  input.setAttribute('aria-label', options.ariaLabel ?? options.label);

  const events = new AbortController();
  button.addEventListener('click', () => input.click(), { signal: events.signal });

  return {
    element: button,
    input,
    onFiles(handler) {
      input.addEventListener(
        'change',
        () => {
          const files = Array.from(input.files ?? []);
          input.value = '';
          handler(files);
        },
        { signal: events.signal },
      );
    },
    dispose() {
      events.abort();
    },
  };
}
