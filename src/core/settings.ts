export const SETTINGS_KEY = 'ifccostestimator:settings:v1';
export interface Settings { version: 1; showGrid: boolean }
const defaults = (): Settings => ({ version: 1, showGrid: true });

export function readSettings(storage: Pick<Storage, 'getItem'>): Settings {
  try {
    const value = JSON.parse(storage.getItem(SETTINGS_KEY) ?? 'null');
    return value?.version === 1 && typeof value.showGrid === 'boolean'
      ? { version: 1, showGrid: value.showGrid } : defaults();
  } catch {
    return defaults();
  }
}

export function saveSettings(storage: Pick<Storage, 'setItem'>, settings: Settings): boolean {
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify({ version: 1, showGrid: settings.showGrid }));
    return true;
  } catch {
    return false;
  }
}

export const browserStorage = {
  getItem: (key: string) => window.localStorage.getItem(key),
  setItem: (key: string, value: string) => window.localStorage.setItem(key, value),
};

export function deploymentSettingsKey(base: string): string {
  return /\/dev\/$/.test(base) ? `${SETTINGS_KEY}:${base}` : SETTINGS_KEY;
}

export function deploymentStorage(base: string, storage: Pick<Storage, 'getItem' | 'setItem'> = browserStorage) {
  const key = deploymentSettingsKey(base);
  return {
    getItem: () => storage.getItem(key),
    setItem: (_key: string, value: string) => storage.setItem(key, value),
  };
}