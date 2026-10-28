/** Pure measurement helpers. Coordinates are model units until normalized. */
export interface Point3 { readonly x: number; readonly y: number; readonly z: number }
export interface Measurement { readonly distance: number; readonly horizontal: number; readonly vertical: number; readonly unit: string }

export function measurePoints(a: Point3, b: Point3, factor = 1, unit = 'm'): Measurement {
  const dx = (b.x - a.x) * factor;
  const dy = (b.y - a.y) * factor;
  const dz = (b.z - a.z) * factor;
  return {
    distance: Math.hypot(dx, dy, dz),
    horizontal: Math.hypot(dx, dy),
    vertical: Math.abs(dz),
    unit,
  };
}

export function formatMeasurement(value: number, unit: string): string {
  return `${value.toFixed(3)} ${unit}`;
}
