// Small typed factory helpers for building Fluent 2 Web Components imperatively.
// Feature modules build their DOM with `document.createElement`, so these keep
// the `<fluent-*>` usage consistent, readable, and resistant to attribute typos.
// The elements are plain `HTMLElement`s (custom elements), so callers interact
// with them through standard attributes/properties and `value`/`checked`.

type ButtonAppearance = 'primary' | 'outline' | 'subtle' | 'transparent';

/** Creates a `<fluent-button>` with the given label and options. */
export function fluentButton(
  label: string,
  options: {
    appearance?: ButtonAppearance;
    ariaLabel?: string;
    iconOnly?: boolean;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
  } = {},
): HTMLElement {
  const button = document.createElement('fluent-button');
  button.setAttribute('type', options.type ?? 'button');
  if (options.appearance) button.setAttribute('appearance', options.appearance);
  if (options.iconOnly) button.setAttribute('icon-only', '');
  if (options.disabled) button.setAttribute('disabled', '');
  if (options.ariaLabel) button.setAttribute('aria-label', options.ariaLabel);
  if (label) button.textContent = label;
  return button;
}

/** Creates a `<fluent-text-input>`. The returned element exposes `.value`. */
export function fluentTextInput(
  options: { placeholder?: string; ariaLabel?: string; type?: string; value?: string } = {},
): HTMLInputElement {
  const input = document.createElement('fluent-text-input') as unknown as HTMLInputElement;
  if (options.type) input.setAttribute('type', options.type);
  if (options.placeholder) input.setAttribute('placeholder', options.placeholder);
  if (options.ariaLabel) input.setAttribute('aria-label', options.ariaLabel);
  // Always initialize `value` so reads are a string (never `undefined`) before
  // the custom element upgrades, keeping `.value.trim()`/`.value.split()` safe.
  input.value = options.value ?? '';
  return input;
}

/** Creates a `<fluent-checkbox>`. The returned element exposes `.checked`. */
export function fluentCheckbox(
  options: { ariaLabel?: string; checked?: boolean; label?: string } = {},
): HTMLInputElement {
  const checkbox = document.createElement('fluent-checkbox') as unknown as HTMLInputElement;
  if (options.ariaLabel) checkbox.setAttribute('aria-label', options.ariaLabel);
  if (options.checked) checkbox.setAttribute('checked', '');
  if (options.label) checkbox.textContent = options.label;
  return checkbox;
}

/** Creates a `<fluent-switch>`. The returned element exposes `.checked`. */
export function fluentSwitch(
  options: { ariaLabel?: string; checked?: boolean; label?: string } = {},
): HTMLInputElement {
  const toggle = document.createElement('fluent-switch') as unknown as HTMLInputElement;
  if (options.ariaLabel) toggle.setAttribute('aria-label', options.ariaLabel);
  if (options.checked) toggle.setAttribute('checked', '');
  if (options.label) toggle.textContent = options.label;
  return toggle;
}

/** Creates a `<fluent-slider>`. The returned element exposes `.value`. */
export function fluentSlider(
  options: { ariaLabel?: string; min: number; max: number; step: number; value: number },
): HTMLInputElement {
  const slider = document.createElement('fluent-slider') as unknown as HTMLInputElement;
  slider.setAttribute('min', String(options.min));
  slider.setAttribute('max', String(options.max));
  slider.setAttribute('step', String(options.step));
  slider.setAttribute('value', String(options.value));
  if (options.ariaLabel) slider.setAttribute('aria-label', options.ariaLabel);
  return slider;
}

/**
 * Creates a `<fluent-dropdown>` populated with `<fluent-dropdown-option>`s.
 * The returned element exposes `.value`.
 */
export function fluentDropdown(
  optionList: ReadonlyArray<{ value: string; text: string }>,
  options: { ariaLabel?: string; value?: string } = {},
): HTMLSelectElement {
  const dropdown = document.createElement('fluent-dropdown') as unknown as HTMLSelectElement;
  if (options.ariaLabel) dropdown.setAttribute('aria-label', options.ariaLabel);
  optionList.forEach((entry) => {
    const option = document.createElement('fluent-dropdown-option');
    option.setAttribute('value', entry.value);
    option.textContent = entry.text;
    if (options.value === entry.value) option.setAttribute('selected', '');
    dropdown.append(option);
  });
  if (options.value !== undefined) dropdown.setAttribute('value', options.value);
  return dropdown;
}

/** Creates a `<fluent-text>` block for body/caption copy. */
export function fluentText(
  text: string,
  options: { size?: number; weight?: 'regular' | 'medium' | 'semibold' | 'bold'; block?: boolean } = {},
): HTMLElement {
  const element = document.createElement('fluent-text');
  if (options.size) element.setAttribute('size', String(options.size));
  if (options.weight) element.setAttribute('weight', options.weight);
  if (options.block) element.setAttribute('block', '');
  element.textContent = text;
  return element;
}
