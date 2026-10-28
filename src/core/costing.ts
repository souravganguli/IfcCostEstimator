import { isRateCompatible, toMetric, type QuantityKind } from './units';

export interface CostLineInput {
  readonly quantity?: number; readonly quantityUnit?: string; readonly rate?: number;
  readonly rateUnit?: string; readonly markup?: number; readonly lumpSum?: number;
}
export interface CostLineResult {
  readonly quantity?: number; readonly rate?: number; readonly cost?: number;
  readonly warnings: readonly string[]; readonly unit?: string;
}
const round = (value: number, places: number) => {
  const factor = 10 ** places;
  return Math.sign(value) * Math.round((Math.abs(value) + Number.EPSILON) * factor) / factor;
};
export function roundMoney(value: number): number { return round(value, 2); }
export function roundQuantity(value: number): number { return round(value, 3); }

export function calculateCost(input: CostLineInput, kind: QuantityKind = 'count'): CostLineResult {
  if (input.lumpSum !== undefined) return { cost: roundMoney(input.lumpSum), warnings: [] };
  const warnings: string[] = [];
  if (input.quantity === undefined || !input.quantityUnit) warnings.push('missing quantity');
  if (input.rate === undefined || !input.rateUnit) warnings.push('missing rate');
  if (warnings.length) return { warnings };
  const quantity = toMetric(input.quantity!, input.quantityUnit!);
  if (!quantity.ok || quantity.kind !== kind) warnings.push('quantity unit mismatch');
  if (!isRateCompatible(input.rateUnit!, kind)) warnings.push('rate unit mismatch');
  if (warnings.length) return { warnings };
  if (!quantity.ok) return { warnings: ['quantity unit mismatch'] };
  const normalizedQuantity = roundQuantity(quantity.value);
  const cost = roundMoney(normalizedQuantity * input.rate! * (1 + (input.markup ?? 0) / 100));
  return { quantity: normalizedQuantity, rate: input.rate, cost, unit: quantity.unit, warnings };
}

export interface AssemblyComponent { readonly quantity: number; readonly rate: number; readonly waste?: number }
export function assemblyRate(components: readonly AssemblyComponent[]): number {
  return roundMoney(components.reduce((sum, component) =>
    sum + component.quantity * component.rate * (1 + (component.waste ?? 0) / 100), 0));
}
