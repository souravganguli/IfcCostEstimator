import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const readYaml = (path: string) => parse(readFileSync(new URL(path, import.meta.url), 'utf8'));

describe('default-branch GitHub Pages delivery', () => {
  it('runs the job only for pushes to master', () => {
    const workflow = readYaml('../../.github/workflows/pages.yml');

    expect(workflow.on.push.branches).toEqual(['master']);
    expect(workflow.on.pull_request).toBeUndefined();
    expect(workflow.on.workflow_run).toBeUndefined();
    expect(workflow.jobs.deploy.if).toBe('github.ref_name == github.event.repository.default_branch');
    expect(workflow.jobs.deploy['runs-on']).toBe('ubuntu-latest');
  });

  it('tests with Chrome before deploying the built application', () => {
    const workflow = readYaml('../../.github/workflows/pages.yml');
    const steps = workflow.jobs.deploy.steps;
    const browserTestIndex = steps.findIndex((step: { run?: string }) => step.run?.includes('test:e2e'));
    const unitTestIndex = steps.findIndex((step: { run?: string }) => step.run === 'npm run test');
    const buildIndex = steps.findIndex((step: { run?: string }) => step.run === 'npm run build');
    const uploadIndex = steps.findIndex((step: { uses?: string }) => step.uses === 'actions/upload-pages-artifact@v3');
    const deployIndex = steps.findIndex((step: { uses?: string }) => step.uses === 'actions/deploy-pages@v4');
    const browserProjects = readFileSync(new URL('../playwright.config.ts', import.meta.url), 'utf8')
      .match(/projects:\s*\[([^\]]*)\]/)?.[1] ?? '';

    expect(steps.some((step: { run?: string }) => step.run === 'npx playwright install --with-deps chrome')).toBe(true);
    expect(browserTestIndex).toBeGreaterThan(-1);
    expect(steps.filter((step: { run?: string }) => step.run?.includes('test:e2e'))).toHaveLength(1);
    expect(unitTestIndex).toBeGreaterThan(-1);
    expect(unitTestIndex).toBeLessThan(buildIndex);
    expect(buildIndex).toBeLessThan(browserTestIndex);
    expect(browserTestIndex).toBeLessThan(uploadIndex);
    expect(steps[browserTestIndex].env).toEqual({ TEST_SERVER: 'preview' });
    expect(steps.findIndex((step: { uses?: string }) => step.uses === 'actions/configure-pages@v5')).toBeLessThan(uploadIndex);
    expect(steps[uploadIndex].with.path).toBe('dist');
    expect(deployIndex).toBeGreaterThan(uploadIndex);
    expect(browserProjects).toContain("{ name: 'chrome', use: { channel: 'chrome'");
    expect([...browserProjects.matchAll(/\bname\s*:/g)]).toHaveLength(1);
  });

  it('grants Pages deployment permissions only to the deploy job and verifies the live entry point', () => {
    const workflow = readYaml('../../.github/workflows/pages.yml');
    const job = workflow.jobs.deploy;
    const verify = job.steps.find((step: { name?: string }) => step.name === 'Verify deployed entry point and application asset');

    expect(job.permissions).toMatchObject({ pages: 'write', 'id-token': 'write' });
    expect(job.environment.name).toBe('github-pages');
    expect(verify.env.SITE_URL).toContain('steps.deployment.outputs.page_url');
    expect(verify.run).toContain('application asset');
  });
});
