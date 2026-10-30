import { createElement, PersonStanding } from 'lucide';
import type { FeatureHandle } from '../../core/contracts';
import { firstPersonStep, minimapMarker } from '../../core/first-person';

export interface FirstPersonViewer {
  setFirstPerson(enabled: boolean): void;
  readonly camera: { position: { x: number; y: number; z: number }; rotation: { y: number } };
  readonly renderer: { domElement: HTMLElement };
}

export function mountFirstPerson(
  toolbarHost: HTMLElement,
  overlayHost: HTMLElement,
  viewer: FirstPersonViewer,
): FeatureHandle {
  const toggle = document.createElement('fluent-button');
  toggle.setAttribute('appearance', 'subtle');
  toggle.setAttribute('type', 'button');
  toggle.className = 'floating-action';
  toggle.dataset.floating = 'walkthrough';
  toggle.setAttribute('aria-label', 'First person');
  toggle.setAttribute('aria-pressed', 'false');
  toggle.prepend(createElement(PersonStanding));
  const label = document.createTextNode('First person');
  toggle.append(label);

  const minimap = document.createElement('div');
  minimap.className = 'first-person-minimap';
  minimap.setAttribute('aria-label', 'First-person minimap');
  minimap.hidden = true;
  const marker = document.createElement('span');
  marker.className = 'minimap-marker';
  minimap.append(marker);

  let active = false;

  const draw = () => {
    const position = minimapMarker(viewer.camera.position.x, viewer.camera.position.z);
    marker.style.left = `${position.left}%`;
    marker.style.top = `${position.top}%`;
    marker.style.transform = `rotate(${viewer.camera.rotation.y}rad)`;
  };
  const timer = window.setInterval(draw, 250);

  const keys = new Set<string>();
  const onKey = (event: KeyboardEvent) => {
    if (!active) return;
    keys.add(event.key.toLowerCase());
  };
  const onUp = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase());
  const onPointer = (event: PointerEvent) => {
    if (!active || document.pointerLockElement !== viewer.renderer.domElement) return;
    viewer.camera.rotation.y -= event.movementX * 0.002;
  };

  let frame = 0;
  const move = () => {
    if (active) {
      const step = firstPersonStep(keys, viewer.camera.rotation.y);
      viewer.camera.position.x += step.dx;
      viewer.camera.position.z += step.dz;
      draw();
    }
    frame = requestAnimationFrame(move);
  };

  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onUp);
  viewer.renderer.domElement.addEventListener('pointermove', onPointer);

  const setActive = (next: boolean) => {
    active = next;
    viewer.setFirstPerson(active);
    toggle.setAttribute('aria-label', active ? 'Exit first person' : 'First person');
    toggle.setAttribute('aria-pressed', String(active));
    toggle.classList.toggle('is-active', active);
    label.textContent = active ? 'Exit' : 'First person';
    minimap.hidden = !active;
    draw();
  };

  toggle.addEventListener('click', () => setActive(!active));
  viewer.renderer.domElement.addEventListener('click', () => {
    if (active) viewer.renderer.domElement.requestPointerLock?.();
  });

  toolbarHost.replaceChildren(toggle);
  overlayHost.append(minimap);
  draw();
  move();

  return {
    dispose() {
      window.clearInterval(timer);
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onUp);
      viewer.renderer.domElement.removeEventListener('pointermove', onPointer);
      viewer.setFirstPerson(false);
      toolbarHost.replaceChildren();
      minimap.remove();
    },
  };
}
