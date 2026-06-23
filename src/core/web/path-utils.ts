/** Path safety helpers for the local WebUI server. */
import path from 'node:path';

export function isPathInsideRoot(root: string, target: string): boolean {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  const relative = path.relative(resolvedRoot, resolvedTarget);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export function resolveUnderRoot(root: string, requestedPath: string): string {
  if (!root || !String(root).trim()) {
    throw new Error('Allowed root is required');
  }
  if (!requestedPath || !String(requestedPath).trim()) {
    throw new Error('Path is required');
  }

  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.isAbsolute(requestedPath)
    ? path.resolve(requestedPath)
    : path.resolve(resolvedRoot, requestedPath);

  if (!isPathInsideRoot(resolvedRoot, resolvedTarget)) {
    throw new Error(`Path escapes allowed root: ${requestedPath}`);
  }

  return resolvedTarget;
}
