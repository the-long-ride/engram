/** Shared schema for control-panel config fields and risk classification. */
import { homedir } from 'node:os';
import { existsSync, accessSync, constants as fsConstants } from 'node:fs';
import path from 'node:path';
import { isValidGitRemoteUrl } from '../vcs/git.js';

export type ConfigInputType = 'toggle' | 'select' | 'number' | 'text' | 'roles';
export type ConfigRisk = 'normal' | 'risky';

export type ConfigFieldDef = {
  key: string;
  group: string;
  label: string;
  input: ConfigInputType;
  description?: string;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  risk?: ConfigRisk;
  hidden?: boolean;
};

export type ConfigValidationIssue = {
  key: string;
  message: string;
  value: string;
};

export type ConfigPatchValidation = {
  ok: boolean;
  patch: Record<string, string>;
  issues: ConfigValidationIssue[];
  riskyKeys: string[];
};

export const CONFIG_FIELDS: ConfigFieldDef[] = [
  { key: 'enabled', group: 'Core', label: 'Enabled', input: 'toggle', description: 'Enable or disable Engram entirely', risk: 'risky' },
  { key: 'scope', group: 'Core', label: 'Save Target', input: 'select', options: ['workspace', 'global', 'both'], description: 'Default scope for save commands', risk: 'risky' },
  { key: 'read', group: 'Core', label: 'Read Mode', input: 'select', options: ['auto', 'startup', 'always', 'manual', 'off'], description: 'When agent hooks inject memory context' },
  { key: 'proof', group: 'Core', label: 'Proof Mode', input: 'select', options: ['off', 'compact'], description: 'Whether hooks append an Engram proof line' },
  { key: 'global_path', group: 'Core', label: 'Global Memory Path', input: 'text', description: 'Filesystem path to the global memory folder', risk: 'risky' },
  { key: 'default_profile', group: 'Core', label: 'Default Profile', input: 'select', description: 'Profile name used when none is explicitly set', risk: 'risky' },
  { key: 'roles', group: 'Core', label: 'Active Roles', input: 'roles', description: 'Comma-separated role names for memory context routing' },
  { key: 'theme', group: 'Core', label: 'Theme', input: 'select', options: ['dark', 'light'], hidden: true },

  { key: 'load.limit', group: 'Load Routing', label: 'Load Limit', input: 'number', min: 1, max: 32, description: 'Max memories returned by normal load' },

  { key: 'memory.rule_line_target', group: 'Memory Limits', label: 'Rule Line Target', input: 'number', min: 50, max: 200, step: 10, description: 'Recommended line count target for rule memories (min 50, max 200)' },
  { key: 'memory.rule_line_hard_limit', group: 'Memory Limits', label: 'Rule Line Hard Limit', input: 'number', min: 50, max: 200, step: 10, description: 'Maximum allowed line count for rule memories (min 50, max 200)', risk: 'risky' },

  { key: 'graph.enabled', group: 'Graph', label: 'Enabled', input: 'toggle' },
  { key: 'graph.max_related', group: 'Graph', label: 'Max Related', input: 'number', min: 1, max: 20 },
  { key: 'graph.min_related_score', group: 'Graph', label: 'Min Score', input: 'number', min: 0, max: 1, step: 0.01, description: 'Minimum similarity score for graph edges' },

  { key: 'vector.enabled', group: 'Vector Search', label: 'Enabled', input: 'toggle' },
  { key: 'vector.auto_threshold', group: 'Vector Search', label: 'Auto Threshold', input: 'number', min: 10, max: 1000, description: 'Memory count at which vector search activates' },
  { key: 'vector.candidate_pool', group: 'Vector Search', label: 'Candidate Pool', input: 'number', min: 8, max: 100 },
  { key: 'vector.dimensions', group: 'Vector Search', label: 'Dimensions', input: 'number', min: 16, max: 512 },

  { key: 'rule_variants.enabled', group: 'Rule Variants', label: 'Enabled', input: 'toggle' },
  { key: 'rule_variants.active', group: 'Rule Variants', label: 'Active Variant', input: 'select', options: ['light', 'balanced', 'strict'] },

  { key: 'live_sync.enabled', group: 'Live Sync', label: 'Enabled', input: 'toggle', description: 'Sync generated agent context files on save' },

  { key: 'global_git.enabled', group: 'Global Git', label: 'Enabled', input: 'toggle', risk: 'risky' },
  { key: 'global_git.remote', group: 'Global Git', label: 'Remote', input: 'text', risk: 'risky' },
  { key: 'global_git.remote_url', group: 'Global Git', label: 'Remote URL', input: 'text', risk: 'risky', description: 'Git remote URL for shared global memory' },
  { key: 'global_git.branch', group: 'Global Git', label: 'Branch', input: 'text', risk: 'risky' },
  { key: 'global_git.auto_sync', group: 'Global Git', label: 'Auto Sync', input: 'toggle', risk: 'risky' },
  { key: 'global_git.auto_resolve', group: 'Global Git', label: 'Auto Resolve', input: 'toggle', risk: 'risky' },

  { key: 'pattern_mining.enabled', group: 'Pattern Mining', label: 'Enabled', input: 'toggle' },
  { key: 'pattern_mining.threshold', group: 'Pattern Mining', label: 'Threshold', input: 'number', min: 1, max: 20 },
  { key: 'pattern_mining.lookback_sessions', group: 'Pattern Mining', label: 'Lookback Sessions', input: 'number', min: 1, max: 100 },

  { key: 'pr_workflow.enabled', group: 'PR Workflow', label: 'Enabled', input: 'toggle', risk: 'risky' },
  { key: 'pr_workflow.target_branch', group: 'PR Workflow', label: 'Target Branch', input: 'text', risk: 'risky' },

  { key: 'encryption.enabled', group: 'Encryption', label: 'Enabled', input: 'toggle', risk: 'risky' },
  { key: 'encryption.scope', group: 'Encryption', label: 'Scope', input: 'select', options: ['workspace', 'global'], risk: 'risky' },
  { key: 'encryption.key_source', group: 'Encryption', label: 'Key Source', input: 'select', options: ['portable-file'], risk: 'risky' }
];

const FIELD_BY_KEY = new Map(CONFIG_FIELDS.map((field) => [field.key, field]));

export function configFieldsForPanel(): ConfigFieldDef[] {
  return CONFIG_FIELDS.filter((field) => !field.hidden).map((field) => ({ ...field }));
}

export function isKnownConfigKey(key: string): boolean {
  return FIELD_BY_KEY.has(cleanKey(key));
}

export function isRiskyConfigKey(key: string): boolean {
  return FIELD_BY_KEY.get(cleanKey(key))?.risk === 'risky';
}

export function validateConfigPatch(input: unknown): ConfigPatchValidation {
  const issues: ConfigValidationIssue[] = [];
  const patch: Record<string, string> = {};

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return issueOnly('', 'Config patch must be an object', String(input ?? ''));
  }

  for (const [rawKey, rawValue] of Object.entries(input as Record<string, unknown>)) {
    const key = cleanKey(rawKey);
    const field = FIELD_BY_KEY.get(key);
    const value = stringifyValue(rawValue);

    if (!field) {
      issues.push({ key, value, message: `Unknown config key: ${key}` });
      continue;
    }

    const normalized = normalizeConfigValue(field, rawValue);
    if (normalized.ok) patch[key] = normalized.value;
    else issues.push({ key, value, message: normalized.message });
  }

  if (!Object.keys(input as Record<string, unknown>).length) {
    issues.push({ key: '', value: '', message: 'Config patch must include at least one setting' });
  }

  if (issues.length) return { ok: false, patch: {}, issues, riskyKeys: [] };
  const riskyKeys = Object.keys(patch).filter(isRiskyConfigKey);
  return { ok: true, patch, issues: [], riskyKeys };
}

function normalizeConfigValue(field: ConfigFieldDef, rawValue: unknown): { ok: true; value: string } | { ok: false; message: string } {
  if (field.input === 'toggle') {
    if (rawValue === true || rawValue === 'true') return { ok: true, value: 'true' };
    if (rawValue === false || rawValue === 'false') return { ok: true, value: 'false' };
    return { ok: false, message: `${field.key} must be true or false` };
  }

  if (field.input === 'select') {
    const value = stringifyValue(rawValue).trim();
    if (field.key === 'default_profile') {
      return validateTextField(field.key, value);
    }
    if (field.options?.includes(value)) return { ok: true, value };
    return { ok: false, message: `${field.key} must be one of: ${(field.options ?? []).join(', ')}` };
  }

  if (field.input === 'number') {
    const raw = stringifyValue(rawValue).trim();
    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) return { ok: false, message: `${field.key} must be a number` };
    if ((field.step ?? 1) >= 1 && !Number.isInteger(numeric)) return { ok: false, message: `${field.key} must be an integer` };
    if (field.min !== undefined && numeric < field.min) return { ok: false, message: `${field.key} must be at least ${field.min}` };
    if (field.max !== undefined && numeric > field.max) return { ok: false, message: `${field.key} must be at most ${field.max}` };
    return { ok: true, value: String(numeric) };
  }

  if (field.input === 'roles') return normalizeRoles(rawValue);

  const value = stringifyValue(rawValue).trim();
  return validateTextField(field.key, value);
}

function normalizeRoles(rawValue: unknown): { ok: true; value: string } | { ok: false; message: string } {
  const rawRoles = Array.isArray(rawValue)
    ? rawValue.map((item) => stringifyValue(item))
    : stringifyValue(rawValue).trim() === ''
      ? []
      : stringifyValue(rawValue).split(',');
  const roles = rawRoles.map((role) => role.trim());
  if (roles.some((role) => !role)) {
    return { ok: false, message: 'roles cannot contain empty role names' };
  }
  const bad = roles.find((role) => !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(role));
  if (bad) return { ok: false, message: `roles contains invalid role name: ${bad}` };
  return { ok: true, value: JSON.stringify(roles) };
}



function canCreateDir(pathStr: string): boolean {
  try {
    // Walk up to the nearest existing ancestor and verify write permission.
    let current = path.resolve(pathStr);
    while (true) {
      if (existsSync(current)) {
        try {
          accessSync(current, fsConstants.W_OK);
          return true;
        } catch {
          return false; // ancestor exists but is not writable
        }
      }
      const parent = path.dirname(current);
      if (parent === current) return false; // reached filesystem root without a writable ancestor
      current = parent;
    }
  } catch {
    return false;
  }
}

function validateTextField(key: string, value: string): { ok: true; value: string } | { ok: false; message: string } {
  if (key === 'default_profile' && value && !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(value)) {
    return { ok: false, message: 'default_profile must use letters, numbers, dot, underscore, or hyphen' };
  }
  if (key === 'global_path' && value) {
    let resolved = value;
    if (value.startsWith('~')) {
      resolved = value.replace(/^~/, homedir());
    }
    if (!canCreateDir(resolved)) {
      return { ok: false, message: `Failed to validate Global Memory Path: '${value}' is uncreatable or has no write permissions` };
    }
  }
  if ((key === 'global_git.remote' || key.endsWith('.branch')) && value && /\s/.test(value)) {
    return { ok: false, message: `${key} cannot contain whitespace` };
  }
  if (key === 'global_git.remote_url' && value) {
    if (!isValidGitRemoteUrl(value)) {
      return { ok: false, message: 'global_git.remote_url must be a valid Git remote URL' };
    }
  }
  return { ok: true, value };
}

function issueOnly(key: string, message: string, value: string): ConfigPatchValidation {
  return { ok: false, patch: {}, issues: [{ key, message, value }], riskyKeys: [] };
}

function cleanKey(key: string): string {
  return String(key ?? '').trim().toLowerCase();
}

function stringifyValue(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  return JSON.stringify(value);
}
