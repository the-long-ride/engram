/** Deterministic task-intent extraction for enriched routing in compact default loads. */
import { meaningfulWords } from '../system/text.js';

export type TaskIntent = {
  original: string;
  normalized: string;
  domains: string[];
  workKinds: string[];
  artifacts: string[];
  technologies: string[];
  styles: string[];
  constraints: string[];
  retrievalTerms: string[];
  confidence: 'low' | 'medium' | 'high';
};

// ── Domain keyword maps ────────────────────────────────────────────────

const DOMAIN_SIGNALS: Record<string, string[]> = {
  frontend: ['form', 'page', 'component', 'responsive', 'tailwind', 'react', 'css', 'html', 'vue', 'angular', 'svelte', 'button', 'modal', 'dialog', 'dropdown', 'sidebar', 'navbar', 'layout', 'viewport', 'animation', 'transition'],
  ui: ['ui', 'user interface', 'ux', 'interaction', 'design system', 'theme', 'glassmorphism', 'neumorphism', 'material', 'skeuomorphic'],
  backend: ['api', 'endpoint', 'server', 'middleware', 'controller', 'handler', 'route', 'rest', 'graphql'],
  database: ['db', 'database', 'sql', 'query', 'schema', 'migration', 'index', 'orm', 'prisma', 'drizzle'],
  auth: ['auth', 'login', 'signup', 'register', 'password', 'token', 'jwt', 'session', 'oauth', 'sso', 'credential'],
  ai_agent: ['agent', 'skill', 'mcp', 'tool', 'prompt', 'workflow', 'memory', 'rag', 'llm', 'chatbot', 'assistant'],
  devops: ['deploy', 'ci', 'cd', 'pipeline', 'docker', 'kubernetes', 'infra', 'terraform', 'cloud'],
  testing: ['test', 'bug', 'fix', 'error', 'failing', 'regression', 'spec', 'assert', 'mock', 'stub', 'coverage'],
  docs: ['docs', 'readme', 'spec', 'proposal', 'documentation', 'guide', 'tutorial'],
  security: ['security', 'vulnerability', 'encryption', 'csrf', 'xss', 'injection', 'sanitize'],
  accessibility: ['accessibility', 'a11y', 'aria', 'screen reader', 'contrast', 'focus', 'keyboard']
};

const WORK_KIND_SIGNALS: Record<string, string[]> = {
  implementation: ['create', 'build', 'implement', 'add', 'make', 'write', 'setup', 'set up', 'develop', 'construct'],
  debugging: ['debug', 'fix', 'repair', 'troubleshoot', 'diagnose', 'resolve', 'solve'],
  refactoring: ['refactor', 'restructure', 'reorganize', 'clean up', 'cleanup', 'simplify', 'optimize'],
  reviewing: ['review', 'audit', 'inspect', 'check', 'analyze', 'evaluate'],
  planning: ['plan', 'design', 'architect', 'brainstorm', 'explore', 'propose', 'decide'],
  documenting: ['document', 'describe', 'explain', 'comment', 'annotate'],
  testing: ['test', 'verify', 'validate', 'assert', 'benchmark'],
  migrating: ['migrate', 'upgrade', 'port', 'move', 'convert']
};

const ARTIFACT_SIGNALS: Record<string, string[]> = {
  form: ['form', 'input', 'field', 'login form', 'signup form', 'search form', 'checkout'],
  page: ['page', 'screen', 'view', 'landing', 'dashboard', 'profile', 'settings'],
  api: ['api', 'endpoint', 'route', 'handler', 'controller', 'service'],
  component: ['component', 'widget', 'module', 'section', 'card', 'panel'],
  workflow: ['workflow', 'pipeline', 'process', 'runbook', 'playbook', 'checklist'],
  data_model: ['model', 'schema', 'entity', 'table', 'collection', 'document'],
  config: ['config', 'settings', 'env', 'preference', 'option']
};

const TECHNOLOGY_SIGNALS: Record<string, string[]> = {
  react: ['react', 'jsx', 'tsx', 'nextjs', 'next.js', 'gatsby'],
  vue: ['vue', 'nuxt', 'vuex', 'pinia'],
  angular: ['angular', 'rxjs', 'ngrx'],
  svelte: ['svelte', 'sveltekit'],
  css: ['css', 'scss', 'sass', 'less', 'styled', 'tailwind', 'bootstrap', 'chakra', 'emotion'],
  typescript: ['typescript', 'ts', 'tsx'],
  node: ['node', 'express', 'fastify', 'nestjs', 'koa'],
  python: ['python', 'django', 'flask', 'fastapi'],
  rust: ['rust', 'cargo', 'tokio'],
  go: ['go', 'golang', 'gin'],
  database: ['postgres', 'mysql', 'mongodb', 'redis', 'sqlite', 'dynamodb', 'supabase', 'firebase'],
  testing: ['jest', 'vitest', 'mocha', 'cypress', 'playwright', 'pytest'],
  bundler: ['webpack', 'vite', 'esbuild', 'rollup', 'parcel', 'turbo']
};

const STYLE_SIGNALS: Record<string, string[]> = {
  glassmorphism: ['glass', 'glassmorphism', 'frosted', 'blur backdrop', 'glass effect'],
  neumorphism: ['neumorphism', 'neomorphic', 'soft ui', 'emboss'],
  minimalist: ['minimal', 'clean', 'sparse', 'simple design'],
  dark_mode: ['dark mode', 'dark theme', 'night mode'],
  responsive: ['responsive', 'mobile-first', 'adaptive', 'breakpoint'],
  animated: ['animated', 'animation', 'motion', 'transition', 'gsap', 'framer']
};

const CONSTRAINT_SIGNALS: Record<string, string[]> = {
  accessibility: ['accessible', 'a11y', 'wcag', 'aria', 'screen reader', 'keyboard', 'contrast', 'focus visible'],
  performance: ['fast', 'performant', 'lazy', 'optimiz', 'bundle size', 'load time'],
  security: ['secure', 'sanitiz', 'encrypt', 'auth', 'protect', 'guard', 'validate input'],
  i18n: ['i18n', 'l10n', 'localiz', 'translat', 'locale', 'rtl', 'internationaliz'],
  browser_compat: ['compatib', 'cross-browser', 'polyfill', 'fallback', 'ie11', 'safari', 'legacy']
};

// ── Helpers ─────────────────────────────────────────────────────────────

function detectFromMap(text: string, map: Record<string, string[]>): string[] {
  const lower = text.toLowerCase();
  const hits: Array<{ key: string; score: number }> = [];
  for (const [key, signals] of Object.entries(map)) {
    let score = 0;
    for (const signal of signals) {
      if (lower.includes(signal)) score += signal.includes(' ') ? 2 : 1;
    }
    if (score > 0) hits.push({ key, score });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, 4).map((h) => h.key);
}

function confidenceFromHits(domainCount: number, workKindsCount: number, artifactCount: number): 'low' | 'medium' | 'high' {
  const total = domainCount + workKindsCount + artifactCount;
  if (total >= 4) return 'high';
  if (total >= 2) return 'medium';
  return 'low';
}

// ── Public API ──────────────────────────────────────────────────────────

/** Infer task intent from a raw human/agent request string. Deterministic, no network. */
export function inferTaskIntent(query: string): TaskIntent {
  const normalized = query.replace(/\s+/g, ' ').trim();
  const domains = detectFromMap(normalized, DOMAIN_SIGNALS);
  const workKinds = detectFromMap(normalized, WORK_KIND_SIGNALS);
  const artifacts = detectFromMap(normalized, ARTIFACT_SIGNALS);
  const technologies = detectFromMap(normalized, TECHNOLOGY_SIGNALS);
  const styles = detectFromMap(normalized, STYLE_SIGNALS);
  const constraints = detectFromMap(normalized, CONSTRAINT_SIGNALS);

  const retrievalTerms = buildRetrievalTerms(domains, workKinds, artifacts, technologies, styles, constraints);
  const confidence = confidenceFromHits(domains.length, workKinds.length, artifacts.length);

  return {
    original: query,
    normalized,
    domains,
    workKinds,
    artifacts,
    technologies,
    styles,
    constraints,
    retrievalTerms,
    confidence
  };
}

/** Build an enriched routing query from a TaskIntent. */
export function taskIntentQuery(intent: TaskIntent): string {
  const enrichment = [
    ...intent.domains,
    ...intent.workKinds,
    ...intent.artifacts,
    ...intent.technologies,
    ...intent.styles,
    ...intent.constraints,
    ...intent.retrievalTerms
  ];
  const unique = [...new Set(enrichment.filter(Boolean))];
  const enriched = unique.join(' ');
  if (!enriched) return intent.normalized;
  return `${enriched} | original: ${intent.normalized}`;
}

// ── Internal ───────────────────────────────────────────────────────────

// Domain → retrieval term expansion (avoids repetitive if/includes blocks)
const DOMAIN_RETRIEVAL_TERMS: Record<string, string[]> = {
  frontend: ['frontend', 'ui', 'component'],
  ui: ['frontend', 'ui', 'component'],
  backend: ['api', 'endpoint', 'server'],
  api: ['api', 'endpoint', 'server'],
  database: ['database', 'storage', 'persistence'],
  ai_agent: ['agent', 'workflow', 'mcp', 'memory'],
  testing: ['test', 'spec', 'coverage'],
  docs: ['documentation', 'readme', 'guide'],
  security: ['security', 'validation', 'sanitiz'],
  accessibility: ['accessibility', 'a11y', 'wcag'],
  auth: ['auth', 'login', 'authentication']
};

const CONSTRAINT_RETRIEVAL_TERMS: Record<string, string[]> = {
  accessibility: ['accessibility', 'a11y', 'wcag'],
  performance: ['performance', 'optimization'],
  i18n: ['localization', 'i18n']
};

const WORK_KIND_RETRIEVAL_TERMS: Record<string, string[]> = {
  testing: ['test', 'spec', 'coverage'],
  documenting: ['documentation', 'readme', 'guide']
};

const ARTIFACT_RETRIEVAL_TERMS: Record<string, Record<string, string[]>> = {
  form: { frontend: ['form', 'input', 'validation'], auth: ['auth', 'login', 'authentication'] }
};

const STYLE_RETRIEVAL_TERMS: Record<string, string[]> = {
  glassmorphism: ['glassmorphism', 'backdrop-filter', 'frosted-glass']
};

function buildRetrievalTerms(
  domains: string[],
  workKinds: string[],
  artifacts: string[],
  technologies: string[],
  styles: string[],
  constraints: string[]
): string[] {
  const terms = new Set<string>();

  for (const domain of domains) {
    for (const term of DOMAIN_RETRIEVAL_TERMS[domain] ?? []) terms.add(term);
  }
  for (const wk of workKinds) {
    for (const term of WORK_KIND_RETRIEVAL_TERMS[wk] ?? []) terms.add(term);
  }
  for (const constraint of constraints) {
    for (const term of CONSTRAINT_RETRIEVAL_TERMS[constraint] ?? []) terms.add(term);
  }
  for (const artifact of artifacts) {
    const artifactMap = ARTIFACT_RETRIEVAL_TERMS[artifact];
    if (artifactMap) {
      for (const domain of domains) {
        for (const term of artifactMap[domain] ?? []) terms.add(term);
      }
    }
  }
  for (const style of styles) {
    for (const term of STYLE_RETRIEVAL_TERMS[style] ?? []) terms.add(term);
  }
  for (const tech of technologies) terms.add(tech);

  return [...terms];
}

/** Check whether an intent is substantive enough to enrich routing. */
export function intentIsActionable(intent: TaskIntent): boolean {
  return intent.confidence !== 'low' || intent.domains.length > 0 || intent.artifacts.length > 0;
}
