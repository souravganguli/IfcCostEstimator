import type { FeatureHandle, ModelSession } from '../../core/contracts';
import { calculateCost } from '../../core/costing';
import { emptyEstimate, exportCsv, parseEstimate, serializeEstimate } from '../../core/estimate-data';
import { buildEstimateWorkbook } from '../../core/estimate-xlsx';
import { fluentButton, fluentTextInput } from '../../core/fluent';
import { createFilePickerButton } from '../../components/file-picker-button';

export function mountEstimate(target: HTMLElement, session: ModelSession, notice: (message: string) => void): FeatureHandle {
  const panel = document.createElement('section');
  panel.className = 'feature-panel estimate-panel';

  const heading = document.createElement('h2');
  heading.textContent = 'Estimate';

  const currency = fluentTextInput({ placeholder: 'Currency (e.g. USD)', ariaLabel: 'Estimate currency' });
  const rate = fluentTextInput({ type: 'number', placeholder: 'Rate per unit', ariaLabel: 'Estimate rate' });
  const unit = fluentTextInput({ ariaLabel: 'Estimate unit', value: 'ea' });

  const total = document.createElement('p');
  total.setAttribute('aria-live', 'polite');

  const calculate = fluentButton('Calculate', { appearance: 'primary' });
  const json = fluentButton('Export JSON', { appearance: 'subtle' });
  const csv = fluentButton('Export CSV', { appearance: 'subtle' });
  const xlsx = fluentButton('Export XLSX', { appearance: 'subtle' });

  const importer = createFilePickerButton({
    label: 'Import JSON',
    accept: '.json,application/json',
    ariaLabel: 'Import estimate JSON',
    appearance: 'subtle',
  });

  panel.append(heading, currency, rate, unit, calculate, total, json, csv, xlsx, importer.element, importer.input);
  target.append(panel);

  const loadedModels = () => session.getModels().filter((model) => model.state === 'loaded');

  const download = (blob: Blob, name: string) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = name;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 0);
  };

  const definition = () => emptyEstimate(currency.value);

  calculate.addEventListener('click', () => {
    const result = calculateCost(
      { quantity: loadedModels().length, quantityUnit: 'ea', rate: Number(rate.value), rateUnit: unit.value },
      'count',
    );
    total.textContent =
      result.cost === undefined ? result.warnings.join(', ') : `${currency.value} ${result.cost.toFixed(2)}`;
  });

  json.addEventListener('click', () => {
    download(new Blob([serializeEstimate(definition())], { type: 'application/json' }), 'estimate.json');
  });

  csv.addEventListener('click', () => {
    const rows: (string | number)[][] = [['currency', currency.value], ['models', loadedModels().length]];
    download(new Blob([exportCsv(rows)], { type: 'text/csv' }), 'estimate.csv');
  });

  xlsx.addEventListener('click', () => {
    const models = loadedModels();
    const elements: (string | number)[][] = [['Model', 'Express ID', 'GlobalId', 'IFC class', 'Name', 'Storey']];
    models.forEach((model) => {
      const asset = session.getAsset(model.id);
      asset?.elements?.getAll().forEach((identity) => {
        const metadata = asset.properties?.getMetadata(identity);
        elements.push([
          model.name,
          identity.expressId,
          metadata?.globalId ?? '',
          metadata?.ifcClass ?? '',
          metadata?.name ?? '',
          metadata?.storeyName ?? '',
        ]);
      });
    });
    download(
      buildEstimateWorkbook({ currency: currency.value, models: models.map((model) => model.name), elements }),
      'estimate.xlsx',
    );
  });

  importer.onFiles(async (files) => {
    const file = files[0];
    if (!file) return;
    const result = parseEstimate(await file.text());
    if (result.definition) {
      currency.value = result.definition.currency;
      notice('Estimate imported');
    } else {
      notice(result.error ?? 'Estimate import failed');
    }
  });

  return {
    dispose() {
      importer.dispose();
      panel.remove();
    },
  };
}
