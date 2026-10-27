/**
 * Shared property value and predicate contract.
 *
 * One typed matching contract reused by Model filtering, Model search,
 * Property coloring, and Cost breakdown mapping rules so their rule engines do
 * not diverge. See docs/feature/cross-cutting-contracts.md section 1.
 *
 * This module is pure: it has no knowledge of IFC, Three.js, or the DOM. The
 * IFC adapter is responsible for turning parsed IFC data into FieldValue shapes
 * keyed by field identity.
 */

/** A property value whose kind is known. `unset` is an explicit IFC null (`$`). */
export type FieldValue =
  | { readonly kind: 'text'; readonly value: string }
  | { readonly kind: 'number'; readonly value: number; readonly unit?: string }
  | { readonly kind: 'boolean'; readonly value: boolean }
  | { readonly kind: 'enum'; readonly value: string }
  | { readonly kind: 'list'; readonly value: readonly FieldValue[] }
  | { readonly kind: 'unset' };

/**
 * Field identity. Occurrence/type properties and quantities use a qualified
 * name (`PsetName.PropName` / `QsetName.QuantityName`); built-in fields use a
 * bare, reserved name (for example `IfcClass`, `Name`, `GlobalId`).
 */
export type FieldKey = string;

/** A single condition over one field. Conditions within a rule combine with AND. */
export type Condition =
  | { readonly field: FieldKey; readonly op: 'equals'; readonly value: string | number | boolean }
  | { readonly field: FieldKey; readonly op: 'in'; readonly values: readonly (string | number | boolean)[] }
  | { readonly field: FieldKey; readonly op: 'contains'; readonly value: string }
  | { readonly field: FieldKey; readonly op: 'range'; readonly min?: number; readonly max?: number }
  | { readonly field: FieldKey; readonly op: 'exists' }
  | { readonly field: FieldKey; readonly op: 'missing' };

/** The outcome of evaluating one condition against one element's fields. */
export type MatchResult = 'match' | 'no-match' | 'unsupported';

/** Lookup of an element's field values. Absent field => `missing` (undefined). */
export type FieldLookup = (field: FieldKey) => FieldValue | undefined;

/** Case-insensitive, Unicode-aware contains test. */
function containsText(haystack: string, needle: string): boolean {
  if (needle === '') return true;
  const normalize = (text: string) =>
    text.normalize('NFC').toLocaleLowerCase();
  return normalize(haystack).includes(normalize(needle));
}

/** Render a scalar FieldValue as text for text comparisons. */
function asText(value: FieldValue): string | undefined {
  switch (value.kind) {
    case 'text':
    case 'enum':
      return value.value;
    case 'number':
      return String(value.value);
    case 'boolean':
      return value.value ? 'true' : 'false';
    default:
      return undefined;
  }
}

function scalarEquals(value: FieldValue, expected: string | number | boolean): MatchResult {
  switch (value.kind) {
    case 'number':
      if (typeof expected === 'number') return value.value === expected ? 'match' : 'no-match';
      if (typeof expected === 'string') {
        const parsed = Number(expected);
        if (!Number.isNaN(parsed)) return value.value === parsed ? 'match' : 'no-match';
      }
      return 'unsupported';
    case 'boolean':
      if (typeof expected === 'boolean') return value.value === expected ? 'match' : 'no-match';
      if (typeof expected === 'string') {
        const normalized = expected.toLocaleLowerCase();
        if (normalized === 'true' || normalized === 'false') {
          return value.value === (normalized === 'true') ? 'match' : 'no-match';
        }
      }
      return 'unsupported';
    case 'text':
    case 'enum':
      if (typeof expected === 'string') return value.value === expected ? 'match' : 'no-match';
      return 'unsupported';
    default:
      return 'unsupported';
  }
}

/** Evaluate one condition against a single scalar or list value. */
function evaluateScalar(value: FieldValue, condition: Condition): MatchResult {
  switch (condition.op) {
    case 'equals':
      return scalarEquals(value, condition.value);
    case 'in': {
      let sawUnsupported = false;
      for (const candidate of condition.values) {
        const result = scalarEquals(value, candidate);
        if (result === 'match') return 'match';
        if (result === 'unsupported') sawUnsupported = true;
      }
      return sawUnsupported && condition.values.length > 0 ? 'unsupported' : 'no-match';
    }
    case 'contains': {
      const text = asText(value);
      if (text === undefined) return 'unsupported';
      return containsText(text, condition.value) ? 'match' : 'no-match';
    }
    case 'range': {
      if (value.kind !== 'number') return 'unsupported';
      if (condition.min !== undefined && value.value < condition.min) return 'no-match';
      if (condition.max !== undefined && value.value > condition.max) return 'no-match';
      return 'match';
    }
    default:
      return 'unsupported';
  }
}

/**
 * Evaluate one condition against an element's fields.
 *
 * `exists`/`missing` are decided purely by field presence. For value
 * operators, a missing or `unset` field is `no-match` (never `unsupported`),
 * while a present field of an incompatible type is `unsupported`. A `list`
 * value matches when any member matches (OR within the list).
 */
export function evaluateCondition(lookup: FieldLookup, condition: Condition): MatchResult {
  const value = lookup(condition.field);
  if (condition.op === 'exists') return value !== undefined && value.kind !== 'unset' ? 'match' : 'no-match';
  if (condition.op === 'missing') return value === undefined || value.kind === 'unset' ? 'match' : 'no-match';
  if (value === undefined || value.kind === 'unset') return 'no-match';
  if (value.kind === 'list') {
    let sawUnsupported = false;
    for (const member of value.value) {
      const result = evaluateScalar(member, condition);
      if (result === 'match') return 'match';
      if (result === 'unsupported') sawUnsupported = true;
    }
    return sawUnsupported && value.value.length > 0 ? 'unsupported' : 'no-match';
  }
  return evaluateScalar(value, condition);
}

/** Aggregate outcome of evaluating a rule (AND across its conditions). */
export interface RuleEvaluation {
  readonly matched: boolean;
  /** Count of conditions that could not be evaluated due to type mismatch. */
  readonly unsupported: number;
}

/**
 * Evaluate a rule: all conditions must match (AND). A rule with no conditions
 * does not match. Unsupported conditions do not match but are counted so
 * callers can surface an "unsupported value" summary rather than a silent zero.
 */
export function evaluateRule(lookup: FieldLookup, conditions: readonly Condition[]): RuleEvaluation {
  if (conditions.length === 0) return { matched: false, unsupported: 0 };
  let unsupported = 0;
  let matched = true;
  for (const condition of conditions) {
    const result = evaluateCondition(lookup, condition);
    if (result === 'unsupported') unsupported += 1;
    if (result !== 'match') matched = false;
  }
  return { matched, unsupported };
}
