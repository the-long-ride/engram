/** D9 prompt-path anchors: file paths named in a query that can match a memory's `applies_to` globs. */
import { matchPattern } from '../safety/ignore.js';

/** `bare` paths are a lone file name (`Foo.cs`) with no directory part. */
export type QueryPath = { path: string; bare: boolean };

/** A file name: a stem, then a lowercase extension that starts with a letter (`users.ts`, not `ASP.NET`). */
const FILE_NAME = /^[\w@.-]*[\w@-]\.[a-z][a-z0-9]{0,7}$/;
const PATH_SEGMENT = /^[\w@.-]+$/;
/** A path without a file name needs this many segments, so prose such as `and/or` or `TCP/IP` is not a path. */
const MIN_DIRECTORY_SEGMENTS = 3;

/** Path-like query tokens. URLs and prose with slashes or dots (`e.g.`, `I/O`, `Node.js`) are not paths. */
export function queryPaths(query: string): QueryPath[] {
  const out = new Map<string, QueryPath>();
  for (const raw of query.split(/\s+/)) {
    const token = raw.replace(/^["'`([<]+|["'`)\]>,;:!?.]+$/g, '').replace(/\\/g, '/').replace(/^(?:\.\/)+/, '');
    if (!token || token.includes('://')) continue;
    const segments = token.split('/').filter(Boolean);
    if (!segments.length || !segments.every((segment) => PATH_SEGMENT.test(segment))) continue;
    const named = FILE_NAME.test(segments[segments.length - 1]);
    if (segments.length === 1 ? named : named || segments.length >= MIN_DIRECTORY_SEGMENTS) {
      out.set(token, { path: segments.join('/'), bare: segments.length === 1 });
    }
  }
  return [...out.values()];
}

/**
 * True when a query path falls inside one of the entry's `applies_to` globs. Universal globs made only of
 * `*`, `/`, and `.` never count, and a bare file name only counts against a glob whose last segment names
 * that file, so `Node.js` does not anchor every memory scoped to all `.js` files.
 */
export function pathAnchorHit(paths: QueryPath[], globs: string[] = []): boolean {
  if (!paths.length) return false;
  return globs.some((glob) => !isUniversalGlob(glob)
    && paths.some((item) => (!item.bare || namesFile(glob)) && matchPattern(item.path, glob)));
}

function isUniversalGlob(glob: string): boolean {
  return /^[*/.]*$/.test(glob.trim().replace(/\\/g, '/'));
}

function namesFile(glob: string): boolean {
  const last = glob.replace(/\\/g, '/').split('/').filter(Boolean).pop() ?? '';
  return Boolean(last) && !/[*?]/.test(last);
}
