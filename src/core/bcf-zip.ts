// Minimal, dependency-free BCF 3.0 (ZIP) writer/reader for saved-view export
// and import. Uses a store-only (uncompressed) ZIP container so no compression
// library is required and everything stays same-origin and in-browser.
//
// The BCF archive we produce per view contains, under a GUID-named folder:
//   <guid>/markup.bcf      minimal BCF markup (Topic title = view name)
//   <guid>/viewpoint.bcfv  BCF VisualizationInfo (camera, components, clipping)
//   <guid>/snapshot.png    optional snapshot image
// Unknown files and unknown XML elements are ignored on import, per BCF's
// forward-compatibility guidance.

import type {
  CameraSnapshot,
  ClippingPlaneSnapshot,
  SavedView,
  SavedViewComponent,
  SavedViewLibrary,
  SavedViewSnapshot,
  Vec3Tuple,
  VisibilitySnapshot,
} from './saved-views';
import { createSavedView } from './saved-views';

// --- CRC-32 -------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// --- store-only ZIP writer ---------------------------------------------

interface ZipEntry {
  readonly name: string;
  readonly data: Uint8Array;
}

function encodeUtf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function writeUint32LE(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value >>> 0, true);
}
function writeUint16LE(view: DataView, offset: number, value: number): void {
  view.setUint16(offset, value & 0xffff, true);
}

/** Build a store-only ZIP archive from the given entries. */
export function buildZip(entries: readonly ZipEntry[]): Uint8Array {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encodeUtf8(entry.name);
    const crc = crc32(entry.data);
    const size = entry.data.length;

    const local = new Uint8Array(30 + nameBytes.length + size);
    const lv = new DataView(local.buffer);
    writeUint32LE(lv, 0, 0x04034b50);
    writeUint16LE(lv, 4, 20); // version needed
    writeUint16LE(lv, 6, 0); // flags
    writeUint16LE(lv, 8, 0); // method: store
    writeUint16LE(lv, 10, 0); // mod time
    writeUint16LE(lv, 12, 0x21); // mod date (arbitrary, 1980-01-01)
    writeUint32LE(lv, 14, crc);
    writeUint32LE(lv, 18, size);
    writeUint32LE(lv, 22, size);
    writeUint16LE(lv, 26, nameBytes.length);
    writeUint16LE(lv, 28, 0); // extra length
    local.set(nameBytes, 30);
    local.set(entry.data, 30 + nameBytes.length);
    locals.push(local);

    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    writeUint32LE(cv, 0, 0x02014b50);
    writeUint16LE(cv, 4, 20); // version made by
    writeUint16LE(cv, 6, 20); // version needed
    writeUint16LE(cv, 8, 0);
    writeUint16LE(cv, 10, 0);
    writeUint16LE(cv, 12, 0);
    writeUint16LE(cv, 14, 0x21);
    writeUint32LE(cv, 16, crc);
    writeUint32LE(cv, 20, size);
    writeUint32LE(cv, 24, size);
    writeUint16LE(cv, 28, nameBytes.length);
    writeUint16LE(cv, 30, 0);
    writeUint16LE(cv, 32, 0);
    writeUint16LE(cv, 34, 0);
    writeUint16LE(cv, 36, 0);
    writeUint32LE(cv, 38, 0);
    writeUint32LE(cv, 42, offset);
    central.set(nameBytes, 46);
    centrals.push(central);

    offset += local.length;
  }

  const centralSize = centrals.reduce((sum, c) => sum + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  writeUint32LE(ev, 0, 0x06054b50);
  writeUint16LE(ev, 4, 0);
  writeUint16LE(ev, 6, 0);
  writeUint16LE(ev, 8, entries.length);
  writeUint16LE(ev, 10, entries.length);
  writeUint32LE(ev, 12, centralSize);
  writeUint32LE(ev, 16, offset);
  writeUint16LE(ev, 20, 0);

  const totalLocal = locals.reduce((sum, l) => sum + l.length, 0);
  const archive = new Uint8Array(totalLocal + centralSize + end.length);
  let position = 0;
  for (const local of locals) {
    archive.set(local, position);
    position += local.length;
  }
  for (const central of centrals) {
    archive.set(central, position);
    position += central.length;
  }
  archive.set(end, position);
  return archive;
}

/** Parse a store-only (or deflate-marked but store-written) ZIP's entries. */
export function readZip(bytes: Uint8Array): ReadonlyMap<string, Uint8Array> {
  const result = new Map<string, Uint8Array>();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let i = 0;
  while (i + 4 <= bytes.length) {
    const signature = view.getUint32(i, true);
    if (signature !== 0x04034b50) break; // reached central directory
    const method = view.getUint16(i + 8, true);
    const compressedSize = view.getUint32(i + 18, true);
    const nameLength = view.getUint16(i + 26, true);
    const extraLength = view.getUint16(i + 28, true);
    const nameStart = i + 30;
    const name = new TextDecoder().decode(bytes.subarray(nameStart, nameStart + nameLength));
    const dataStart = nameStart + nameLength + extraLength;
    const data = bytes.subarray(dataStart, dataStart + compressedSize);
    // Only store (method 0) is supported; skip anything compressed.
    if (method === 0) result.set(name, data.slice());
    i = dataStart + compressedSize;
  }
  return result;
}

// --- BCF XML ------------------------------------------------------------

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function vec(tag: string, v: Vec3Tuple): string {
  return `<${tag}><X>${v[0]}</X><Y>${v[1]}</Y><Z>${v[2]}</Z></${tag}>`;
}

function cameraXml(camera: CameraSnapshot): string {
  const common = `${vec('CameraViewPoint', camera.position)}${vec('CameraDirection', [
    camera.target[0] - camera.position[0],
    camera.target[1] - camera.position[1],
    camera.target[2] - camera.position[2],
  ])}${vec('CameraUpVector', camera.up)}`;
  if (camera.kind === 'perspective') {
    return `<PerspectiveCamera>${common}<FieldOfView>${camera.fieldOfView}</FieldOfView></PerspectiveCamera>`;
  }
  return `<OrthogonalCamera>${common}<ViewToWorldScale>${camera.viewToWorldScale}</ViewToWorldScale></OrthogonalCamera>`;
}

function componentXml(component: SavedViewComponent, extra = ''): string {
  const guid = component.globalId ? ` IfcGuid="${escapeXml(component.globalId)}"` : '';
  return `<Component${guid}${extra ? ` ${extra}` : ''} _modelId="${component.modelId}" _expressId="${component.expressId}" />`;
}

function visibilityXml(visibility: VisibilitySnapshot): string {
  const hints = `<ViewSetupHints SpacesVisible="${visibility.viewSetupHints.spacesVisible}" SpaceBoundariesVisible="${visibility.viewSetupHints.spaceBoundariesVisible}" OpeningsVisible="${visibility.viewSetupHints.openingsVisible}" />`;
  const exceptions = visibility.exceptions.map((c) => componentXml(c)).join('');
  return `<Visibility DefaultVisibility="${visibility.defaultVisibility}">${hints}<Exceptions>${exceptions}</Exceptions></Visibility>`;
}

function clippingXml(planes: readonly ClippingPlaneSnapshot[]): string {
  const items = planes
    .map((p) => `<ClippingPlane>${vec('Location', p.location)}${vec('Direction', p.direction)}</ClippingPlane>`)
    .join('');
  return `<ClippingPlanes>${items}</ClippingPlanes>`;
}

/** Produce the `.bcfv` VisualizationInfo XML for a snapshot. */
export function visualizationInfoXml(snapshot: SavedViewSnapshot, guid: string): string {
  const parts: string[] = [`<?xml version="1.0" encoding="UTF-8"?>`, `<VisualizationInfo Guid="${escapeXml(guid)}">`];
  const components: string[] = [];
  if (snapshot.selection && snapshot.selection.length) {
    components.push(`<Selection>${snapshot.selection.map((c) => componentXml(c)).join('')}</Selection>`);
  }
  if (snapshot.visibility) components.push(visibilityXml(snapshot.visibility));
  if (snapshot.coloring && snapshot.coloring.length) {
    const groups = new Map<string, SavedViewComponent[]>();
    for (const entry of snapshot.coloring) {
      const list = groups.get(entry.color) ?? [];
      list.push(entry);
      groups.set(entry.color, list);
    }
    const colorings = [...groups]
      .map(([color, list]) => `<Color Color="${escapeXml(color)}">${list.map((c) => componentXml(c)).join('')}</Color>`)
      .join('');
    components.push(`<Coloring>${colorings}</Coloring>`);
  }
  if (components.length) parts.push(`<Components>${components.join('')}</Components>`);
  if (snapshot.camera) parts.push(cameraXml(snapshot.camera));
  if (snapshot.clippingPlanes && snapshot.clippingPlanes.length) parts.push(clippingXml(snapshot.clippingPlanes));
  parts.push(`</VisualizationInfo>`);
  return parts.join('');
}

function markupXml(view: SavedView, guid: string): string {
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<Markup>`,
    `<Topic Guid="${escapeXml(guid)}"><Title>${escapeXml(view.name)}</Title></Topic>`,
    `<Viewpoints><ViewPoint Guid="${escapeXml(guid)}"><Viewpoint>viewpoint.bcfv</Viewpoint><Snapshot>snapshot.png</Snapshot></ViewPoint></Viewpoints>`,
    `</Markup>`,
  ].join('');
}

function dataUrlToBytes(dataUrl: string): Uint8Array | undefined {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return undefined;
  const base64 = dataUrl.slice(comma + 1);
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return undefined;
  }
}

function bytesToDataUrl(bytes: Uint8Array, mime = 'image/png'): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return `data:${mime};base64,${btoa(binary)}`;
}

const BCF_VERSION_XML = `<?xml version="1.0" encoding="UTF-8"?><Version VersionId="3.0" />`;

/** Export the given views as a BCF-ZIP (3.0) archive. */
export function exportBcfZip(views: readonly SavedView[]): Uint8Array {
  const entries: ZipEntry[] = [{ name: 'bcf.version', data: encodeUtf8(BCF_VERSION_XML) }];
  for (const view of views) {
    const guid = view.id;
    entries.push({ name: `${guid}/markup.bcf`, data: encodeUtf8(markupXml(view, guid)) });
    entries.push({ name: `${guid}/viewpoint.bcfv`, data: encodeUtf8(visualizationInfoXml(view.snapshot, guid)) });
    // A sidecar JSON preserves lossless model-scoped ids and the thumbnail so a
    // round-trip through our own app is exact; other BCF tools ignore it.
    entries.push({ name: `${guid}/_app.json`, data: encodeUtf8(JSON.stringify({ snapshot: view.snapshot, name: view.name, thumbnail: view.thumbnail })) });
    if (view.thumbnail) {
      const bytes = dataUrlToBytes(view.thumbnail);
      if (bytes) entries.push({ name: `${guid}/snapshot.png`, data: bytes });
    }
  }
  return buildZip(entries);
}

/**
 * Import views from a BCF-ZIP archive. Prefers our lossless `_app.json`
 * sidecar when present (exact round-trip); otherwise reads the standard
 * `.bcfv` for cross-tool interop. Unknown files are ignored.
 */
export function importBcfZip(bytes: Uint8Array): readonly SavedView[] {
  const files = readZip(bytes);
  const byGuid = new Map<string, Map<string, Uint8Array>>();
  for (const [name, data] of files) {
    const slash = name.indexOf('/');
    if (slash < 0) continue;
    const guid = name.slice(0, slash);
    const file = name.slice(slash + 1);
    const group = byGuid.get(guid) ?? new Map<string, Uint8Array>();
    group.set(file, data);
    byGuid.set(guid, group);
  }

  const views: SavedView[] = [];
  for (const [, group] of byGuid) {
    const sidecar = group.get('_app.json');
    let snapshot: SavedViewSnapshot | undefined;
    let name = 'Imported view';
    let thumbnail: string | undefined;
    if (sidecar) {
      try {
        const parsed = JSON.parse(new TextDecoder().decode(sidecar)) as {
          snapshot?: SavedViewSnapshot;
          name?: string;
          thumbnail?: string;
        };
        snapshot = parsed.snapshot;
        if (parsed.name) name = parsed.name;
        thumbnail = parsed.thumbnail;
      } catch {
        snapshot = undefined;
      }
    }
    if (!snapshot) {
      const bcfv = group.get('viewpoint.bcfv');
      const markup = group.get('markup.bcf');
      if (bcfv) snapshot = parseVisualizationInfo(new TextDecoder().decode(bcfv));
      if (markup) name = parseTitle(new TextDecoder().decode(markup)) ?? name;
      const png = group.get('snapshot.png');
      if (png) thumbnail = bytesToDataUrl(png);
    }
    if (!snapshot) continue;
    views.push(createSavedView(name, snapshot, { thumbnail }));
  }
  return views;
}

function parseTitle(xml: string): string | undefined {
  const match = /<Title>([\s\S]*?)<\/Title>/.exec(xml);
  return match ? unescapeXml(match[1]) : undefined;
}

function unescapeXml(value: string): string {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&');
}

function parseVec(xml: string, tag: string): Vec3Tuple | undefined {
  const block = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(xml);
  if (!block) return undefined;
  const x = /<X>([-\d.eE+]+)<\/X>/.exec(block[1]);
  const y = /<Y>([-\d.eE+]+)<\/Y>/.exec(block[1]);
  const z = /<Z>([-\d.eE+]+)<\/Z>/.exec(block[1]);
  if (!x || !y || !z) return undefined;
  const values = [Number(x[1]), Number(y[1]), Number(z[1])];
  return values.every(Number.isFinite) ? (values as unknown as Vec3Tuple) : undefined;
}

/** Minimal `.bcfv` parser for cross-tool interop. Model/express ids are not recoverable from pure BCF. */
export function parseVisualizationInfo(xml: string): SavedViewSnapshot | undefined {
  const snapshot: {
    camera?: CameraSnapshot;
    clippingPlanes?: ClippingPlaneSnapshot[];
  } = {};

  const perspective = /<PerspectiveCamera>([\s\S]*?)<\/PerspectiveCamera>/.exec(xml);
  const orthogonal = /<OrthogonalCamera>([\s\S]*?)<\/OrthogonalCamera>/.exec(xml);
  const cameraBlock = perspective ?? orthogonal;
  if (cameraBlock) {
    const position = parseVec(cameraBlock[1], 'CameraViewPoint');
    const direction = parseVec(cameraBlock[1], 'CameraDirection');
    const up = parseVec(cameraBlock[1], 'CameraUpVector');
    if (position && direction && up) {
      const target: Vec3Tuple = [
        position[0] + direction[0],
        position[1] + direction[1],
        position[2] + direction[2],
      ];
      if (perspective) {
        const fov = /<FieldOfView>([-\d.eE+]+)<\/FieldOfView>/.exec(cameraBlock[1]);
        snapshot.camera = { kind: 'perspective', position, target, up, fieldOfView: fov ? Number(fov[1]) : 45 };
      } else {
        const scale = /<ViewToWorldScale>([-\d.eE+]+)<\/ViewToWorldScale>/.exec(cameraBlock[1]);
        snapshot.camera = { kind: 'orthographic', position, target, up, viewToWorldScale: scale ? Number(scale[1]) : 20 };
      }
    }
  }

  const planes: ClippingPlaneSnapshot[] = [];
  const planeRegex = /<ClippingPlane>([\s\S]*?)<\/ClippingPlane>/g;
  let match: RegExpExecArray | null;
  while ((match = planeRegex.exec(xml))) {
    const location = parseVec(match[1], 'Location');
    const direction = parseVec(match[1], 'Direction');
    if (location && direction) planes.push({ location, direction });
  }
  if (planes.length) snapshot.clippingPlanes = planes;

  return snapshot;
}
