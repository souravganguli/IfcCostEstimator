import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../src/', import.meta.url));
function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => entry.isDirectory()
    ? files(join(directory, entry.name)) : entry.name.endsWith('.ts') ? [join(directory, entry.name)] : []);
}
const sourceFiles = files(root);
const imports = (file: string) => ts.preProcessFile(readFileSync(file, 'utf8'), true, true).importedFiles.map((entry) => entry.fileName);
const normalized = (file: string) => relative(root, file).replaceAll('\\', '/');

describe('modular architecture boundaries', () => {
  it('keeps features and core independent of engine adapters and other private feature files', () => {
    const violations: string[] = [];
    for (const file of sourceFiles) {
      const owner = normalized(file);
      for (const specifier of imports(file)) {
        if (!specifier.startsWith('.')) {
          if (owner.startsWith('features/') && ['three', 'web-ifc'].some((dependency) => specifier === dependency || specifier.startsWith(`${dependency}/`))) {
            violations.push(`${owner} imports an engine directly`);
          }
          continue;
        }
        const target = normalized(resolve(dirname(file), specifier));
        if (owner.startsWith('features/') && (target.startsWith('adapters/') || target.startsWith('app/'))) violations.push(`${owner} reaches into ${target}`);
        if (owner.startsWith('core/') && (target.startsWith('features/') || target.startsWith('adapters/'))) violations.push(`${owner} depends on an implementation layer`);
        if (target.startsWith('features/')) {
          const targetFeature = target.split('/')[1];
          const ownerFeature = owner.startsWith('features/') ? owner.split('/')[1] : undefined;
          if (ownerFeature !== targetFeature && target !== `features/${targetFeature}` && target !== `features/${targetFeature}/index`) violations.push(`${owner} bypasses a public feature entrypoint`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('has no circular application-module imports', () => {
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const cycles: string[] = [];
    function visit(file: string): void {
      if (visiting.has(file)) { cycles.push(normalized(file)); return; }
      if (visited.has(file)) return;
      visiting.add(file);
      for (const specifier of imports(file)) {
        if (!specifier.startsWith('.')) continue;
        const target = resolve(dirname(file), specifier);
        const dependency = [`${target}.ts`, join(target, 'index.ts')].find((candidate) => existsSync(candidate));
        if (dependency) visit(dependency);
      }
      visiting.delete(file);
      visited.add(file);
    }
    sourceFiles.forEach(visit);
    expect(cycles).toEqual([]);
  });
});