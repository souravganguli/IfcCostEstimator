import { createElement, Eye } from 'lucide';

export function iconButton(label: string, icon: typeof Eye): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = 'icon-button';
  button.title = label;
  button.setAttribute('aria-label', label);
  button.append(createElement(icon));
  return button;
}