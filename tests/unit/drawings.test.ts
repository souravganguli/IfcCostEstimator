import { describe, expect, it } from 'vitest';
import { projectPlan, sectionSegments, type Triangle } from '../../src/core/drawings';

const triangle = (z: number, elementId: number): Triangle => ({
  a: { x: 0, y: 0, z },
  b: { x: 1, y: 0, z },
  c: { x: 0, y: 1, z },
  elementId,
});

describe('drawings projection core', () => {
  it('returns all triangles for a plan when no elevation is given', () => {
    const triangles = [triangle(0, 1), triangle(3, 2)];
    expect(projectPlan(triangles)).toHaveLength(2);
  });

  it('keeps only triangles touching the requested plan elevation', () => {
    const triangles = [triangle(0, 1), triangle(3, 2)];
    const atThree = projectPlan(triangles, 3);
    expect(atThree).toHaveLength(1);
    expect(atThree[0].elementId).toBe(2);
  });

  it('produces a section segment per crossing triangle and preserves element identity', () => {
    const crossing: Triangle = {
      a: { x: 0, y: 0, z: -1 },
      b: { x: 2, y: 0, z: 1 },
      c: { x: 0, y: 2, z: 1 },
      elementId: 7,
    };
    const lines = sectionSegments([crossing], 0);
    expect(lines).toHaveLength(1);
    expect(lines[0].elementId).toBe(7);
  });

  it('emits no segment for a triangle that does not cross the plane', () => {
    expect(sectionSegments([triangle(5, 9)], 0)).toHaveLength(0);
  });
});
