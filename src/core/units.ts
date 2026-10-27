/**
 * Metric normalization. See docs/feature/cross-cutting-contracts.md section 7.
 *
 * All derived quantities, rates, and costs use metric units. Source values in
 * other units are converted with exact factors; the original value and unit
 * are retained by the caller for display and export. Unit labels are
 * normalized so equivalent spellings collapse to one canonical unit. A value
 * whose unit cannot be reconciled with a quantity kind is flagged, never
 * silently zeroed. This module is pure (no IFC, Three.js, or DOM).
 */

/** Physical dimension a unit measures. */
export type QuantityKind = 'count' | 'length' | 'area' | 'volume' | 'weight';

/** Canonical metric unit per quantity kind. */
export const CANONICAL_UNIT: Record<QuantityKind, string> = {
  count: 'ea',
  length: 'm',
  area: 'm2',
  volume: 'm3',
  weight: 'kg',
};

interface UnitDefinition {
  readonly kind: QuantityKind;
  /** Multiply a source value by this factor to get the canonical metric value. */
  readonly toCanonical: number;
  /** Accepted spellings that normalize to this unit (lowercased, no spaces). */
  readonly aliases: readonly string[];
}

const DEFINITIONS: readonly UnitDefinition[] = [
  { kind: 'count', toCanonical: 1, aliases: ['ea', 'each', 'count', 'nr', 'no', 'pcs', 'piece', 'pieces'] },
  { kind: 'length', toCanonical: 1, aliases: ['m', 'metre', 'metres', 'meter', 'meters'] },
  { kind: 'length', toCanonical: 0.001, aliases: ['mm', 'millimetre', 'millimetres', 'millimeter', 'millimeters'] },
  { kind: 'length', toCanonical: 0.01, aliases: ['cm', 'centimetre', 'centimetres', 'centimeter', 'centimeters'] },
  { kind: 'length', toCanonical: 0.3048, aliases: ['ft', 'foot', 'feet'] },
  { kind: 'length', toCanonical: 0.0254, aliases: ['in', 'inch', 'inches'] },
  { kind: 'area', toCanonical: 1, aliases: ['m2', 'm^2', 'm²', 'sqm', 'squaremetre', 'squaremetres', 'squaremeter', 'squaremeters'] },
  { kind: 'area', toCanonical: 0.000001, aliases: ['mm2', 'mm^2', 'mm²', 'sqmm'] },
  { kind: 'area', toCanonical: 0.0001, aliases: ['cm2', 'cm^2', 'cm²', 'sqcm'] },
  { kind: 'area', toCanonical: 0.09290304, aliases: ['ft2', 'ft^2', 'ft²', 'sqft', 'squarefoot', 'squarefeet'] },
  { kind: 'volume', toCanonical: 1, aliases: ['m3', 'm^3', 'm³', 'cum', 'cubicmetre', 'cubicmetres', 'cubicmeter', 'cubicmeters'] },
  { kind: 'volume', toCanonical: 1e-9, aliases: ['mm3', 'mm^3', 'mm³'] },
  { kind: 'volume', toCanonical: 0.000001, aliases: ['cm3', 'cm^3', 'cm³', 'ml', 'millilitre', 'millilitres'] },
  { kind: 'volume', toCanonical: 0.001, aliases: ['l', 'litre', 'litres', 'liter', 'liters'] },
  { kind: 'volume', toCanonical: 0.0283168466, aliases: ['ft3', 'ft^3', 'ft³', 'cuft', 'cubicfoot', 'cubicfeet'] },
  { kind: 'weight', toCanonical: 1, aliases: ['kg', 'kilogram', 'kilograms', 'kilogramme', 'kilogrammes'] },
  { kind: 'weight', toCanonical: 0.001, aliases: ['g', 'gram', 'grams', 'gramme', 'grammes'] },
  { kind: 'weight', toCanonical: 1000, aliases: ['t', 'tonne', 'tonnes', 'ton', 'tons'] },
  { kind: 'weight', toCanonical: 0.45359237, aliases: ['lb', 'lbs', 'pound', 'pounds'] },
];

const INDEX = new Map<string, UnitDefinition>();
for (const definition of DEFINITIONS) {
  for (const alias of definition.aliases) INDEX.set(alias, definition);
}

/** Reduce a raw unit label to a lookup key: lowercased, trimmed, spaces removed. */
function labelKey(label: string): string {
  return label.normalize('NFC').trim().toLocaleLowerCase().replace(/\s+/g, '');
}

/** The canonical metric unit for a recognized label, or undefined if unknown. */
export function normalizeUnit(label: string): string | undefined {
  const definition = INDEX.get(labelKey(label));
  return definition ? CANONICAL_UNIT[definition.kind] : undefined;
}

/** The quantity kind for a recognized label, or undefined if unknown. */
export function unitKind(label: string): QuantityKind | undefined {
  return INDEX.get(labelKey(label))?.kind;
}

/** Result of a metric conversion attempt. */
export type Conversion =
  | { readonly ok: true; readonly value: number; readonly unit: string; readonly kind: QuantityKind }
  | { readonly ok: false; readonly reason: 'unknown-unit' };

/**
 * Convert a value in a source unit to its canonical metric unit. Returns a
 * flagged failure for unrecognized units rather than assuming metric.
 */
export function toMetric(value: number, sourceUnit: string): Conversion {
  const definition = INDEX.get(labelKey(sourceUnit));
  if (!definition) return { ok: false, reason: 'unknown-unit' };
  return {
    ok: true,
    value: value * definition.toCanonical,
    unit: CANONICAL_UNIT[definition.kind],
    kind: definition.kind,
  };
}

/**
 * Whether a rate unit is compatible with a quantity kind (so rate x quantity
 * is meaningful). Both must resolve to the same canonical metric unit.
 */
export function isRateCompatible(rateUnit: string, quantityKind: QuantityKind): boolean {
  return unitKind(rateUnit) === quantityKind;
}
