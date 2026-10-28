// Pure, DOM-free cost-breakdown mapping state and aggregation so the
// mapped/unmapped reporting and quantity totals can be unit tested without the
// Fluent UI. Each mapping ties a model-scoped element to one CBS item with an
// optional manual quantity override.

export interface Mapping {
  readonly modelId: number;
  readonly expressId: number;
  cbs: string;
  override?: number;
}

export interface MappingSummary {
  readonly mapped: number;
  readonly unmapped: number;
  readonly quantity: number;
}

/** True when the mapping refers to the given model-scoped element. */
export function mappingMatches(mapping: Mapping, modelId: number, expressId: number): boolean {
  return mapping.modelId === modelId && mapping.expressId === expressId;
}

/**
 * Aggregates mappings into mapped/unmapped counts and a total quantity. A
 * mapping counts as mapped only when it references a CBS item; each mapped item
 * contributes its override quantity, or 1 when no override is given. Unmapped is
 * the remaining element count and never goes below zero.
 */
export function summarizeMappings(mappings: readonly Mapping[], elementCount: number): MappingSummary {
  let mapped = 0;
  let quantity = 0;
  for (const mapping of mappings) {
    if (!mapping.cbs) continue;
    mapped += 1;
    quantity += mapping.override ?? 1;
  }
  return { mapped, unmapped: Math.max(0, elementCount - mapped), quantity };
}
