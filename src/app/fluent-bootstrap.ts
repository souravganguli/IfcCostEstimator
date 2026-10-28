// Registers the Fluent 2 Web Components used across the application and applies
// the Fluent web light theme. Importing a component's `define` entry point
// self-registers its custom element, so this module is the single place that
// controls which `<fluent-*>` elements are available in the app.
import { setTheme } from '@fluentui/web-components';
import { webLightTheme } from '@fluentui/tokens';

import '@fluentui/web-components/accordion/define.js';
import '@fluentui/web-components/accordion-item/define.js';
import '@fluentui/web-components/button/define.js';
import '@fluentui/web-components/toggle-button/define.js';
import '@fluentui/web-components/menu-button/define.js';
import '@fluentui/web-components/text-input/define.js';
import '@fluentui/web-components/textarea/define.js';
import '@fluentui/web-components/checkbox/define.js';
import '@fluentui/web-components/switch/define.js';
import '@fluentui/web-components/slider/define.js';
import '@fluentui/web-components/field/define.js';
import '@fluentui/web-components/label/define.js';
import '@fluentui/web-components/text/define.js';
import '@fluentui/web-components/divider/define.js';
import '@fluentui/web-components/dropdown/define.js';
import '@fluentui/web-components/option/define.js';
import '@fluentui/web-components/menu/define.js';
import '@fluentui/web-components/menu-list/define.js';
import '@fluentui/web-components/menu-item/define.js';
import '@fluentui/web-components/tablist/define.js';
import '@fluentui/web-components/tab/define.js';
import '@fluentui/web-components/message-bar/define.js';
import '@fluentui/web-components/spinner/define.js';
import '@fluentui/web-components/badge/define.js';
import '@fluentui/web-components/tree/define.js';
import '@fluentui/web-components/tree-item/define.js';

let applied = false;

/**
 * Applies the Fluent web light theme to the document once. Safe to call
 * multiple times; only the first call sets the theme tokens.
 */
export function applyFluentTheme(): void {
  if (applied) return;
  applied = true;
  setTheme(webLightTheme);
}

applyFluentTheme();
