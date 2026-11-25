/** Deterministic session learning distillation and live-prompt correction detection. */
import type { MemoryType } from '../runtime/types.js';
import { queryPaths } from '../memory/path-anchors.js';
import { meaningfulWordList, slugify } from '../system/text.js';
import { sanitizeTraceText } from '../traces/sanitize.js';

export type DistilledLearning = {
  type: MemoryType;
  text: string;
  directive: string;
  triggers: string[];
  appliesTo?: string[];
  confidence: 'high' | 'medium';
  kind: 'correction' | 'root-cause' | 'decision' | 'workflow';
};

export type DistillResult = {
  candidates: DistilledLearning[];
  redacted: number;
  removedInjectionLines: number;
};

const MAX_SEGMENT_CHARS = 320;
const MAX_DIRECTIVE_CHARS = 160;
const MAX_APPLIES_TO = 8;
const DEFAULT_MAX_CANDIDATES = 8;

const EXPLICIT_RULE_RE = /\b(?:remember|correction|rule|guideline|convention|from now on)\s*[:,-]\s*(.+)/i;
const STRONG_IMPERATIVE_RE = /\b(?:always|never|must not|do not|don't|prefer\s+.+\s+over\s+.+)\b/i;
const HIGH_CONF_IMPERATIVE_RE = /\b(?:always|never)\b.+\b(?:instead of|because|when editing|in this repo)\b/i;
const EXPLICIT_KNOWLEDGE_RE = /\b(root cause|bug cause|decision|architecture|gotcha|invariant|workaround|lesson learned)\s*[:,-]\s*(.+)/i;
const FAILS_FIX_RE = /\bfails?\s+when\b.+;\s*fix\s+by\b/i;
const EXPLICIT_WORKFLOW_RE = /\b(?:workflow|runbook|playbook|verification step)\s*[:,-]\s*(.+)/i;

const LIVE_EXPLICIT_MARKER_RE = /\b(?:remember|correction|rule|convention|root cause|decision|from now on)\s*[:,-]/i;

const GREETING_RE = /^(?:hi|hello|hey|thanks|thank you|ok|okay|sure|got it|sounds good|cheers|good morning|good afternoon|good evening)\b/i;
const REDACTED_TOKEN_RE = /\[REDACTED(?:_[A-Z0-9-]+)?\]|<(?:api-key|private-key|password|team-email|card-number|internal-host|location)>/i;
const TRANSIENT_STATUS_RE = /\b(?:currently debugging|tests passed|all tests pass|build succeeded|working on it|looking into|let me check|checking now|fixed now|done for now|in progress right now)\b/i;
const STACK_TRACE_RE = /(?:^\s*at\s+\S+|\bat\s+\S+\s+\([^)]+:\d+:\d+\)|^\s*File\s+"[^"]+",\s+line\s+\d+|(?:TypeError|ReferenceError|SyntaxError|RangeError|Error):\s+\S+.*\bat\s+)/;
const SHORT_COMMAND_RE = /^(?:[$>]\s*)?(?:npm|pnpm|yarn|node|git|cd|ls|dir|cat|echo|rm|mkdir|cp|mv|pwd|curl|pytest|cargo|go)\s+\S+(?:\s+\S+){0,4}$/i;

/** Strict fast check (<0.2ms) for explicit teaching/correction markers in a live user prompt. */
export function isLivePromptCorrection(prompt: string): boolean {
  if (!prompt) return false;
  const trimmed = prompt.trim();
  if (trimmed.length < 15 || trimmed.length > 4000) return false;
  for (const rawLine of trimmed.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.endsWith('?')) continue;
    const wordCount = line.split(/\s+/).length;
    if (LIVE_EXPLICIT_MARKER_RE.test(line) && wordCount >= 5) return true;
    if (HIGH_CONF_IMPERATIVE_RE.test(line) && wordCount >= 7) return true;
  }
  return false;
}

/** Distill durable/working learning candidates from a session transcript or note text. */
export function distillSessionLearnings(input: {
  text: string;
  touchedPaths?: string[];
  maxCandidates?: number;
}): DistillResult {
  const maxCandidates = Math.max(1, input.maxCandidates ?? DEFAULT_MAX_CANDIDATES);
  const parsedLines = extractTextLines(input.text ?? '');
  const joined = parsedLines.join('\n');
  if (!joined.trim()) return { candidates: [], redacted: 0, removedInjectionLines: 0 };

  const sanitized = sanitizeTraceText(joined);
  const basePaths = normalizePaths(input.touchedPaths ?? []);
  const candidates: DistilledLearning[] = [];
  const seenSlugs = new Set<string>();

  for (const rawLine of sanitized.text.split(/\r?\n/)) {
    if (candidates.length >= maxCandidates) break;
    const cleaned = cleanLine(rawLine);
    if (!cleaned) continue;
    if (cleaned.length > MAX_SEGMENT_CHARS) continue;
    if (REDACTED_TOKEN_RE.test(cleaned)) continue;

    const extracted = classifySegment(cleaned);
    if (!extracted) continue;
    if (!passesValueGate(extracted.text, extracted.minWords)) continue;

    const directive = normalizeDirective(extracted.text);
    const slug = slugify(directive);
    if (!slug || seenSlugs.has(slug)) continue;
    seenSlugs.add(slug);

    const inlinePaths = queryPaths(extracted.text).map((item) => item.path);
    const appliesTo = normalizePaths([...basePaths, ...inlinePaths]).slice(0, MAX_APPLIES_TO);
    const triggers = meaningfulWordList(extracted.text).slice(0, 8);

    candidates.push({
      type: extracted.type,
      text: extracted.text,
      directive,
      triggers,
      ...(appliesTo.length ? { appliesTo } : {}),
      confidence: extracted.confidence,
      kind: extracted.kind
    });
  }

  return {
    candidates,
    redacted: sanitized.redactedFindings,
    removedInjectionLines: sanitized.removedInjectionLines
  };
}

function extractTextLines(raw: string): string[] {
  const out: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const parsed = tryExtractJsonlText(trimmed);
      if (parsed !== undefined) {
        if (parsed) out.push(...parsed.split(/\r?\n/).map((part) => part.trim()).filter(Boolean));
        continue;
      }
    }
    out.push(trimmed);
  }
  return out;
}

function tryExtractJsonlText(line: string): string | undefined {
  let obj: unknown;
  try {
    obj = JSON.parse(line);
  } catch {
    return undefined;
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return undefined;
  const record = obj as Record<string, unknown>;
  const message = record.message && typeof record.message === 'object' ? record.message as Record<string, unknown> : undefined;
  const content = message?.content ?? record.content ?? record.text;
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    const parts = content
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'text' in item && typeof (item as { text?: unknown }).text === 'string') {
          return (item as { text: string }).text;
        }
        return '';
      })
      .map((part) => part.trim())
      .filter(Boolean);
    return parts.join('\n');
  }
  return '';
}

function cleanLine(line: string): string {
  return line
    .trim()
    .replace(/^[-*•]\s+/, '')
    .replace(/^\d+[.)]\s+/, '')
    .replace(/^>\s+/, '')
    .replace(/^(?:user|assistant|human|ai)\s*:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

type Classified = {
  type: MemoryType;
  text: string;
  confidence: 'high' | 'medium';
  kind: DistilledLearning['kind'];
  minWords: number;
};

function classifySegment(line: string): Classified | undefined {
  if (line.endsWith('?')) return undefined;

  const workflowMatch = line.match(EXPLICIT_WORKFLOW_RE);
  if (workflowMatch) {
    const body = workflowMatch[1].trim();
    return { type: 'skill', text: body, confidence: 'high', kind: 'workflow', minWords: 6 };
  }

  const knowledgeMatch = line.match(EXPLICIT_KNOWLEDGE_RE);
  if (knowledgeMatch) {
    const marker = knowledgeMatch[1].toLowerCase();
    const body = knowledgeMatch[2].trim();
    const kind = marker === 'decision' || marker === 'architecture' ? 'decision' : 'root-cause';
    return { type: 'knowledge', text: body, confidence: 'high', kind, minWords: 5 };
  }

  const ruleMatch = line.match(EXPLICIT_RULE_RE);
  if (ruleMatch) {
    const body = ruleMatch[1].trim();
    return { type: 'rule', text: body, confidence: 'high', kind: 'correction', minWords: 5 };
  }

  if (FAILS_FIX_RE.test(line)) {
    return { type: 'knowledge', text: line, confidence: 'high', kind: 'root-cause', minWords: 6 };
  }

  if (STRONG_IMPERATIVE_RE.test(line)) {
    const confidence = HIGH_CONF_IMPERATIVE_RE.test(line) ? 'high' : 'medium';
    return { type: 'rule', text: line, confidence, kind: 'correction', minWords: 6 };
  }

  return undefined;
}

function passesValueGate(text: string, minWords: number): boolean {
  if (!text || text.length > MAX_SEGMENT_CHARS) return false;
  if (text.endsWith('?')) return false;
  if (REDACTED_TOKEN_RE.test(text)) return false;
  if (STACK_TRACE_RE.test(text)) return false;
  if (SHORT_COMMAND_RE.test(text)) return false;
  if (TRANSIENT_STATUS_RE.test(text)) return false;
  if (GREETING_RE.test(text) && text.split(/\s+/).length < 10) return false;
  const meaningful = meaningfulWordList(text);
  if (meaningful.length < Math.max(5, minWords)) return false;
  return true;
}

function normalizeDirective(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= MAX_DIRECTIVE_CHARS) return clean;
  const sliced = clean.slice(0, MAX_DIRECTIVE_CHARS - 3);
  const boundary = sliced.lastIndexOf(' ');
  return `${(boundary > 80 ? sliced.slice(0, boundary) : sliced).trimEnd()}...`;
}

function normalizePaths(paths: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of paths) {
    const normalized = raw.trim().replace(/\\/g, '/').replace(/^(?:\.\/)+/, '');
    if (!normalized) continue;
    if (normalized.startsWith('/') || normalized.startsWith('..') || /^[A-Za-z]:\//.test(normalized)) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}
