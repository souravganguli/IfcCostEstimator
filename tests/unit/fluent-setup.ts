// Registers the Fluent 2 Web Components for happy-dom based unit tests so that
// feature modules that build `<fluent-*>` elements exercise real component
// behavior instead of inert unknown tags.
//
// happy-dom does not implement the form-associated custom element APIs that
// Fluent's form controls rely on, so provide minimal shims before the
// components are defined. These only need to be present (not fully featured)
// for the components to construct and for behavior/contract tests to run.
if (typeof HTMLElement !== 'undefined' && !('attachInternals' in HTMLElement.prototype)) {
  (HTMLElement.prototype as unknown as { attachInternals(): unknown }).attachInternals = function attachInternals() {
    return {
      setFormValue() {},
      setValidity() {},
      checkValidity() { return true; },
      reportValidity() { return true; },
      get form() { return null; },
      get validity() { return {} as ValidityState; },
      get validationMessage() { return ''; },
      get willValidate() { return true; },
      get labels() { return [] as unknown as NodeList; },
      states: new Set<string>(),
    };
  };
}

// happy-dom resolves `HTMLInputElement.list` by building a selector from the
// element's `list` attribute. Fluent's text input assigns an auto-generated id
// containing `{}` characters, which are invalid in a CSS selector and make the
// getter throw during element connection. The real browser (Chrome e2e) is
// unaffected; neutralise the getter for the DOM shim so form controls connect.
if (typeof HTMLInputElement !== 'undefined') {
  try {
    Object.defineProperty(HTMLInputElement.prototype, 'list', { configurable: true, get: () => null });
  } catch {
    // If the property is non-configurable in this environment, leave it as is.
  }
}

import '../../src/app/fluent-bootstrap';
