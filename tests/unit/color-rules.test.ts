import { describe, expect, it } from 'vitest';
import { matchColorRule, fieldsFromEntries, type ColorRule } from '../../src/core/color-rules';
import type { FieldKey, FieldValue } from '../../src/core/predicate';

const text = (value: string): FieldValue => ({ kind: 'text', value });

const rules: ColorRule[] = [
  { id: 'a', color: '#ff0000', conditions: [{ field: 'IfcClass', op: 'equals', value: 'IfcWall' }] },
  { id: 'b', color: '#00ff00', conditions: [{ field: 'IfcClass', op: 'equals', value: 'IfcWall' }] },
  { id: 'c', color: '#0000ff', conditions: [{ field: 'IfcClass', op: 'equals', value: 'IfcSlab' }] },
];

describe('matchColorRule', () => {
  it('returns the first matching rule color (first-match precedence)', () => {
    const entries = new Map<FieldKey, FieldValue>([['IfcClass', text('IfcWall')]]);
    expect(matchColorRule(rules, fieldsFromEntries(entries))).toBe('#ff0000');
  });

  it('falls through to a later rule when earlier rules do not match', () => {
    const entries = new Map<FieldKey, FieldValue>([['IfcClass', text('IfcSlab')]]);
    expect(matchColorRule(rules, fieldsFromEntries(entries))).toBe('#0000ff');
  });

  it('returns undefined when no rule matches and for an empty rule set', () => {
    const entries = new Map<FieldKey, FieldValue>([['IfcClass', text('IfcDoor')]]);
    expect(matchColorRule(rules, fieldsFromEntries(entries))).toBeUndefined();
    expect(matchColorRule([], fieldsFromEntries(entries))).toBeUndefined();
  });

  it('requires all conditions within a rule to hold (AND semantics)', () => {
    const andRule: ColorRule[] = [
      {
        id: 'and',
        color: '#abcdef',
        conditions: [
          { field: 'IfcClass', op: 'equals', value: 'IfcWall' },
          { field: 'Name', op: 'contains', value: 'ext' },
        ],
      },
    ];
    const interior = new Map<FieldKey, FieldValue>([['IfcClass', text('IfcWall')], ['Name', text('Interior')]]);
    const exterior = new Map<FieldKey, FieldValue>([['IfcClass', text('IfcWall')], ['Name', text('External')]]);
    expect(matchColorRule(andRule, fieldsFromEntries(interior))).toBeUndefined();
    expect(matchColorRule(andRule, fieldsFromEntries(exterior))).toBe('#abcdef');
  });
});
