import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import { frameModels } from '../../src/adapters/viewer/framing';

const models: Group[] = [];
function box(offset: number): Group {
  const group = new Group();
  group.position.x = offset;
  group.add(new Mesh(new BoxGeometry(4, 3, 1), new MeshBasicMaterial()));
  models.push(group);
  return group;
}
afterEach(() => {
  models.splice(0).forEach((group) => group.children.forEach((object) => {
    const mesh = object as Mesh;
    mesh.geometry.dispose();
    (mesh.material as MeshBasicMaterial).dispose();
  }));
});

describe('visible-model camera framing', () => {
  it('centers combined bounds, excludes hidden models, and preserves authored positions', () => {
    const first = box(0);
    const second = box(8);
    expect(frameModels([first, second], 1.6, 45)!.center.toArray()).toEqual([4, 0, 0]);
    second.visible = false;
    expect(frameModels([first, second], 1.6, 45)!.center.toArray()).toEqual([0, 0, 0]);
    expect(second.position.toArray()).toEqual([8, 0, 0]);
    expect(first.position.toArray()).toEqual([0, 0, 0]);
  });
  it('uses the limiting viewport angle and produces finite clipping planes', () => {
    const group = box(1000);
    const wide = frameModels([group], 2, 45)!;
    const narrow = frameModels([group], 0.4, 45)!;
    expect(narrow.position.distanceTo(narrow.center)).toBeGreaterThan(wide.position.distanceTo(wide.center));
    expect(narrow.near).toBeGreaterThan(0);
    expect(narrow.far).toBeGreaterThan(narrow.near);
    expect(narrow.center.toArray()).toEqual([1000, 0, 0]);
  });
  it('does nothing for empty, hidden, and invalid viewports', () => {
    const group = box(0);
    group.visible = false;
    expect(frameModels([group], 1, 45)).toBeUndefined();
    expect(frameModels([], 1, 45)).toBeUndefined();
    expect(frameModels([], 0, 45)).toBeUndefined();
    expect(frameModels([], 1, NaN)).toBeUndefined();
  });
});