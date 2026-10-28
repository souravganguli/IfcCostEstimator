import { createElement, Eye } from 'lucide';

export function iconButton(label: string, icon: typeof Eye): HTMLElement {
  const button = document.createElement('fluent-button');
  button.setAttribute('appearance', 'subtle');
  button.setAttribute('icon-only', '');
  button.setAttribute('type', 'button');
  button.className = 'icon-button';
  button.title = label;
  button.setAttribute('aria-label', label);
  button.append(createElement(icon));
  return button;
}