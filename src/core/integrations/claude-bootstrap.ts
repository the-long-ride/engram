/** Claude Code bootstrap resolution: the AGENTS.md block always, a CLAUDE.md block only where a project CLAUDE.md already exists. */
import path from 'node:path';
import { exists, nearestGitRoot, readText } from '../system/fsx.js';

/** Files Claude Code treats as project CLAUDE.md; any of them makes Claude skip AGENTS.md (code.claude.com/docs/en/memory#agents-md). */
export const CLAUDE_PROJECT_FILES = ['CLAUDE.md', '.claude/CLAUDE.md'];
/** Personal CLAUDE.local.md also hides AGENTS.md; Engram never writes it. */
export const CLAUDE_LOCAL_FILE = 'CLAUDE.local.md';
/** Claude's own guide: the slash skill and an existing CLAUDE.md block point at it. */
export const CLAUDE_GUIDE = '.claude/engram.md';
/** Extra files that prove a workspace was linked for Claude when upgrade scans for linked targets. */
export const CLAUDE_UPGRADE_DETECTION_FILES = ['.claude/CLAUDE.md', CLAUDE_GUIDE];
/** Reported on a CLAUDE.md row: Claude reads CLAUDE.md instead of AGENTS.md, so the block stays and is refreshed. */
export const CLAUDE_BLOCK_KEPT = 'CLAUDE.md block kept (Claude reads CLAUDE.md, not AGENTS.md, when both exist)';

const IMPORTS_AGENTS_MD = /^@AGENTS\.md\b/m;
const FIX_HINT = 'add "@AGENTS.md" to it or set instructionFiles: claude-md-and-agents-md';

/** A non-fatal remark about the Claude bootstrap; the installer reports it as a skipped row. */
export type ClaudeBootstrapNote = { file: string; reason: string };

/**
 * Files that carry the Claude bootstrap block: AGENTS.md, plus the first existing project CLAUDE.md unless it imports
 * AGENTS.md. Notes explain what was left alone (an importing CLAUDE.md, a CLAUDE.local.md or ancestor CLAUDE.md that
 * hides AGENTS.md from Claude).
 */
export async function claudeBootstrapFiles(cwd: string): Promise<{ files: string[]; notes: ClaudeBootstrapNote[] }> {
  const files = ['AGENTS.md'];
  const notes: ClaudeBootstrapNote[] = [];
  let projectFile = '';
  for (const candidate of CLAUDE_PROJECT_FILES) {
    if (await exists(path.join(cwd, candidate))) { projectFile = candidate; break; }
  }
  if (projectFile) {
    if (IMPORTS_AGENTS_MD.test(await readText(path.join(cwd, projectFile)))) {
      notes.push({ file: projectFile, reason: `${projectFile} imports AGENTS.md; left untouched` });
    } else {
      files.push(projectFile);
    }
  } else if (await exists(path.join(cwd, CLAUDE_LOCAL_FILE))) {
    notes.push({ file: CLAUDE_LOCAL_FILE, reason: `${CLAUDE_LOCAL_FILE} present: Claude Code reads it instead of AGENTS.md; ${FIX_HINT}` });
  }
  const ancestor = projectFile ? undefined : await ancestorClaudeFile(cwd);
  if (ancestor) {
    notes.push({ file: ancestor, reason: `${path.basename(ancestor)} present in a parent directory: Claude Code reads it instead of AGENTS.md; ${FIX_HINT}` });
  }
  return { files, notes };
}

/** A CLAUDE.md-family file between the workspace and its git root (exclusive of the workspace); a monorepo root CLAUDE.md hides AGENTS.md too. */
async function ancestorClaudeFile(cwd: string): Promise<string | undefined> {
  const root = await nearestGitRoot(cwd);
  if (!root) return undefined;
  const stop = path.resolve(root);
  let current = path.resolve(cwd);
  while (current !== stop) {
    const parent = path.dirname(current);
    if (parent === current) return undefined;
    current = parent;
    for (const name of [...CLAUDE_PROJECT_FILES, CLAUDE_LOCAL_FILE]) {
      if (await exists(path.join(current, name))) return path.relative(cwd, path.join(current, name)).replace(/\\/g, '/');
    }
  }
  return undefined;
}
