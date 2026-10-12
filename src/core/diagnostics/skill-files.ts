/** Validate every Engram-generated SKILL.md (workspace + global install paths) against the Agent Skills spec. */
import path from 'node:path';
import { generatedSkillPaths } from '../integrations/skillset.js';
import { globalAgentHome } from '../integrations/agent-paths.js';
import { isGenerated, validateSkillFile, type SkillHost, type SkillIssue } from '../integrations/skillset-render.js';
import { readText } from '../system/fsx.js';

export type GeneratedSkillFile = { file: string; host: SkillHost };
export type SkillFileReport = { file: string; issues: SkillIssue[] };

function normalizePath(file: string): string {
  return file.replace(/\\/g, '/');
}

/** Existing Engram-generated SKILL.md files; user-authored skills (no Engram marker) are never listed. */
export async function generatedSkillFiles(cwd: string, home = globalAgentHome()): Promise<GeneratedSkillFile[]> {
  const paths = generatedSkillPaths(home);
  const candidates = [...paths.workspace.map((rel) => path.join(cwd, rel)), ...paths.global];
  const seen = new Set<string>();
  const found: GeneratedSkillFile[] = [];
  for (const file of candidates) {
    const key = path.resolve(file);
    if (seen.has(key)) continue;
    seen.add(key);
    const content = await readText(file);
    if (!content || !isGenerated(content, normalizePath(path.relative(cwd, file)))) continue;
    found.push({ file, host: normalizePath(file).includes('/.claude/skills/') ? 'claude' : 'spec' });
  }
  return found;
}

/** Validate each generated SKILL.md and report the ones with issues, plus how many were checked. */
export async function validateGeneratedSkills(cwd: string, home = globalAgentHome()): Promise<{ checked: number; invalid: SkillFileReport[] }> {
  const files = await generatedSkillFiles(cwd, home);
  const invalid: SkillFileReport[] = [];
  for (const { file, host } of files) {
    const issues = validateSkillFile(host, await readText(file), file);
    if (issues.length) invalid.push({ file, issues });
  }
  return { checked: files.length, invalid };
}
