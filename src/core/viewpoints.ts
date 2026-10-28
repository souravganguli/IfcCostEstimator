export type Vec3Tuple = readonly [number, number, number];

export interface Viewpoint {
  readonly id: string;
  readonly name: string;
  readonly position: Vec3Tuple;
  readonly target: Vec3Tuple;
}

export function createViewpoint(name: string, position: Vec3Tuple, target: Vec3Tuple): Viewpoint {
  return {
    id: `viewpoint-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim() || 'Viewpoint',
    position: [...position],
    target: [...target],
  };
}

export function removeViewpoint(items: readonly Viewpoint[], id: string): readonly Viewpoint[] {
  return items.filter((item) => item.id !== id);
}
