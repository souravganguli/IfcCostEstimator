import { describe, expect, it } from 'vitest';
import { deploymentSettingsKey, deploymentStorage, readSettings, saveSettings, SETTINGS_KEY } from '../../src/core/settings';

describe('settings', () => {
  it('keeps production preferences compatible and isolates dev preferences', () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    const production = deploymentStorage('/IfcCostEstimator/', storage);
    const dev = deploymentStorage('/IfcCostEstimator/dev/', storage);
    saveSettings(production, { version: 1, showGrid: false });
    expect(readSettings(dev).showGrid).toBe(true);
    saveSettings(dev, { version: 1, showGrid: false });
    expect(readSettings(production).showGrid).toBe(false);
    expect(values.size).toBe(2);
    expect(deploymentSettingsKey('/IfcCostEstimator/')).toBe(SETTINGS_KEY);
    expect(deploymentSettingsKey('/')).toBe(SETTINGS_KEY);
  });
  it.each([null, '{broken', '{}', '{"version":2,"showGrid":false}', '{"version":1,"showGrid":"false"}'])('defaults safely for %s', (value) => {
    expect(readSettings({ getItem: () => value })).toEqual({ version: 1, showGrid: true });
  });
  it('restores valid preferences without unknown fields', () => {
    expect(readSettings({ getItem: () => '{"version":1,"showGrid":false,"filename":"secret"}' })).toEqual({ version: 1, showGrid: false });
  });
  it('survives denied reads and quota/denied writes', () => {
    expect(readSettings({ getItem: () => { throw new Error('denied'); } }).showGrid).toBe(true);
    expect(saveSettings({ setItem: () => { throw new Error('quota'); } }, { version: 1, showGrid: false })).toBe(false);
  });
  it('writes only the namespaced key and permitted fields', () => {
    const values = new Map([['unrelated', 'preserve']]);
    saveSettings({ setItem: (key, value) => { values.set(key, value); } }, { version: 1, showGrid: false });
    expect([...values.keys()]).toEqual(['unrelated', SETTINGS_KEY]);
    expect(JSON.parse(values.get(SETTINGS_KEY)!)).toEqual({ version: 1, showGrid: false });
  });
});