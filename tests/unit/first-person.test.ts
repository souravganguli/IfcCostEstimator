import { describe, expect, it } from 'vitest';
import { firstPersonStep, minimapMarker } from '../../src/core/first-person';

describe('first-person walkthrough math', () => {
  it('produces no displacement when no movement keys are held', () => {
    expect(firstPersonStep(new Set(), 0)).toEqual({ dx: 0, dz: 0 });
  });

  it('moves forward along -Z at heading 0 and applies the sprint speed with shift', () => {
    const walk = firstPersonStep(new Set(['w']), 0);
    expect(walk.dx).toBeCloseTo(0, 10);
    expect(walk.dz).toBeCloseTo(0.05, 10);
    const sprint = firstPersonStep(new Set(['w', 'shift']), 0);
    expect(sprint.dz).toBeCloseTo(0.12, 10);
  });

  it('treats arrow keys as equivalent to WASD and cancels opposing keys', () => {
    expect(firstPersonStep(new Set(['arrowup']), 0)).toEqual(firstPersonStep(new Set(['w']), 0));
    expect(firstPersonStep(new Set(['w', 's']), 0)).toEqual({ dx: 0, dz: 0 });
    expect(firstPersonStep(new Set(['a', 'd']), 0)).toEqual({ dx: 0, dz: 0 });
  });

  it('rotates movement with the heading', () => {
    const step = firstPersonStep(new Set(['w']), Math.PI / 2);
    expect(step.dx).toBeCloseTo(0.05, 10);
    expect(step.dz).toBeCloseTo(0, 10);
  });

  it('centers the minimap marker at the origin and clamps to the 4..96 bounds', () => {
    expect(minimapMarker(0, 0)).toEqual({ left: 50, top: 50 });
    expect(minimapMarker(1000, 1000)).toEqual({ left: 96, top: 4 });
    expect(minimapMarker(-1000, -1000)).toEqual({ left: 4, top: 96 });
  });
});
