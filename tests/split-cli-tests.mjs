import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync('tests/cli.test.mjs', 'utf8');
const lines = src.split('\n');

const categoryMap = {
  'init, help, save reject, save accept, load, verify, audit': 'init',
  'init can skip or retarget default skillset install': 'init',
  'init skips human-authored skillset files': 'init',
  'init prepares global git and entry reports detected branch': 'init',
  'init can persist a custom global memory path': 'init',
  'global-only init skips workspace install and saves to global by default': 'init',
  'init does not require a global memory directory': 'init',
  'init can create .agents/.engram as a local submodule': 'init',
  'global remote flag validates URL and save pushes global memory': 'init',
  'normal saves default to both and explicit workspace stays local': 'init',
  'short command aliases dispatch to canonical commands': 'misc',
  'unsupported public flags fail instead of silently degrading': 'misc',
  'all registered commands have topic help entries': 'misc',
  'all registered commands appear in engram -h output': 'misc',
  'clone-memory copies active memories between workspace and global': 'clone',
  'clone-memory metacognize dry-run previews target save plans without writing': 'clone',
  'clone-memory metacognize uses numbered approval and writes selected candidates': 'clone',
  'clone-memory metacognize accept-all pauses when related memories need agent restructuring': 'clone',
  'clone-memory rejects force with metacognize': 'clone',
  'metacognize dry-run emits compact source pack for target memory': 'metacognize',
  'metacognize accept-all writes inline restructure candidate and supports natural wording': 'metacognize',
  'metacognize accept-all pauses when related memories need restructuring': 'metacognize',
  'profiles isolate global memory and support workspace defaults, cross-profile saves, and merge previews': 'profile',
  'profile command reports status, workspace defaults, user defaults, removal, and validation errors': 'profile',
  'profile merge handles unsafe files, invalid memory, force copies, and long dry-run output': 'profile',
  'take-control converts existing workspace guidance through approval': 'take-control',
  'take-control plan supports repeated includes, excludes, and scan limits': 'take-control',
  'take-control accept-all natural wording uses token-light defaults': 'take-control',
  'take-control metacognize accept-all pauses when related memories need agent restructuring': 'take-control',
  'completion emits shell helper with command suggestions': 'completion-help',
  'help rehash shows topic help with alias': 'completion-help',
  'upgrade plan reports quick package update and registered global skillset refresh': 'upgrade',
  'upgrade refreshes generated workspace skillsets': 'upgrade',
  'upgrade creates a machine default profile for legacy global-only installs': 'upgrade',
  'auto-upgrade quietly reconciles initialized roots once after package updates': 'upgrade',
  'auto-upgrade creates a machine default profile for legacy global installs': 'upgrade',
  'auto-upgrade can be skipped for one command': 'upgrade',
  'export, health, search, stats, load dry-run, and conflict dry-run work': 'read-ops',
  'deduplicate semantic reports normalized local duplicate candidates': 'read-ops',
  'load dry-run reports broad-match refinement and --all loads every visible match': 'read-ops',
  'graph routing, observe inbox, archive, and benchmark work': 'read-ops',
  'repair reports invalid memory files skipped by index rebuild': 'read-ops',
  'ignored memory stays hidden from search, export, and stats': 'read-ops',
  'live sync respects enabled flag and writes configured target when enabled': 'read-ops',
  'install-hooks preserves human-authored hooks': 'admin',
  'update-global-folder can retarget config without moving memory': 'admin',
  'update-global-folder moves an old global root into a renamed path': 'admin',
  'update-global-folder refuses to move into a destination with memory files': 'admin',
  'save knowledge without text asks for generated agent knowledge': 'save',
  'save auto-detects rules and workflow candidates': 'save',
  'save stores role metadata for routing': 'save',
  'save can parse agent-brainstormed workflow candidates': 'save',
  'save-session proposes multiple agent-brainstormed memories': 'save',
  'save-session query-level validates integer and expands agent guidance': 'save',
  'save-session can read a transcript file and save selected candidates only': 'save',
  'save-session accept-all writes every transcript candidate without approval prompt': 'save',
  'save-session accept-all saves generated candidates without final approval line': 'save',
  'generated memories use standard markdown spacing and links': 'save',
  'save automatically updates matching memory instead of duplicating it': 'save',
  'save preview marks weak same-type overlap as possible duplicate': 'save',
  'save preview reports related memories for dependency restructuring': 'save',
  'save preview related-memory hints stay scoped to the save target': 'save',
  'save-session preview includes related-memory hints per candidate': 'save',
  'save-session accept-all pauses for dependency restructuring and saves rerun structure': 'save',
  'save-session accept-all pauses on possible duplicate and supports explicit update rerun': 'save',
  'rule variants render the active compact variant': 'save',
  'rehash recomputes hashes for all memory files and fixes mismatches': 'rehash',
  'rehash scopes work individually': 'rehash',
  'natural language rehash normalizes to engram rehash': 'rehash',
  'ignore add and check manage visibility': 'admin',
  'set-role configures developer roles': 'admin',
  'set-read configures read behavior': 'admin',
  'set-rule-variant configures rule strictness': 'admin',
  'set-save-target configures default save scope': 'admin',
  'set-load-limit configures the compact load cap': 'admin',
  'unlink reports skipped when no files exist': 'admin',
};

// Parse test blocks with exact line ranges
const blocks = [];
let current = null;
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/^test\('(.+?)'/);
  if (m) {
    if (current) blocks.push(current);
    current = { name: m[1], start: i, end: -1, category: categoryMap[m[1]] || 'misc' };
  }
}
if (current) current.end = lines.length - 1;
for (const b of blocks) if (b.end === -1) b.end = lines.length - 1;

// Find where tests end and helpers begin (after the last test block)
const firstHelperLine = lines.findIndex((l, idx) => idx > 1880 && (l.startsWith('function testMemory') || l.startsWith('function duplicateFixture')));

// For each block, find its end by looking for the next test() or the helper start
for (let i = 0; i < blocks.length; i++) {
  const nextStart = i < blocks.length - 1 ? blocks[i + 1].start : (firstHelperLine > 0 ? firstHelperLine : lines.length);
  blocks[i].end = nextStart - 1;
  // Trim trailing empty lines
  while (blocks[i].end > blocks[i].start && lines[blocks[i].end].trim() === '') blocks[i].end--;
}

const sharedImports = `import test from 'node:test';
import assert from 'node:assert/strict';
import { rm, writeFile, mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { initGit, runEngram, tempWorkspace, workspaceMemoryRoot } from '../helpers.mjs';
import { testMemory, duplicateFixtureMemory } from './fixtures.mjs';
`;

// Group blocks by category
const groups = {};
for (const b of blocks) {
  (groups[b.category] = groups[b.category] || []).push(b);
}

const outDir = 'tests/cli';
fs.mkdirSync(outDir, { recursive: true });

for (const [cat, catBlocks] of Object.entries(groups)) {
  const testBody = catBlocks.map(b => lines.slice(b.start, b.end + 1).join('\n')).join('\n\n');
  const content = sharedImports + '\n' + testBody + '\n';
  fs.writeFileSync(path.join(outDir, cat + '.test.mjs'), content);
  console.log(cat + '.test.mjs: ' + catBlocks.length + ' tests, ' + content.split('\n').length + ' lines');
}
console.log('Split complete: ' + Object.keys(groups).length + ' files');
