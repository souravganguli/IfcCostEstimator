import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Enforces the binding Fluent 2 type-ramp policy
// (docs/feature/fluent2-design-system.md requirement 7 and the Design Policy):
// typography must flow through the ramp tokens, never raw px/pt literals. Any
// exception requires human approval recorded in the spec's Recorded Deviations
// table; it is deliberately not whitelisted here so that an unapproved off-ramp
// value fails the build.

const srcRoot = fileURLToPath(new URL('../../src/', import.meta.url));

function cssFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? cssFiles(join(directory, entry.name))
      : entry.name.endsWith('.css')
        ? [join(directory, entry.name)]
        : [],
  );
}

// The ramp tokens themselves are defined once with px literals in fluent2.css;
// that definition block is the single allowed source of raw values.
const tokenDefinition = /--fluent-(font-size|line-height|font-weight)[\w-]*\s*:/;

const files = cssFiles(srcRoot);
const relativeName = (file: string) => relative(srcRoot, file).replaceAll('\\', '/');

describe('Fluent 2 type ramp compliance', () => {
  it('declares the ramp tokens in the shared token layer', () => {
    const tokens = readFileSync(join(srcRoot, 'app/fluent2.css'), 'utf8');
    for (const token of [
      '--fluent-font-size-caption',
      '--fluent-line-height-caption',
      '--fluent-font-size-body',
      '--fluent-line-height-body',
      '--fluent-font-weight-regular',
      '--fluent-font-weight-semibold',
    ]) {
      expect(tokens).toContain(token);
    }
  });

  it('uses ramp tokens for typography, with no raw px/pt font sizes in application CSS', () => {
    const violations: string[] = [];
    for (const file of files) {
      const name = relativeName(file);
      readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
        if (tokenDefinition.test(line)) return; // the token definitions are allowed to carry literals
        const location = `${name}:${index + 1}`;
        if (/font-size\s*:\s*\d/.test(line)) violations.push(`${location} raw font-size: ${line.trim()}`);
        if (/font-weight\s*:\s*\d/.test(line)) violations.push(`${location} raw font-weight: ${line.trim()}`);
        // Numeric line-heights (px or unitless) are off-ramp; tokens use var().
        if (/line-height\s*:\s*[\d.]/.test(line)) violations.push(`${location} raw line-height: ${line.trim()}`);
      });
    }
    expect(violations).toEqual([]);
  });
});
