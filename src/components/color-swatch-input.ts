// Custom component (user-approved): a color picker swatch.
//
// Fluent 2 Web Components provide no color-input control, so this wraps a native
// `<input type="color">` and aligns it with the shared Fluent tokens through the
// `.color-swatch` class in `src/app/fluent2.css`. It lives under `src/components/`
// per the Fluent 2 design policy; features use this instead of a raw color input.

export interface ColorSwatchInput {
  /** The input element to place in the UI. */
  readonly element: HTMLInputElement;
  /** The current color value (e.g. '#ffb000'). */
  readonly value: string;
}

export function createColorSwatchInput(options: { value?: string; ariaLabel?: string } = {}): ColorSwatchInput {
  const input = document.createElement('input');
  input.type = 'color';
  input.className = 'color-swatch';
  input.value = options.value ?? '#ffb000';
  if (options.ariaLabel) input.setAttribute('aria-label', options.ariaLabel);
  return {
    element: input,
    get value() {
      return input.value;
    },
  };
}
