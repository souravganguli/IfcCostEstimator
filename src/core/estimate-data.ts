export const ESTIMATE_SCHEMA_VERSION = 1;
export interface EstimateDefinition {
  readonly version: 1; readonly currency: string; readonly units?: string;
  readonly cbs: readonly Record<string, unknown>[]; readonly mappings: readonly Record<string, unknown>[];
  readonly rates: readonly Record<string, unknown>[]; readonly assemblies: readonly Record<string, unknown>[];
}
export interface ImportResult { readonly definition?: EstimateDefinition; readonly error?: string }
export function emptyEstimate(currency = ''): EstimateDefinition {
  return { version: 1, currency, cbs: [], mappings: [], rates: [], assemblies: [] };
}
export function serializeEstimate(definition: EstimateDefinition): string {
  return JSON.stringify({ ...definition, version: ESTIMATE_SCHEMA_VERSION }, null, 2);
}
export function parseEstimate(text: string, maxBytes = 5_000_000): ImportResult {
  if (text.length > maxBytes) return { error: 'Estimate file is too large.' };
  try {
    const value = JSON.parse(text) as Partial<EstimateDefinition>;
    if (value.version !== ESTIMATE_SCHEMA_VERSION || typeof value.currency !== 'string'
      || !Array.isArray(value.cbs) || !Array.isArray(value.mappings)
      || !Array.isArray(value.rates) || !Array.isArray(value.assemblies)) return { error: 'Unsupported estimate format.' };
    return { definition: { version: 1, currency: value.currency, units: value.units, cbs: value.cbs, mappings: value.mappings, rates: value.rates, assemblies: value.assemblies } };
  } catch { return { error: 'Invalid estimate JSON.' }; }
}
export function neutralizeSpreadsheetText(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}
export function exportCsv(rows: readonly (readonly unknown[])[]): string {
  return rows.map((row) => row.map((cell) => {
    const text = neutralizeSpreadsheetText(String(cell ?? ''));
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }).join(',')).join('\r\n');
}
