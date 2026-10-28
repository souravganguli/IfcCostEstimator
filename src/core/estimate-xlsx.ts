import { neutralizeSpreadsheetText } from './estimate-data';

/** Escapes a value for a minimal SpreadsheetML workbook, avoiding formula injection. */
export function spreadsheetCell(value: string | number, formula?: string): string {
  if (formula) return `<c><f>${formula}</f><v></v></c>`;
  if (typeof value === 'number') return `<c><v>${value}</v></c>`;
  const escaped = neutralizeSpreadsheetText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<c t="inlineStr"><is><t>${escaped}</t></is></c>`;
}

export function costFormula(quantityCell: string, rateCell: string, markupCell?: string): string {
  const markupFactor = markupCell ? `*(1+${markupCell}/100)` : '';
  return `ROUND(${quantityCell}*${rateCell}${markupFactor},2)`;
}

// ── Minimal hand-written ZIP writer ──────────────────────────────────────────
// Produces a store-compressed (no deflate) ZIP containing text files encoded
// as UTF-8. Used to build the XLSX container; no third-party dependency.

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zip(files: readonly [string, string][]): Blob {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const [name, text] of files) {
    const nameBytes = encoder.encode(name);
    const bytes = encoder.encode(text);
    const checksum = crc32(bytes);

    // Local file header (30 bytes + filename)
    const header = new Uint8Array(30 + nameBytes.length);
    const hv = new DataView(header.buffer);
    hv.setUint32(0, 0x04034b50, true);  // local file signature
    hv.setUint16(8, 0, true);           // compression: stored
    hv.setUint32(14, checksum, true);
    hv.setUint32(18, bytes.length, true);
    hv.setUint32(22, bytes.length, true);
    hv.setUint16(26, nameBytes.length, true);
    header.set(nameBytes, 30);
    chunks.push(header, bytes);

    // Central directory entry (46 bytes + filename)
    const entry = new Uint8Array(46 + nameBytes.length);
    const ev = new DataView(entry.buffer);
    ev.setUint32(0, 0x02014b50, true);  // central directory signature
    ev.setUint16(8, 20, true);          // version needed
    ev.setUint32(16, checksum, true);
    ev.setUint32(20, bytes.length, true);
    ev.setUint32(24, bytes.length, true);
    ev.setUint16(28, nameBytes.length, true);
    ev.setUint32(42, offset, true);     // local header offset
    entry.set(nameBytes, 46);
    central.push(entry);

    offset += header.length + bytes.length;
  }

  // End of central directory record
  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  const all = [...chunks, ...central, end];
  const size = all.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(size);
  let cursor = 0;
  for (const part of all) {
    output.set(part, cursor);
    cursor += part.length;
  }

  return new Blob([output.buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

// ── SpreadsheetML sheet serialiser ────────────────────────────────────────────

function escapeXml(value: string): string {
  return neutralizeSpreadsheetText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function sheetCell(value: string | number, ref: string): string {
  if (typeof value === 'string' && value.startsWith('FORMULA:')) {
    return `<c r="${ref}"><f>${escapeXml(value.slice(8))}</f><v>0</v></c>`;
  }
  if (typeof value === 'number') return `<c r="${ref}"><v>${value}</v></c>`;
  return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(String(value))}</t></is></c>`;
}

function sheet(rows: readonly (readonly (string | number)[])[]): string {
  const rowXml = rows
    .map((row, ri) => {
      const cells = row
        .map((value, ci) => {
          const ref = `${String.fromCharCode(65 + ci)}${ri + 1}`;
          return sheetCell(value, ref);
        })
        .join('');
      return `<row r="${ri + 1}">${cells}</row>`;
    })
    .join('');
  return `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rowXml}</sheetData></worksheet>`;
}

// ── Public workbook builder ───────────────────────────────────────────────────

export interface WorkbookDataset {
  readonly takeoff?: readonly (readonly (string | number)[])[];
  readonly elements?: readonly (readonly (string | number)[])[];
  readonly mappings?: readonly (readonly (string | number)[])[];
  readonly assemblies?: readonly (readonly (string | number)[])[];
}

export function buildEstimateWorkbook(
  input: { readonly currency: string; readonly models: readonly string[] } & WorkbookDataset,
): Blob {
  const sheets = [
    ['takeoff',     input.takeoff   ?? [['Quantity takeoff', 'Value'], ['Loaded models', input.models.length]]],
    ['element-list', input.elements ?? [['Model'], ...input.models.map((name) => [name])]],
    ['cbs-estimate', [['Quantity', 'Rate', 'Markup %', 'Cost'], [1, 0, 0, 'FORMULA:ROUND(A2*B2*(1+C2/100),2)']]],
    ['assemblies',  input.assemblies ?? [['Assembly', 'Rate']]],
    ['notes',       [['Currency', input.currency], ['Generated', new Date().toISOString()], ['Mappings', input.mappings?.length ?? 0]]],
  ] as const;

  const sheetRefs = sheets
    .map(([name], i) => `<sheet name="${name}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
    .join('');
  const workbook =
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"` +
    ` xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheets>${sheetRefs}</sheets></workbook>`;

  const relEntries = sheets
    .map((_, i) =>
      `<Relationship Id="rId${i + 1}"` +
      ` Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"` +
      ` Target="worksheets/sheet${i + 1}.xml"/>`,
    )
    .join('');
  const rels =
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `${relEntries}</Relationships>`;

  const overrides = sheets
    .map((_, i) =>
      `<Override PartName="/xl/worksheets/sheet${i + 1}.xml"` +
      ` ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    )
    .join('');
  const content =
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    `${overrides}</Types>`;

  const rootRel =
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1"` +
    ` Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"` +
    ` Target="xl/workbook.xml"/></Relationships>`;

  return zip([
    ['[Content_Types].xml', content],
    ['_rels/.rels', rootRel],
    ['xl/workbook.xml', workbook],
    ['xl/_rels/workbook.xml.rels', rels],
    ...sheets.map(([, rows], i) => [`xl/worksheets/sheet${i + 1}.xml`, sheet(rows)] as [string, string]),
  ]);
}
