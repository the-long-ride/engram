/** Shared test fixtures and helpers for CLI tests. */

import os from 'node:os';
import { createHash } from 'node:crypto';

export function testMemory({ id, tags, content }) {
  return `---
id: ${id}
type: knowledge
scope: workspace
tags: [${tags.join(', ')}]
created: 2026-06-05
updated: 2026-06-05
author: test@example.com
source: manual
confidence: high
---

# Knowledge: ${id}

## Context

Test memory fixture.

## Content

- ${content}

## Example

Use this memory when a future task touches: ${tags.slice(0, 3).join(', ')}.
`;
}

export function duplicateFixtureMemory({ id, content }) {
  const filler = Array.from({ length: 160 }, (_, index) => `unrelated-${index}`).join(' ');
  return `---
id: ${id}
type: knowledge
scope: workspace
tags: [invoice, retry, backoff]
created: 2026-06-05
updated: 2026-06-05
author: test@example.com
source: manual
confidence: high
---

# Knowledge: ${id}

## Context

Test memory fixture.

## Content

- ${content}
- ${filler}

## Example

Use this memory when validating save duplicate hints.
`;
}

export function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

export function machineProfileName() {
  return (process.env.COMPUTERNAME || process.env.HOSTNAME || os.hostname() || process.env.USERNAME || process.env.USER || 'default')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^[^a-zA-Z0-9]+/g, '')
    .replace(/[^a-zA-Z0-9]+$/g, '')
    .slice(0, 64) || 'default';
}

export async function packageVersion() {
  const { readFile } = await import('node:fs/promises');
  return JSON.parse(await readFile('package.json', 'utf8')).version;
}

export function profileMemoryRaw(id, content) {
  return `---
id: ${id}
type: knowledge
scope: global
tags: [profile, merge]
created: 2026-06-09
updated: 2026-06-09
author: test@example.com
source: manual
confidence: high
---

# Knowledge: ${id}

## Context

Profile merge test fixture.

## Content

- ${content}

## Example

Use this memory when validating profile merge behavior.
`;
}

export function invalidProfileMemoryRaw(id) {
  return `---
id: ${id}
type: knowledge
scope: global
tags: [profile, merge]
created: 2026-06-09
updated: 2026-06-09
author: test@example.com
source: manual
confidence: high
---

# Knowledge: ${id}

## Context
This heading is intentionally missing a blank line after the heading.

## Content

- Invalid fixture.

## Example

Use this memory when validating profile merge errors.
`;
}

export async function writeProfileMemory(root, rel, raw) {
  const { mkdir, readFile, writeFile } = await import('node:fs/promises');
  const path = await import('node:path');
  const file = path.join(root, rel);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, raw);
  const hashesPath = path.join(root, 'memory.hashes.json');
  const hashes = JSON.parse(await readFile(hashesPath, 'utf8'));
  hashes[rel] = sha256(raw);
  await writeFile(hashesPath, `${JSON.stringify(hashes, null, 2)}\n`);
}
