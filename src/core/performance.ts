export interface PerformanceSample { readonly name: string; readonly milliseconds: number; readonly budget: number }
export function performanceSample<T>(name: string, budget: number, operation: () => T): { value: T; sample: PerformanceSample } {
  const start = typeof performance === 'undefined' ? Date.now() : performance.now();
  const value = operation();
  const end = typeof performance === 'undefined' ? Date.now() : performance.now();
  return { value, sample: { name, milliseconds: end - start, budget } };
}
export function assertPerformance(sample: PerformanceSample): void {
  if (sample.milliseconds > sample.budget) throw new Error(`${sample.name} exceeded ${sample.budget}ms (${sample.milliseconds.toFixed(1)}ms).`);
}
