/** Config inspection commands: view, set (user-level). */
import path from 'node:path';
import { formatRecords } from '../core/cli/format.js';
import { openConfigDb, ensureSchema } from '../core/config-db/schema.js';
import { writeUserConfig, loadConfig, defaultConfig } from '../core/runtime/config.js';
import type { EngramConfig } from '../core/runtime/types.js';

export async function cmdConfig(args: string[], flags: Record<string, any> = {}): Promise<string> {
  const [rawAction = 'view', ...rest] = args;
  const action = rawAction.toLowerCase();
  if (action === 'view' || action === 'show') return configView();
  if (action === 'set') return configSet(rest, flags);
  throw new Error('config expects view or set');
}

const dynamicImport = new Function('specifier', 'return import(specifier);') as (specifier: string) => Promise<any>;
async function importQueries(): Promise<any> {
  const url = new URL('../core/config-db/queries.js', import.meta.url).href;
  return import(url);
}

async function configView(): Promise<string> {
  const dbh = await openConfigDb();
  if (!dbh) {
    // Fallback: show JSON-only config
    const config = await loadConfig();
    return renderConfig('Config (JSON only — SQLite unavailable)', config);
  }
  try {
    ensureSchema(dbh.db);
    const q = await importQueries();
    const userCfg = q.getUserConfig(dbh.db);
    const profiles = q.listProfiles(dbh.db);
    const activeProfile = profiles.find((p: any) => p.is_active);
    const workspaces = q.listWorkspaces(dbh.db);

    const source = 'SQLite config DB';
    const config = await loadConfig(); // uses DB-first path

    const sections: string[] = [];
    sections.push(renderConfig(`${source} — resolved config`, config));

    // User config section
    if (Object.keys(userCfg).length > 0) {
      const fields: [string, string][] = Object.entries(userCfg)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, String(v)]);
      sections.push(formatRecords('User config (user_config table)', [{ title: '~/.engram/engram.db', fields }]));
    }

    // Profiles section
    if (profiles.length > 0) {
      sections.push(formatRecords('Profiles', profiles.map((p: any) => ({
        title: `${p.name}${p.is_active ? ' (active)' : ''}`,
        fields: [
          ['Global path', p.global_path],
          ['Scope', p.scope],
          ['Created', p.created_at],
          ['Updated', p.updated_at]
        ]
      }))));
    }

    // Workspaces section
    if (workspaces.length > 0) {
      sections.push(formatRecords('Registered workspaces', workspaces.map((ws: any) => ({
        title: `${ws.name || path.basename(ws.path)} ${ws.is_linked ? '[linked]' : ''}`,
        fields: [
          ['Path', ws.path],
          ['Last seen', ws.last_seen],
          ['Created', ws.created_at]
        ]
      }))));
    }

    return sections.join('\n\n');
  } finally {
    dbh.close();
  }
}

async function configSet(args: string[], flags: Record<string, any>): Promise<string> {
  const key = args[0]?.trim().toLowerCase();
  const value = args[1] ?? '';
  if (!key) throw new Error('config set requires <key> <value>');
  const dbh = await openConfigDb();
  if (!dbh) return 'SQLite unavailable; install better-sqlite3 or use Node >=22.5';
  try {
    ensureSchema(dbh.db);
    const q = await importQueries();
    const column = q.configKeyToColumn(key);
    if (!column) throw new Error(`unknown config key: ${key}`);
    q.setUserConfigKey(dbh.db, column, value);
    // Also export JSON snapshot for backward compat
    const config = await loadConfig();
    // Apply dotted key to config object
    applyDottedKey(config as any, column, value);
    await writeUserConfig(config);
    return `User config set: ${column} = ${value}`;
  } finally {
    dbh.close();
  }
}

function applyDottedKey(obj: Record<string, any>, key: string, value: string): void {
  const parts = key.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) current[parts[i]] = {};
    current = current[parts[i]];
  }
  const last = parts[parts.length - 1];
  // Coerce boolean/number for known keys
  const def = defaultConfig();
  const defVal = getDottedDefault(def, key);
  if (typeof defVal === 'boolean') {
    current[last] = value === 'true';
  } else if (typeof defVal === 'number') {
    current[last] = Number(value);
  } else {
    current[last] = value;
  }
}

function getDottedDefault(obj: Record<string, any>, key: string): any {
  const parts = key.split('.');
  let current: any = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return current;
}

function renderConfig(title: string, config: EngramConfig): string {
  const fields: [string, string][] = [
    ['Version', config.version],
    ['Enabled', String(config.enabled)],
    ['Scope', config.scope],
    ['Read', config.read],
    ['Proof', config.proof],
    ['Global path', config.global_path || '<none>'],
    ['Default profile', config.default_profile || '<none>'],
    ['Roles', config.roles.length ? config.roles.join(', ') : '<none>'],
    ['Load limit', String(config.load.limit)],
    ['Graph enabled', String(config.graph.enabled)],
    ['Graph max related', String(config.graph.max_related)],
    ['Graph min score', String(config.graph.min_related_score)],
    ['Vector enabled', String(config.vector.enabled)],
    ['Vector provider', config.vector.provider],
    ['Vector threshold', String(config.vector.auto_threshold)],
    ['Vector candidate pool', String(config.vector.candidate_pool)],
    ['Vector dimensions', String(config.vector.dimensions)],
    ['Rule variants enabled', String(config.rule_variants.enabled)],
    ['Rule variants active', config.rule_variants.active],
    ['Live sync enabled', String(config.live_sync.enabled)],
    ['Pattern mining enabled', String(config.pattern_mining.enabled)],
    ['Pattern mining threshold', String(config.pattern_mining.threshold)],
    ['Pattern mining lookback', String(config.pattern_mining.lookback_sessions)],
    ['PR workflow enabled', String(config.pr_workflow.enabled)],
    ['PR target branch', config.pr_workflow.target_branch],
    ['Encryption enabled', String(config.encryption.enabled)],
    ['Encryption scope', config.encryption.scope],
    ['Encryption key source', config.encryption.key_source],
    ['Global Git enabled', String(config.global_git.enabled)],
    ['Global Git remote', config.global_git.remote],
    ['Global Git branch', config.global_git.branch],
    ['Global Git auto sync', String(config.global_git.auto_sync)],
    ['Global Git auto resolve', String(config.global_git.auto_resolve)]
  ];
  return formatRecords(title, [{ title: 'engram config', fields }]);
}