import { Box3, Group, Vector3 } from 'three';

export function frameModels(groups: readonly Group[], aspect: number, verticalFov: number): { center: Vector3; position: Vector3; near: number; far: number } | undefined {
  if (!Number.isFinite(aspect) || aspect <= 0 || !Number.isFinite(verticalFov) || verticalFov <= 0 || verticalFov >= 180) return;
  const bounds = new Box3();
  groups.filter((group) => group.visible).forEach((group) => bounds.union(new Box3().setFromObject(group)));
  if (bounds.isEmpty()) return;
  const center = bounds.getCenter(new Vector3());
  const radius = bounds.getSize(new Vector3()).length() / 2;
  if (![...center.toArray(), radius].every(Number.isFinite)) return;
  const verticalHalfAngle = verticalFov * Math.PI / 360;
  const halfAngle = Math.min(verticalHalfAngle, Math.atan(Math.tan(verticalHalfAngle) * aspect));
  const distance = Math.max(0.1, radius / Math.sin(halfAngle) * 1.15);
  return {
    center,
    position: center.clone().add(new Vector3(1, 0.7, 1).normalize().multiplyScalar(distance)),
    near: Math.max(distance / 10000, 0.001),
    far: Math.max(distance * 100, 1000),
  };
}