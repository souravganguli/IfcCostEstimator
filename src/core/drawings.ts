export interface Triangle { readonly a: Point3; readonly b: Point3; readonly c: Point3; readonly elementId: number }
export interface Point3 { readonly x: number; readonly y: number; readonly z: number }
export interface Point2 { readonly x: number; readonly y: number }
export interface Segment2 { readonly start: Point2; readonly end: Point2; readonly elementId: number }

/** Project in-app triangles to a top-down architectural plan footprint. */
export function projectPlan(triangles: readonly Triangle[], elevation?: number): readonly Triangle[] {
  return triangles.filter((triangle) => elevation === undefined
    || [triangle.a, triangle.b, triangle.c].some((point) => Math.abs(point.z - elevation) < 1e-6));
}
function edgeIntersection(a: Point3, b: Point3, elevation: number): Point2 | undefined {
  const da = a.z - elevation; const db = b.z - elevation;
  if ((da > 0 && db > 0) || (da < 0 && db < 0) || da === db) return undefined;
  const t = da / (da - db);
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
/** Intersect triangles with a horizontal plane, returning element-associated linework. */
export function sectionSegments(triangles: readonly Triangle[], elevation: number): readonly Segment2[] {
  const result: Segment2[] = [];
  for (const triangle of triangles) {
    const points = [edgeIntersection(triangle.a, triangle.b, elevation), edgeIntersection(triangle.b, triangle.c, elevation), edgeIntersection(triangle.c, triangle.a, elevation)].filter((point): point is Point2 => point !== undefined);
    if (points.length === 2) result.push({ start: points[0], end: points[1], elementId: triangle.elementId });
  }
  return result;
}
