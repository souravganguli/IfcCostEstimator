import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

export interface Publication {
  branch: string;
  channel: 'production' | 'development';
  directory: string;
  base: string;
}
export interface BuildPlan { branch: string; channel: 'production' | 'development' | 'local-only'; base: string }
interface Deployment extends Publication { sha: string; files: string[] }
interface Manifest { version: 1; deployments: Record<string, Deployment> }

export function publicationPlan(branch: string, repository: string, productionBranch: string): Publication {
  if (!branch || !productionBranch || !/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error('Invalid publishing identity.');
  if (['dev', 'pages-artifacts', 'gh-pages'].includes(productionBranch)) throw new Error('Production must be distinct from development and generated branches.');
  const [owner, name] = repository.split('/');
  const root = name.toLowerCase() === `${owner.toLowerCase()}.github.io` ? '/' : `/${name}/`;
  if (branch === productionBranch) return { branch, channel: 'production', directory: '', base: root };
  if (branch === 'dev') return { branch, channel: 'development', directory: 'dev', base: `${root}dev/` };
  throw new Error('Only development and production branches can be published.');
}

export function buildPlan(branch: string, repository: string, productionBranch: string): BuildPlan {
  const projectBase = publicationPlan(productionBranch, repository, productionBranch).base;
  if (branch !== 'dev' && branch !== productionBranch) return { branch, channel: 'local-only', base: projectBase };
  const publication = publicationPlan(branch, repository, productionBranch);
  return { branch, channel: publication.channel, base: publication.base };
}

function safePath(value: string): boolean {
  return typeof value === 'string' && value !== '' && !value.startsWith('/') && !value.includes('\\') && !value.includes(':') && value.split('/').every((part) => part !== '' && part !== '.' && part !== '..' && !part.startsWith('.git'));
}

function validPublication(publication: Publication): boolean {
  return typeof publication.branch === 'string' && publication.branch.length > 0 && typeof publication.base === 'string' && /^\/(?:[\w.-]+\/)*$/.test(publication.base) && (
    (publication.channel === 'production' && publication.directory === '') ||
    (publication.channel === 'development' && publication.directory === 'dev')
  );
}

function checkSiteLinks(directory: string): void {
  if (!existsSync(directory)) return;
  if (lstatSync(directory).isSymbolicLink()) throw new Error('Symbolic links are not allowed in stored sites.');
  if (lstatSync(directory).isDirectory()) for (const name of readdirSync(directory)) if (name !== '.git') checkSiteLinks(join(directory, name));
}

function applicationFile(file: string): boolean {
  return safePath(file) && (file === 'index.html' || /^assets\/.+\.(?:js|css|wasm|png|jpg|jpeg|svg|webp|ico|woff|woff2|ttf)$/.test(file));
}

function buildFiles(directory: string, current = directory): string[] {
  return readdirSync(current).flatMap((name) => {
    const absolute = join(current, name);
    if (lstatSync(absolute).isSymbolicLink()) throw new Error('Symbolic links are not allowed in site builds.');
    if (lstatSync(absolute).isDirectory()) return buildFiles(directory, absolute);
    const file = relative(directory, absolute).replaceAll('\\', '/');
    if (!applicationFile(file)) {
      throw new Error('Only application build assets may be published.');
    }
    return [file];
  });
}

function readManifest(site: string): Manifest {
  checkSiteLinks(site);
  const path = join(site, '_site.json');
  if (!existsSync(path)) {
    if (existsSync(site) && readdirSync(site).some((name) => name !== '.git')) throw new Error('Existing site must be explicitly seeded with a publishing manifest.');
    return { version: 1, deployments: {} };
  }
  const manifest: Manifest = JSON.parse(readFileSync(path, 'utf8'));
  if (manifest.version !== 1 || !manifest.deployments || typeof manifest.deployments !== 'object') throw new Error('Invalid site manifest.');
  const allowed = new Set(['_site.json', '.nojekyll']);
  for (const [key, deployment] of Object.entries(manifest.deployments)) {
    if (!deployment || !validPublication(deployment) || key !== deployment.directory || !Array.isArray(deployment.files) || !deployment.files.every(applicationFile)) throw new Error('Unsafe deployment manifest.');
    if (key !== '' && key !== 'dev') throw new Error('Unsafe deployment directory.');
    if (key === '' && deployment.files.some((file) => file.startsWith('dev/') || file === '_site.json')) throw new Error('Production manifest overlaps development paths.');
    for (const file of [...deployment.files, '_deployment.json']) allowed.add(key ? `${key}/${file}` : file);
  }
  const checkFiles = (directory: string) => {
    for (const name of readdirSync(directory)) {
      if (directory === site && name === '.git') continue;
      const absolute = join(directory, name);
      if (lstatSync(absolute).isDirectory()) checkFiles(absolute);
      else if (!allowed.has(relative(site, absolute).replaceAll('\\', '/'))) throw new Error('Stored site contains unexpected files.');
    }
  };
  checkFiles(site);
  return manifest;
}

export function updateSite(siteDirectory: string, buildDirectory: string, publication: Publication, sha: string, allowProduction = false): void {
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('A full commit SHA is required.');
  if (publication.channel === 'production' && !allowProduction) throw new Error('Production requires explicit human-approved publication.');
  if (!validPublication(publication)) throw new Error('Invalid publication target.');
  const site = resolve(siteDirectory);
  const build = resolve(buildDirectory);
  const nested = (parent: string, child: string) => {
    const path = relative(parent, child);
    return path === '' || (!isAbsolute(path) && path !== '..' && !path.startsWith(`..${sep}`));
  };
  if (nested(site, build) || nested(build, site)) throw new Error('Build and site must be separate directories.');
  const files = buildFiles(build);
  if (!files.includes('index.html')) throw new Error('Build entrypoint is missing.');
  const manifest = readManifest(site);
  mkdirSync(site, { recursive: true });
  const previous = manifest.deployments[publication.directory];
  for (const file of previous?.files ?? []) rmSync(join(site, publication.directory, file), { force: true });
  const target = join(site, publication.directory);
  for (const file of files) {
    const destination = join(target, file);
    mkdirSync(dirname(destination), { recursive: true });
    cpSync(join(build, file), destination);
  }
  manifest.deployments[publication.directory] = { ...publication, sha, files };
  writeFileSync(join(target, '_deployment.json'), JSON.stringify({ ...publication, sha }, null, 2));
  writeFileSync(join(site, '_site.json'), JSON.stringify(manifest, null, 2));
  writeFileSync(join(site, '.nojekyll'), '');
}

