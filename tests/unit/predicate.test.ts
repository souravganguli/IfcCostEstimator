import { describe, expect, it } from 'vitest';
import { evaluateCondition, evaluateRule, type Condition, type FieldLookup, type FieldValue } from '../../src/core/predicate';

const fields = (entries: Record<string, FieldValue>): FieldLookup => (field) => entries[field];

describe('shared predicate contract', () => {
  it('matches equals across text, number, and boolean values', () => {
    const lookup = fields({
      'Pset_WallCommon.FireRating': { kind: 'text', value: 'REI60' },
      'Qto_WallBaseQuantities.NetVolume': { kind: 'number', value: 2.4, unit: 'm3' },
      'Pset_WallCommon.IsExternal': { kind: 'boolean', value: true },
    });
    expect(evaluateCondition(lookup, { field: 'Pset_WallCommon.FireRating', op: 'equals', value: 'REI60' })).toBe('match');
    expect(evaluateCondition(lookup, { field: 'Qto_WallBaseQuantities.NetVolume', op: 'equals', value: 2.4 })).toBe('match');
    expect(evaluateCondition(lookup, { field: 'Pset_WallCommon.IsExternal', op: 'equals', value: true })).toBe('match');
  });

  it('treats in-list as OR and numeric range inclusively', () => {
    const lookup = fields({ 'IfcClass': { kind: 'enum', value: 'IfcWall' }, 'Qto.Height': { kind: 'number', value: 3 } });
    expect(evaluateCondition(lookup, { field: 'IfcClass', op: 'in', values: ['IfcSlab', 'IfcWall'] })).toBe('match');
    expect(evaluateCondition(lookup, { field: 'IfcClass', op: 'in', values: ['IfcSlab', 'IfcBeam'] })).toBe('no-match');
    expect(evaluateCondition(lookup, { field: 'Qto.Height', op: 'range', min: 2, max: 3 })).toBe('match');
    expect(evaluateCondition(lookup, { field: 'Qto.Height', op: 'range', min: 3.1 })).toBe('no-match');
  });

  it('does case-insensitive Unicode contains', () => {
    const lookup = fields({ 'Name': { kind: 'text', value: 'Außenwand' } });
    expect(evaluateCondition(lookup, { field: 'Name', op: 'contains', value: 'auss' })).toBe('no-match');
    expect(evaluateCondition(lookup, { field: 'Name', op: 'contains', value: 'AUßEN' })).toBe('match');
    expect(evaluateCondition(lookup, { field: 'Name', op: 'contains', value: '' })).toBe('match');
  });

  it('distinguishes missing from unset and reports both', () => {
    const lookup = fields({ 'Pset.Present': { kind: 'text', value: 'x' }, 'Pset.Null': { kind: 'unset' } });
    expect(evaluateCondition(lookup, { field: 'Pset.Present', op: 'exists' })).toBe('match');
    expect(evaluateCondition(lookup, { field: 'Pset.Null', op: 'exists' })).toBe('no-match');
    expect(evaluateCondition(lookup, { field: 'Pset.Null', op: 'missing' })).toBe('match');
    expect(evaluateCondition(lookup, { field: 'Pset.Absent', op: 'missing' })).toBe('match');
    expect(evaluateCondition(lookup, { field: 'Pset.Absent', op: 'equals', value: 'x' })).toBe('no-match');
  });

  it('flags a type-mismatched condition as unsupported, never a silent no-match', () => {
    const lookup = fields({ 'Name': { kind: 'text', value: 'Wall' } });
    expect(evaluateCondition(lookup, { field: 'Name', op: 'range', min: 0, max: 5 })).toBe('unsupported');
  });

  it('matches a list value when any member matches', () => {
    const lookup = fields({
      'Pset.Materials': { kind: 'list', value: [{ kind: 'text', value: 'Brick' }, { kind: 'text', value: 'Plaster' }] },
    });
    expect(evaluateCondition(lookup, { field: 'Pset.Materials', op: 'contains', value: 'plaster' })).toBe('match');
    expect(evaluateCondition(lookup, { field: 'Pset.Materials', op: 'contains', value: 'steel' })).toBe('no-match');
  });

  it('ANDs rule conditions and counts unsupported ones', () => {
    const lookup = fields({
      'IfcClass': { kind: 'enum', value: 'IfcWall' },
      'Qto.Volume': { kind: 'number', value: 2.4 },
      'Name': { kind: 'text', value: 'Wall' },
    });
    const conditions: Condition[] = [
      { field: 'IfcClass', op: 'equals', value: 'IfcWall' },
      { field: 'Qto.Volume', op: 'range', min: 2 },
    ];
    expect(evaluateRule(lookup, conditions)).toEqual({ matched: true, unsupported: 0 });
    expect(evaluateRule(lookup, [...conditions, { field: 'Name', op: 'range', min: 0 }])).toEqual({ matched: false, unsupported: 1 });
    expect(evaluateRule(lookup, [])).toEqual({ matched: false, unsupported: 0 });
  });
});
