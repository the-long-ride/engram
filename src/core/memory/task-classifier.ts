/** Deterministic task-type classification for Engram routing and save tags. */
export type TaskType =
  | 'analysis'
  | 'accessibility'
  | 'api'
  | 'architecture'
  | 'automation'
  | 'brainstorming'
  | 'cli'
  | 'coding'
  | 'compatibility'
  | 'configuration'
  | 'data'
  | 'database'
  | 'debugging'
  | 'decision'
  | 'deploying'
  | 'designing'
  | 'documenting'
  | 'education'
  | 'integration'
  | 'installation'
  | 'localization'
  | 'maintenance'
  | 'memory'
  | 'migration'
  | 'ops'
  | 'performance'
  | 'planning'
  | 'prompting'
  | 'refactoring'
  | 'release'
  | 'researching'
  | 'reviewing'
  | 'security'
  | 'support'
  | 'testing'
  | 'troubleshooting'
  | 'ui'
  | 'unknown'
  | 'workflow';

export const TASK_TYPES: TaskType[] = [
  'analysis', 'accessibility', 'api', 'architecture', 'automation', 'brainstorming', 'cli', 'coding',
  'compatibility', 'configuration', 'data', 'database', 'debugging', 'decision', 'deploying',
  'designing', 'documenting', 'education', 'integration', 'installation', 'localization',
  'maintenance', 'memory', 'migration', 'ops', 'performance', 'planning', 'prompting',
  'refactoring', 'release', 'researching', 'reviewing', 'security', 'support', 'testing',
  'troubleshooting', 'ui', 'unknown', 'workflow'
];

export type TaskClassification = {
  taskType: TaskType;
  confidence: number;
  aliases: string[];
  loadQuery: string;
  saveTags: string[];
};

const TASK_ALIASES: Record<TaskType, string[]> = {
  analysis: ['analyze', 'analysis', 'metric', 'metrics', 'log analysis', 'behavior analysis', 'root cause analysis'],
  accessibility: ['accessibility', 'a11y', 'inclusive'],
  api: ['api', 'endpoint', 'route', 'contract', 'schema', 'graphql', 'rest', 'webhook'],
  architecture: ['architecture', 'system design', 'module', 'boundary', 'layer', 'service boundary'],
  automation: ['automate', 'automation', 'script', 'bot', 'scheduled job', 'cron', 'pipeline'],
  brainstorming: ['brainstorm', 'ideas', 'ideation', 'explore options', 'generate'],
  cli: ['cli', 'command', 'flag', 'shell', 'terminal', 'argv', 'subcommand'],
  coding: ['code', 'coding', 'implement', 'feature', 'write code', 'build'],
  compatibility: ['compatibility', 'compatible', 'support', 'browser', 'platform', 'node version'],
  configuration: ['config', 'configuration', 'configure', 'settings', 'env', 'environment', 'setup'],
  data: ['data', 'dataset', 'parse', 'transform', 'etl', 'import data'],
  database: ['database', 'db', 'sql', 'query', 'schema', 'migration', 'index'],
  debugging: ['debug', 'debugging', 'bug', 'error', 'fix', 'broken', 'crash', 'exception'],
  decision: ['decide', 'decision', 'choose', 'option', 'tradeoff', 'trade-off'],
  deploying: ['deploy', 'deployment', 'release pipeline', 'ci', 'cd', 'publish'],
  designing: ['design', 'designing', 'ux', 'ui design', 'interaction', 'prototype'],
  documenting: ['document', 'documentation', 'docs', 'readme', 'comment', 'write docs'],
  education: ['teach', 'explain', 'learning', 'lesson', 'tutorial', 'example'],
  integration: ['integrate', 'integration', 'connect', 'mcp', 'third party', 'service integration'],
  installation: ['install', 'installation', 'dependency', 'package install', 'setup'],
  localization: ['localization', 'i18n', 'l10n', 'translation', 'translate', 'locale'],
  maintenance: ['maintain', 'maintenance', 'cleanup', 'dependency update', 'small fix'],
  memory: ['engram', 'memory', 'memories', 'recall', 'routing', 'context'],
  migration: ['migrate', 'migration', 'upgrade framework', 'move data', 'port'],
  ops: ['ops', 'operation', 'infra', 'infrastructure', 'runtime', 'server', 'hosting'],
  performance: ['performance', 'perf', 'slow', 'optimize', 'optimization', 'profile', 'memory leak'],
  planning: ['plan', 'planning', 'roadmap', 'steps', 'breakdown', 'todo'],
  prompting: ['prompt', 'prompting', 'system prompt', 'agent prompt', 'instruction'],
  refactoring: ['refactor', 'refactoring', 'cleanup code', 'restructure code'],
  release: ['release', 'version', 'changelog', 'tag', 'publish'],
  researching: ['research', 'researching', 'investigate', 'compare', 'survey', 'study'],
  reviewing: ['review', 'reviewing', 'pull request', 'pr review', 'code review'],
  security: ['security', 'auth', 'authorization', 'permission', 'vulnerability', 'secret', 'encryption'],
  support: ['support', 'help', 'usage', 'how to', 'question'],
  testing: ['test', 'testing', 'unit test', 'e2e', 'coverage', 'assert'],
  troubleshooting: ['troubleshoot', 'troubleshooting', 'diagnose', 'issue', 'not working'],
  ui: ['ui', 'frontend', 'component', 'layout', 'css', 'style', 'interaction'],
  unknown: [],
  workflow: ['workflow', 'process', 'procedure', 'runbook', 'playbook', 'checklist']
};

const KEYWORD_TASKS: Array<{ taskType: TaskType; words: string[]; confidence: number }> = [
  { taskType: 'debugging', words: ['debug', 'bug', 'error', 'fix', 'broken', 'crash', 'exception'], confidence: 0.9 },
  { taskType: 'troubleshooting', words: ['troubleshoot', 'diagnose', 'issue', 'not working'], confidence: 0.84 },
  { taskType: 'testing', words: ['test', 'unit test', 'e2e', 'coverage', 'assert'], confidence: 0.86 },
  { taskType: 'reviewing', words: ['review', 'pull request', 'pr review', 'code review'], confidence: 0.86 },
  { taskType: 'documenting', words: ['document', 'documentation', 'docs', 'readme', 'comment'], confidence: 0.84 },
  { taskType: 'deploying', words: ['deploy', 'deployment', 'ci/cd', 'publish'], confidence: 0.84 },
  { taskType: 'release', words: ['release', 'version', 'changelog', 'tag'], confidence: 0.86 },
  { taskType: 'security', words: ['security', 'auth', 'authorization', 'permission', 'vulnerability', 'secret', 'encryption'], confidence: 0.86 },
  { taskType: 'performance', words: ['performance', 'slow', 'optimize', 'optimization', 'profile', 'leak'], confidence: 0.84 },
  { taskType: 'migration', words: ['migrate', 'migration', 'upgrade framework', 'port'], confidence: 0.82 },
  { taskType: 'database', words: ['database', 'sql', 'query', 'schema'], confidence: 0.82 },
  { taskType: 'api', words: ['api', 'endpoint', 'graphql', 'rest', 'webhook'], confidence: 0.82 },
  { taskType: 'ui', words: ['ui', 'frontend', 'component', 'css', 'style'], confidence: 0.8 },
  { taskType: 'designing', words: ['design', 'ux', 'interaction', 'prototype'], confidence: 0.78 },
  { taskType: 'architecture', words: ['architecture', 'system design', 'module', 'boundary'], confidence: 0.82 },
  { taskType: 'planning', words: ['plan', 'roadmap', 'steps', 'breakdown', 'todo'], confidence: 0.8 },
  { taskType: 'coding', words: ['code', 'implement', 'feature', 'write code'], confidence: 0.78 },
  { taskType: 'refactoring', words: ['refactor', 'cleanup code', 'restructure code'], confidence: 0.82 },
  { taskType: 'memory', words: ['engram', 'memory', 'memories', 'recall', 'routing', 'context'], confidence: 0.86 },
  { taskType: 'cli', words: ['cli', 'command', 'flag', 'argv', 'subcommand'], confidence: 0.8 },
  { taskType: 'data', words: ['dataset', 'parse', 'transform', 'etl'], confidence: 0.76 },
  { taskType: 'configuration', words: ['config', 'configure', 'settings', 'env', 'environment'], confidence: 0.76 },
  { taskType: 'installation', words: ['install', 'dependency', 'package install'], confidence: 0.76 },
  { taskType: 'ops', words: ['ops', 'infra', 'infrastructure', 'runtime', 'server', 'hosting'], confidence: 0.76 },
  { taskType: 'automation', words: ['automate', 'automation', 'script', 'bot', 'cron'], confidence: 0.76 },
  { taskType: 'integration', words: ['integrate', 'integration', 'connect', 'mcp', 'third party'], confidence: 0.76 },
  { taskType: 'brainstorming', words: ['brainstorm', 'ideas', 'ideation', 'generate'], confidence: 0.74 },
  { taskType: 'decision', words: ['decide', 'decision', 'choose', 'option', 'tradeoff', 'trade-off'], confidence: 0.74 },
  { taskType: 'researching', words: ['research', 'investigate', 'compare', 'survey', 'study'], confidence: 0.74 },
  { taskType: 'prompting', words: ['prompt', 'system prompt', 'agent prompt', 'instruction'], confidence: 0.74 },
  { taskType: 'localization', words: ['localization', 'i18n', 'l10n', 'translation', 'translate', 'locale'], confidence: 0.78 },
  { taskType: 'accessibility', words: ['accessibility', 'a11y', 'inclusive'], confidence: 0.78 },
  { taskType: 'support', words: ['support', 'help', 'usage', 'how to', 'question'], confidence: 0.7 },
  { taskType: 'education', words: ['teach', 'learning', 'lesson', 'tutorial', 'example'], confidence: 0.7 },
  { taskType: 'maintenance', words: ['maintain', 'maintenance', 'cleanup', 'dependency update', 'small fix'], confidence: 0.68 },
  { taskType: 'workflow', words: ['workflow', 'process', 'procedure', 'runbook', 'playbook', 'checklist'], confidence: 0.72 }
];

const TASK_TYPE_ALIASES: Record<string, TaskType> = {
  'task-type': 'unknown',
  task_type: 'unknown',
  tasktype: 'unknown',
  'task type': 'unknown',
  task: 'unknown',
  unknown: 'unknown'
};

for (const taskType of Object.keys(TASK_ALIASES) as TaskType[]) {
  TASK_TYPE_ALIASES[taskType] = taskType;
  for (const alias of TASK_ALIASES[taskType]) TASK_TYPE_ALIASES[alias.toLowerCase()] = taskType;
}

/** Classify text into a stable task type for `engram load` and `task_type:*` save tags. */
export function classifyTaskType(text: string): TaskClassification {
  const normalized = normalizeText(text);
  const explicit = explicitTaskType(normalized);
  if (explicit) return classification(explicit, 1, [explicit]);

  const hits = KEYWORD_TASKS
    .map((item) => ({ ...item, score: keywordScore(normalized, item.words) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.confidence - a.confidence);

  if (!hits.length) return classification('unknown', 0, []);
  const best = hits[0];
  const aliases = TASK_ALIASES[best.taskType].filter((alias) => normalized.includes(normalizeText(alias))).slice(0, 4);
  return classification(best.taskType, Math.min(best.confidence, best.score), aliases);
}

/** Return a CLI-safe task type, accepting aliases and `task_type:<id>`. */
export function normalizeTaskType(value?: string): TaskType {
  if (!value) return 'unknown';
  const clean = value.trim().toLowerCase().replace(/^task[_-]?type[:=]\s*/, '').replace(/^alias:\s*/, '');
  return TASK_TYPE_ALIASES[clean] ?? 'unknown';
}

/** Build save tags from a classified task. */
export function taskTypeSaveTags(classification: TaskClassification): string[] {
  return uniqueStrings([`task_type:${classification.taskType}`, ...classification.aliases.map((alias) => `alias:${alias}`)]);
}

function explicitTaskType(text: string): TaskType | undefined {
  const match = text.match(/\b(?:task[_ -]?type|task type|task)\s*[:=]\s*([a-z-]+)/i);
  if (!match) return undefined;
  return normalizeTaskType(match[1]);
}

function classification(taskType: TaskType, confidence: number, aliases: string[]): TaskClassification {
  return {
    taskType,
    confidence,
    aliases: uniqueStrings(aliases.map((alias) => alias.trim()).filter(Boolean)),
    loadQuery: taskType,
    saveTags: [`task_type:${taskType}`]
  };
}

function keywordScore(text: string, words: string[]): number {
  const hits = words.filter((word) => text.includes(normalizeText(word))).length;
  if (!hits) return 0;
  const phraseHits = words.filter((word) => word.includes(' ')).filter((word) => text.includes(normalizeText(word))).length;
  return Math.min(1, (hits + phraseHits) / Math.max(1, words.length));
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
