// Custom component (user-approved): a vector drawing surface.
//
// Fluent 2 Web Components provide no vector/SVG surface, and SVG is the correct
// primitive for plan/section linework (drawing output, not an interactive
// control). This encapsulates the namespaced `<svg>` element and its children
// so features never build raw SVG. It lives under `src/components/` per the
// Fluent 2 design policy.

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface DrawingSurface {
  /** The root `<svg>` element to place in the UI. */
  readonly element: SVGSVGElement;
  /** Removes all drawn children. */
  clear(): void;
  /** Creates a namespaced SVG child element without appending it. */
  create<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K];
  /** Appends one or more elements to the surface. */
  append(...nodes: Node[]): void;
}

export function createDrawingSurface(options: { viewBox: string; ariaLabel: string }): DrawingSurface {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', options.viewBox);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', options.ariaLabel);

  return {
    element: svg,
    clear() {
      svg.replaceChildren();
    },
    create(tag) {
      return document.createElementNS(SVG_NS, tag);
    },
    append(...nodes) {
      svg.append(...nodes);
    },
  };
}
