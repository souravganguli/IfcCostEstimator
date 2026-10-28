import { neutralizeSpreadsheetText } from './estimate-data';

/** Escapes a value for a minimal SpreadsheetML workbook, avoiding formula injection. */
export function spreadsheetCell(value: string | number, formula?: string): string {
  if (formula) return `<c><f>${formula}</f><v></v></c>`;
  if (typeof value === 'number') return `<c><v>${value}</v></c>`;
  return `<c t="inlineStr"><is><t>${neutralizeSpreadsheetText(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</t></is></c>`;
}
export function costFormula(quantityCell: string, rateCell: string, markupCell?: string): string {
  return `ROUND(${quantityCell}*${rateCell}${markupCell ? `*(1+${markupCell}/100)` : ''},2)`;
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); }
  return (crc ^ 0xffffffff) >>> 0;
}
function zip(files: readonly [string, string][]): Blob {
  const encoder = new TextEncoder(); const chunks: Uint8Array[] = []; const central: Uint8Array[] = []; let offset = 0;
  const put32 = (array: Uint8Array, index: number, value: number) => { const view = new DataView(array.buffer); view.setUint32(index, value, true); };
  files.forEach(([name, text]) => { const nameBytes = encoder.encode(name); const bytes = encoder.encode(text); const header = new Uint8Array(30 + nameBytes.length); const view = new DataView(header.buffer); view.setUint32(0, 0x04034b50, true); view.setUint16(8, 0, true); view.setUint32(14, crc32(bytes), true); view.setUint32(18, bytes.length, true); view.setUint32(22, bytes.length, true); view.setUint16(26, nameBytes.length, true); header.set(nameBytes, 30); chunks.push(header, bytes); const entry = new Uint8Array(46 + nameBytes.length); const e = new DataView(entry.buffer); e.setUint32(0, 0x02014b50, true); e.setUint16(8, 20, true); e.setUint32(16, crc32(bytes), true); e.setUint32(20, bytes.length, true); e.setUint32(24, bytes.length, true); e.setUint16(28, nameBytes.length, true); e.setUint32(42, offset, true); entry.set(nameBytes, 46); central.push(entry); offset += header.length + bytes.length; });
  const centralSize = central.reduce((sum, item) => sum + item.length, 0); const end = new Uint8Array(22); const endView = new DataView(end.buffer); endView.setUint32(0, 0x06054b50, true); endView.setUint16(8, files.length, true); endView.setUint16(10, files.length, true); endView.setUint32(12, centralSize, true); endView.setUint32(16, offset, true);
  const all = [...chunks, ...central, end]; const size = all.reduce((sum, part) => sum + part.length, 0); const output = new Uint8Array(size); let cursor = 0;
  all.forEach((part) => { output.set(part, cursor); cursor += part.length; });
  return new Blob([output.buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
function sheet(rows: readonly (readonly (string | number)[])[]): string {
  const escape = (value: string) => neutralizeSpreadsheetText(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.map((row, ri) => `<row r="${ri + 1}">${row.map((value, ci) => { const ref = `${String.fromCharCode(65 + ci)}${ri + 1}`; if (typeof value === 'string' && value.startsWith('FORMULA:')) return `<c r="${ref}"><f>${escape(value.slice(8))}</f><v>0</v></c>`; return typeof value === 'number' ? `<c r="${ref}"><v>${value}</v></c>` : `<c r="${ref}" t="inlineStr"><is><t>${escape(String(value))}</t></is></c>`; }).join('')}</row>`).join('')}</sheetData></worksheet>`;
}
export interface WorkbookDataset { readonly takeoff?: readonly (readonly (string | number)[])[]; readonly elements?: readonly (readonly (string | number)[])[]; readonly mappings?: readonly (readonly (string | number)[])[]; readonly assemblies?: readonly (readonly (string | number)[])[] }
export function buildEstimateWorkbook(input: { readonly currency: string; readonly models: readonly string[] } & WorkbookDataset): Blob {
  const sheets = [['takeoff', input.takeoff ?? [['Quantity takeoff', 'Value'], ['Loaded models', input.models.length]]], ['element-list', input.elements ?? [['Model'], ...input.models.map((name) => [name])]], ['cbs-estimate', [['Quantity', 'Rate', 'Markup %', 'Cost'], [1, 0, 0, 'FORMULA:ROUND(A2*B2*(1+C2/100),2)']]], ['assemblies', input.assemblies ?? [['Assembly', 'Rate']]], ['notes', [['Currency', input.currency], ['Generated', new Date().toISOString()], ['Mappings', input.mappings?.length ?? 0]]]] as const;
  const workbook = `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map(([name], index) => `<sheet name="${name}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join('')}</sheets></workbook>`;
  const rels = `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join('')}</Relationships>`;
  const content = `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`;
  return zip([['[Content_Types].xml', content], ['_rels/.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'], ['xl/workbook.xml', workbook], ['xl/_rels/workbook.xml.rels', rels], ...sheets.map(([_, rows], index) => [`xl/worksheets/sheet${index + 1}.xml`, sheet(rows)] as [string, string])]);
}
