export function deploymentBase(value: string): string {
  if (!value.startsWith('/') || value.startsWith('//') || /[?#\\]/.test(value)) {
    throw new Error('Deployment base must be an absolute same-origin path.');
  }
  return value.endsWith('/') ? value : `${value}/`;
}