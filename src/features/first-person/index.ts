import type { FeatureHandle } from '../../core/contracts';
import { fluentButton } from '../../core/fluent';
import { firstPersonStep, minimapMarker } from '../../core/first-person';

export interface FirstPersonViewer {
  setFirstPerson(enabled: boolean): void;
  readonly camera: { position: { x: number; y: number; z: number }; rotation: { y: number } };
  readonly renderer: { domElement: HTMLElement };
}

export function mountFirstPerson(target: HTMLElement, viewer: FirstPersonViewer): FeatureHandle {
  const panel = document.createElement('section');
  panel.className = 'feature-panel first-person-panel';

  const heading = document.createElement('h2');
  heading.textContent = 'First person';

  const toggle = fluentButton('Walkthrough', { appearance: 'outline' });

  const minimap = document.createElement('div');
  minimap.className = 'first-person-minimap';
  minimap.setAttribute('aria-label', 'First-person minimap');
  const marker = document.createElement('span');
  marker.className = 'minimap-marker';
  minimap.append(marker);

  const status = document.createElement('p');
  status.textContent = 'Orbit mode';

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

  toggle.addEventListener('click', () => {
    active = !active;
    viewer.setFirstPerson(active);
    toggle.textContent = active ? 'Exit walkthrough' : 'Walkthrough';
    status.textContent = active
      ? 'First-person mode · WASD/arrow keys · click scene for mouse look'
      : 'Orbit mode';
    draw();
  });
  viewer.renderer.domElement.addEventListener('click', () => {
    if (active) viewer.renderer.domElement.requestPointerLock?.();
  });

  panel.append(heading, toggle, minimap, status);
  target.append(panel);
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
      panel.remove();
    },
  };
}
