import type { Condition, FieldKey, FieldValue } from './predicate';
import { evaluateRule, type FieldLookup } from './predicate';

export interface ColorRule { readonly id: string; readonly conditions: readonly Condition[]; readonly color: string }
export function matchColorRule(rules: readonly ColorRule[], lookup: FieldLookup): string | undefined {
  return rules.find((rule) => evaluateRule(lookup, rule.conditions).matched)?.color;
}
export function fieldsFromEntries(entries: ReadonlyMap<FieldKey, FieldValue>): FieldLookup {
  return (key) => entries.get(key);
}
