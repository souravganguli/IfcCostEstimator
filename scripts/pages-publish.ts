import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync, appendFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { buildPlan, publicationPlan, updateSite } from './pages.ts';

const repository = process.env.GITHUB_REPOSITORY ?? '';
const productionBranch = process.env.PRODUCTION_BRANCH ?? '';
const event = process.env.GITHUB_EVENT_PATH ? JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')) : {};
const git = (args: string[], cwd = process.cwd()) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const api = (path: string) => JSON.parse(execFileSync('gh', ['api', path], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));

function output(name: string, value: string): void {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

function identity() {
  const runId = String(process.env.BUILD_RUN_ID ?? '');
  if (!/^\d+$/.test(runId)) throw new Error('A successful validation run ID is required.');
  const run = api(`repos/${repository}/actions/runs/${runId}`);
  if (run.conclusion !== 'success' || run.head_repository?.full_name !== repository || run.path !== '.github/workflows/pages.yml' || !['push', 'workflow_dispatch'].includes(run.event)) throw new Error('Only successful same-repository branch validation runs may be published.');
  const plan = publicationPlan(run.head_branch, repository, productionBranch);
  if (process.env.GITHUB_EVENT_NAME === 'workflow_dispatch') {
    if (plan.channel !== 'production' || process.env.GITHUB_REF_NAME !== productionBranch || !String(process.env.BUSINESS_APPROVAL ?? '').trim() || (process.env.GITHUB_ACTOR ?? '').endsWith('[bot]')) throw new Error('Production requires a human dispatch on the production branch with an approval reference.');
    if (api(`repos/${repository}/commits/${encodeURIComponent(productionBranch)}`).sha !== run.head_sha) throw new Error('Production validation must match the current release branch commit.');
    const environment = api(`repos/${repository}/environments/production`);
    if (!environment.protection_rules?.some((rule: { type: string }) => rule.type === 'required_reviewers')) throw new Error('Configure required human reviewers on the production environment before publishing.');
  } else {
    if (plan.channel === 'production' || api(`repos/${repository}/commits/${encodeURIComponent(run.head_branch)}`).sha !== run.head_sha) throw new Error('Automatic publication requires the current nonproduction branch head.');
  }
  return { plan, sha: run.head_sha as string, runId };
}

const command = process.argv[2];
if (command === 'plan') {
  const branch = process.env.SOURCE_BRANCH ?? '';
  const plan = buildPlan(branch, repository, productionBranch);
  output('base', plan.base);
  if (process.env.GITHUB_ENV) appendFileSync(process.env.GITHUB_ENV, `VITE_BASE_PATH=${plan.base}\n`);
  console.log(JSON.stringify(plan));
} else if (command === 'identity') {
  const publication = identity();
  output('run-id', publication.runId);
  output('directory', publication.plan.directory);
} else if (command === 'store') {
  const publication = identity();
  if (publication.plan.channel === 'production' && process.env.GITHUB_EVENT_NAME !== 'workflow_dispatch') throw new Error('Production publication requires a human dispatch.');
  const remoteRef = 'refs/heads/pages-artifacts';
  let published = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    identity();
    const site = resolve(`pages-site-${attempt}`);
    const remote = git(['ls-remote', '--heads', 'origin', remoteRef]);
    if (remote) {
      git(['fetch', '--depth=1', 'origin', `${remoteRef}:refs/remotes/origin/pages-artifacts`]);
      git(['worktree', 'add', '--detach', site, 'refs/remotes/origin/pages-artifacts']);
    } else {
      if (publication.plan.channel !== 'production' && process.env.ALLOW_EMPTY_PRODUCTION !== 'true') throw new Error('Seed the approved production site first, or explicitly authorize an empty production destination.');
      git(['worktree', 'add', '--detach', site]);
      for (const name of readdirSync(site)) if (name !== '.git') rmSync(join(site, name), { recursive: true, force: true });
    }
    if (process.env.ALLOW_EMPTY_PRODUCTION !== 'true' && publication.plan.channel !== 'production') {
      const manifest = join(site, '_site.json');
      if (!existsSync(manifest) || !JSON.parse(readFileSync(manifest, 'utf8')).deployments?.['']) throw new Error('An approved production snapshot must exist before preview publication.');
    }
    updateSite(site, resolve('incoming'), publication.plan, publication.sha, publication.plan.channel === 'production');
    git(['add', '--all'], site);
    if (spawnSync('git', ['diff', '--cached', '--quiet'], { cwd: site }).status === 0) { published = true; break; }
    git(['-c', 'user.name=github-actions[bot]', '-c', 'user.email=41898282+github-actions[bot]@users.noreply.github.com', 'commit', '-m', `Publish ${publication.plan.channel} ${publication.plan.directory || 'root'}`], site);
    const push = spawnSync('git', ['push', 'origin', `HEAD:${remoteRef}`], { cwd: site, encoding: 'utf8' });
    if (push.status === 0) { published = true; break; }
  }
  if (!published) throw new Error('Site-store update conflicted repeatedly; rerun without force-pushing.');
  output('directory', publication.plan.directory);
} else {
  throw new Error('Expected plan, identity, or store command.');
}