import { describe, expect, it } from 'vitest';
import { createViewpoint, removeViewpoint, type Viewpoint } from '../../src/core/viewpoints';

describe('viewpoints core', () => {
  it('captures a copy of the camera position and target', () => {
    const position: [number, number, number] = [1, 2, 3];
    const target: [number, number, number] = [4, 5, 6];
    const viewpoint = createViewpoint('Lobby', position, target);
    expect(viewpoint.name).toBe('Lobby');
    expect(viewpoint.position).toEqual([1, 2, 3]);
    expect(viewpoint.target).toEqual([4, 5, 6]);
    position[0] = 99;
    expect(viewpoint.position[0]).toBe(1);
  });

  it('falls back to a default name when the name is blank and assigns unique ids', () => {
    const first = createViewpoint('   ', [0, 0, 0], [0, 0, 0]);
    const second = createViewpoint('', [0, 0, 0], [0, 0, 0]);
    expect(first.name).toBe('Viewpoint');
    expect(second.name).toBe('Viewpoint');
    expect(first.id).not.toBe(second.id);
  });

  it('removes only the viewpoint with the matching id', () => {
    const items: Viewpoint[] = [
      { id: 'a', name: 'A', position: [0, 0, 0], target: [0, 0, 0] },
      { id: 'b', name: 'B', position: [0, 0, 0], target: [0, 0, 0] },
    ];
    expect(removeViewpoint(items, 'a')).toEqual([items[1]]);
    expect(removeViewpoint(items, 'missing')).toEqual(items);
  });
});
