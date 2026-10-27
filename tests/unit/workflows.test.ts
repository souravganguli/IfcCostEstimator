import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parse } from 'yaml';

vi.mock('node:child_process', async (original) => ({ ...await original<typeof import('node:child_process')>(), execFileSync: vi.fn() }));

const workflow = (name: string) => parse(readFileSync(new URL(`../../.github/workflows/${name}`, import.meta.url), 'utf8'));

describe('trusted publishing identity checks', () => {
  const originalCommand = process.argv[2];
  const sha = 'a'.repeat(40);
  let run: Record<string, unknown>;
  let currentSha: string;
  let reviewers: boolean;
  beforeEach(() => {
    vi.resetModules();
    process.argv[2] = 'identity';
    vi.stubEnv('GITHUB_REPOSITORY', 'owner/repo');
    vi.stubEnv('PRODUCTION_BRANCH', 'master');
    vi.stubEnv('GITHUB_EVENT_PATH', '');
    vi.stubEnv('GITHUB_OUTPUT', '');
    vi.stubEnv('GITHUB_EVENT_NAME', 'workflow_run');
    vi.stubEnv('BUILD_RUN_ID', '42');
    vi.stubEnv('GITHUB_REF_NAME', 'master');
    vi.stubEnv('GITHUB_ACTOR', 'human-reviewer');
    vi.stubEnv('BUSINESS_APPROVAL', 'APPROVAL-123');
    run = { conclusion: 'success', head_repository: { full_name: 'owner/repo' }, path: '.github/workflows/pages.yml', event: 'push', head_branch: 'dev', head_sha: sha };
    currentSha = sha;
    reviewers = true;
    vi.mocked(execFileSync).mockImplementation((program, args) => {
      if (program !== 'gh' || !Array.isArray(args)) throw new Error('Unexpected command in identity test.');
      const endpoint = String(args.at(-1));
      if (endpoint.includes('/actions/runs/')) return JSON.stringify(run);
      if (endpoint.includes('/commits/')) return JSON.stringify({ sha: currentSha });
      if (endpoint.includes('/environments/')) return JSON.stringify({ protection_rules: reviewers ? [{ type: 'required_reviewers' }] : [] });
      throw new Error('Unexpected API endpoint.');
    });
  });
  afterEach(() => { process.argv[2] = originalCommand; vi.unstubAllEnvs(); vi.clearAllMocks(); });

  it('accepts a tested current same-repository development commit', async () => {
    await expect(import('../../scripts/pages-publish')).resolves.toBeDefined();
  });
  it.each([
    { conclusion: 'failure' },
    { head_repository: { full_name: 'fork/repo' } },
    { path: '.github/workflows/untrusted.yml' },
    { event: 'pull_request' },
  ])('rejects untrusted or unsuccessful validation runs: %j', async (changes) => {
    Object.assign(run, changes);
    await expect(import('../../scripts/pages-publish')).rejects.toThrow('Only successful same-repository');
  });
  it('rejects a stale branch build', async () => {
    currentSha = 'b'.repeat(40);
    await expect(import('../../scripts/pages-publish')).rejects.toThrow('current nonproduction branch head');
  });
  it('never promotes production through an automatic run', async () => {
    run.head_branch = 'master';
    await expect(import('../../scripts/pages-publish')).rejects.toThrow('current nonproduction branch head');
  });
  it('requires both human production dispatch and environment reviewers', async () => {
    run.head_branch = 'master';
    vi.stubEnv('GITHUB_EVENT_NAME', 'workflow_dispatch');
    reviewers = false;
    await expect(import('../../scripts/pages-publish')).rejects.toThrow('required human reviewers');
  });
  it.each([['GITHUB_ACTOR', 'release[bot]'], ['BUSINESS_APPROVAL', ''], ['GITHUB_REF_NAME', 'dev']])('rejects production dispatch with invalid %s', async (name, value) => {
    run.head_branch = 'master';
    vi.stubEnv('GITHUB_EVENT_NAME', 'workflow_dispatch');
    vi.stubEnv(name, value);
    await expect(import('../../scripts/pages-publish')).rejects.toThrow('human dispatch');
  });
  it('accepts explicit current production validation with human approval and environment reviewers', async () => {
    run.head_branch = 'master';
    vi.stubEnv('GITHUB_EVENT_NAME', 'workflow_dispatch');
    await expect(import('../../scripts/pages-publish')).resolves.toBeDefined();
  });
});

describe('Pages workflow security and delivery contracts', () => {
  it('tests feature branches and dev-targeted PRs without publishing permissions', () => {
    const build = workflow('pages.yml');
    expect(build.on.push['branches-ignore']).toContain('pages-artifacts');
    expect(build.on.pull_request.branches).toEqual(['dev']);
    expect(build.on.pull_request_target).toBeUndefined();
    expect(build.permissions).toEqual({ contents: 'read' });
    expect(Object.keys(build.jobs)).toEqual(['build']);
    expect(build.jobs.build.steps.find((step: { uses?: string }) => step.uses === 'actions/checkout@v4').with['persist-credentials']).toBe(false);
    expect(build.jobs.build.steps.filter((step: { run?: string }) => step.run?.includes('test:e2e'))).toHaveLength(2);
    expect(build.jobs.build.steps.find((step: { uses?: string }) => step.uses === 'actions/upload-artifact@v4').if).toContain("github.ref_name == 'dev'");
    expect(build.jobs.build.steps.find((step: { uses?: string }) => step.uses === 'actions/upload-artifact@v4').if).toContain("github.event_name == 'workflow_dispatch'");
  });

  it('publishes inert tested artifacts using trusted default-branch code and protected human production dispatch', () => {
    const publish = workflow('pages-publish.yml');
    expect(publish.on.workflow_run.workflows).toEqual(['Validate Pages branch']);
    expect(publish.on.workflow_dispatch.inputs.business_approval.required).toBe(true);
    expect(publish.on.pull_request_target).toBeUndefined();
    const store = publish.jobs.store;
    expect(store.environment).toContain("'production'");
    expect(store.if).toContain("head_repository.full_name == github.repository");
    expect(store.steps.find((step: { uses?: string }) => step.uses === 'actions/checkout@v4').with.ref).toBe('${{ github.event.repository.default_branch }}');
    expect(store.steps.some((step: { run?: string }) => step.run?.includes('npm'))).toBe(false);
    const identity = store.steps.find((step: { id?: string }) => step.id === 'identity');
    const update = store.steps.find((step: { id?: string }) => step.id === 'store');
    expect(update.env).toEqual(identity.env);
    const deploy = publish.jobs.deploy;
    expect(deploy.concurrency).toEqual({ group: 'pages-combined-site', 'cancel-in-progress': false });
    expect(deploy.steps[0].with.ref).toBe('pages-artifacts');
    expect(deploy.steps.find((step: { uses?: string }) => step.uses === 'actions/upload-pages-artifact@v3').with.path).toBe('.');
    expect(publish.on.delete).toBeUndefined();
    expect(publish.on.workflow_run).toBeDefined();
    expect(publish.jobs.store.environment).toContain('development-publication');
    expect(store.if).toContain("head_branch == 'dev'");
  });
});