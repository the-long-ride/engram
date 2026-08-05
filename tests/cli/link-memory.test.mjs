// CLI tests for engram link --parent --children memory bulk-link command.
import test from 'node:test';
import assert from 'node:assert/strict';
import { rm, readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { runEngram, tempWorkspace, workspaceMemoryRoot } from '../helpers.mjs';

async function prepareWorkspace(prefix) {
  const { cwd, env } = await tempWorkspace(prefix);
  await runEngram(cwd, env, ['inject']);
  // Save two child memories (via approved save flow) and one parent memory.
  await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Auth rotation refreshes tokens before expiry.'], 'A\n');
  await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Deploy gate forces a clean test run before release.'], 'A\n');
  await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Release foundation sets the gates every follow-up relies on.'], 'A\n');
  return { cwd, env };
}

async function knowledgeFiles(cwd) {
  const dir = path.join(workspaceMemoryRoot(cwd), 'knowledge');
  return (await readdir(dir)).filter((f) => f.endsWith('.md'));
}

async function readMemoryFrontmatter(cwd, file) {
  const full = path.join(workspaceMemoryRoot(cwd), 'knowledge', file);
  const raw = await readFile(full, 'utf8');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? m[1] : '';
}

test('link --parent --children adds DEPENDS_ON to each child and reports an updated count', async () => {
  const { cwd, env } = await prepareWorkspace('link-memory-happy-');
  try {
    const files = await knowledgeFiles(cwd);
    assert.ok(files.length >= 3, `expected at least 3 memory files, got ${files.length}`);

    // Identify ids by reading each file's frontmatter.
    const ids = await Promise.all(files.map(async (file) => {
      const fm = await readMemoryFrontmatter(cwd, file);
      const idMatch = fm.match(/^id:\s*(.+)$/m);
      return { id: idMatch ? idMatch[1].trim() : '', file };
    }));

    const parent = ids.find((entry) => entry.id.includes('release-foundation'));
    const child1 = ids.find((entry) => entry.id.includes('auth-rotation'));
    const child2 = ids.find((entry) => entry.id.includes('deploy-gate'));
    assert.ok(parent, `parent not found in ${JSON.stringify(ids.map((i) => i.id))}`);
    assert.ok(child1, `child1 not found in ${JSON.stringify(ids.map((i) => i.id))}`);
    assert.ok(child2, `child2 not found in ${JSON.stringify(ids.map((i) => i.id))}`);

    const result = await runEngram(cwd, env, ['link', '--parent', parent.id, '--children', child1.id, '--children', child2.id]);
    assert.equal(result.code, 0, `expected exit 0, got ${result.code}; stderr=${result.stderr}`);

    assert.match(result.stdout, /Updated:\s*2/);
    assert.match(result.stdout, /Skipped:\s*0/);
    assert.match(result.stdout, /Missing:\s*0/);

    const child1Fm = await readMemoryFrontmatter(cwd, child1.file);
    const child2Fm = await readMemoryFrontmatter(cwd, child2.file);
    assert.match(child1Fm, /depends_on:/);
    assert.match(child1Fm, new RegExp(parent.id));
    assert.match(child2Fm, /depends_on:/);
    assert.match(child2Fm, new RegExp(parent.id));
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('link --parent --children is idempotent: reruns report skipped and leave files unchanged', async () => {
  const { cwd, env } = await prepareWorkspace('link-memory-idempotent-');
  try {
    const files = await knowledgeFiles(cwd);
    const ids = await Promise.all(files.map(async (file) => {
      const fm = await readMemoryFrontmatter(cwd, file);
      const idMatch = fm.match(/^id:\s*(.+)$/m);
      return { id: idMatch ? idMatch[1].trim() : '', file };
    }));
    const parent = ids.find((entry) => entry.id.includes('release-foundation'));
    const child1 = ids.find((entry) => entry.id.includes('auth-rotation'));
    assert.ok(parent && child1, `expected parent and child, got ${JSON.stringify(ids.map((i) => i.id))}`);

    const first = await runEngram(cwd, env, ['link', '--parent', parent.id, '--children', child1.id]);
    assert.match(first.stdout, /Updated:\s*1/);

    const second = await runEngram(cwd, env, ['link', '--parent', parent.id, '--children', child1.id]);
    assert.match(second.stdout, /Updated:\s*0/);
    assert.match(second.stdout, /Skipped:\s*1/);
    assert.match(second.stdout, /already declares DEPENDS_ON parent/);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('link --parent --children reports missing for an unknown child id', async () => {
  const { cwd, env } = await prepareWorkspace('link-memory-missing-');
  try {
    const files = await knowledgeFiles(cwd);
    const ids = await Promise.all(files.map(async (file) => {
      const fm = await readMemoryFrontmatter(cwd, file);
      const idMatch = fm.match(/^id:\s*(.+)$/m);
      return { id: idMatch ? idMatch[1].trim() : '', file };
    }));
    const parent = ids.find((entry) => entry.id.includes('release-foundation'));
    assert.ok(parent);

    const result = await runEngram(cwd, env, ['link', '--parent', parent.id, '--children', 'does-not-exist-id']);
    assert.equal(result.code, 0);
    assert.match(result.stdout, /Missing:\s*1/);
    assert.match(result.stdout, /Updated:\s*0/);
    assert.match(result.stdout, /\[!\]\s+does-not-exist-id/);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('link --parent --children errors when --parent is missing', async () => {
  const { cwd, env } = await prepareWorkspace('link-memory-no-parent-');
  try {
    const result = await runEngram(cwd, env, ['link', '--children', 'auth-rotation']);
    assert.match(result.stdout, /Error:.*--parent <id> is required/);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('link --parent --children errors when --children is missing', async () => {
  const { cwd, env } = await prepareWorkspace('link-memory-no-children-');
  try {
    const result = await runEngram(cwd, env, ['link', '--parent', 'release-foundation']);
    assert.match(result.stdout, /Error:.*--children <id> is required/);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
