import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildPlan, publicationPlan, updateSite } from '../../scripts/pages';

const temporary: string[] = [];
const sha = 'a'.repeat(40);
function setup() {
  const root = mkdtempSync(join(tmpdir(), 'ifc-pages-'));
  temporary.push(root);
  const build = join(root, 'build');
  const site = join(root, 'site');
  mkdirSync(join(build, 'assets'), { recursive: true });
  writeFileSync(join(build, 'index.html'), 'approved build');
  writeFileSync(join(build, 'assets/app.js'), 'application');
  return { root, build, site };
}
afterEach(() => temporary.splice(0).forEach((path) => rmSync(path, { recursive: true, force: true })));

describe('shared GitHub Pages subpath publication', () => {
  it('creates only production and dev paths and rejects feature publication', () => {
    expect(publicationPlan('dev', 'owner/IfcCostEstimator', 'master').base).toBe('/IfcCostEstimator/dev/');
    expect(publicationPlan('master', 'owner/IfcCostEstimator', 'master').directory).toBe('');
    expect(publicationPlan('dev', 'owner/owner.github.io', 'master').base).toBe('/dev/');
    expect(() => publicationPlan('dev', 'owner/repo', 'dev')).toThrow('distinct from development');
    expect(() => publicationPlan('feature/a-b', 'owner/repo', 'master')).toThrow('Only development and production');
    expect(() => publicationPlan('pages-artifacts', 'owner/repo', 'master')).toThrow('Only development and production');
    expect(buildPlan('feature/a-b', 'owner/repo', 'master')).toEqual({ branch: 'feature/a-b', channel: 'local-only', base: '/repo/' });
    expect(buildPlan('dev', 'owner/repo', 'master').base).toBe('/repo/dev/');
  });

  it('preserves production bytes when updating dev', () => {
    const { build, site } = setup();
    const production = publicationPlan('master', 'owner/repo', 'master');
    expect(() => updateSite(site, build, production, sha)).toThrow('human-approved');
    updateSite(site, build, production, sha, true);
    writeFileSync(join(build, 'index.html'), 'review build');
    updateSite(site, build, publicationPlan('dev', 'owner/repo', 'master'), sha);
    expect(readFileSync(join(site, 'index.html'), 'utf8')).toBe('approved build');
    expect(readFileSync(join(site, 'dev', 'index.html'), 'utf8')).toBe('review build');
    expect(readFileSync(join(site, 'index.html'), 'utf8')).toBe('approved build');
  });

  it('rejects model files, unseeded legacy sites, and unsafe manifests before overwriting content', () => {
    const { build, site } = setup();
    const dev = publicationPlan('dev', 'owner/repo', 'master');
    writeFileSync(join(build, 'private.ifc'), 'not publishable');
    expect(() => updateSite(site, build, dev, sha)).toThrow('Only application');
    rmSync(join(build, 'private.ifc'));
    mkdirSync(site);
    writeFileSync(join(site, 'index.html'), 'legacy production');
    expect(() => updateSite(site, build, dev, sha)).toThrow('explicitly seeded');
    writeFileSync(join(site, '_site.json'), JSON.stringify({ version: 1, deployments: { '../': { directory: '../', files: ['../outside'] } } }));
    expect(() => updateSite(site, build, dev, sha)).toThrow('Unsafe');
    expect(readFileSync(join(site, 'index.html'), 'utf8')).toBe('legacy production');
  });

  it('refuses private or untracked content in a previously stored site', () => {
    const { build, site } = setup();
    const dev = publicationPlan('dev', 'owner/repo', 'master');
    updateSite(site, build, dev, sha);
    writeFileSync(join(site, 'private.ifc'), 'must never be published');
    expect(() => updateSite(site, build, dev, sha)).toThrow('unexpected files');
  });

  it('rejects overlapping build directories and forged cleanup targets on Windows and POSIX', () => {
    const { build, site } = setup();
    const dev = publicationPlan('dev', 'owner/repo', 'master');
    expect(() => updateSite(join(build, 'nested'), build, dev, sha)).toThrow('separate directories');
    expect(() => updateSite(join(build, '..nested'), build, dev, sha)).toThrow('separate directories');
    expect(() => updateSite(build, join(build, 'nested'), dev, sha)).toThrow('separate directories');
    updateSite(site, build, dev, sha);
    const manifest = JSON.parse(readFileSync(join(site, '_site.json'), 'utf8'));
    manifest.deployments[dev.directory].files = ['C:/outside'];
    writeFileSync(join(site, '_site.json'), JSON.stringify(manifest));
    expect(() => updateSite(site, build, dev, sha)).toThrow('Unsafe');
  });
});