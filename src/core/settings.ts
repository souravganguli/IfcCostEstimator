export const SETTINGS_KEY = 'ifccostestimator:settings:v1';
export interface Settings {
  version: 1;
  showGrid: boolean;
}
const defaults = (): Settings => ({ version: 1, showGrid: true });

export function readSettings(storage: Pick<Storage, 'getItem'>): Settings {
  try {
    const value: unknown = JSON.parse(storage.getItem(SETTINGS_KEY) ?? 'null');
    if (value && typeof value === 'object') {
      const candidate = value as { version?: unknown; showGrid?: unknown };
      if (candidate.version === 1 && typeof candidate.showGrid === 'boolean') {
        return { version: 1, showGrid: candidate.showGrid };
      }
    }
    return defaults();
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
