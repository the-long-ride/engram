// Verify that all visible CONFIG_FIELDS keys have corresponding docs metadata.
// This script validates the key list matches the expected set and validates the field docs metadata.
// In CI, run after the website build and before deployment.

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const REQUIRED_DOCS_PAGES = [
  'website/docs/intro.md',
  'website/docs/quickstart.md',
  'website/docs/install.md',
  'website/docs/daily-workflow.md',
  'website/docs/concepts/protocol.md',
  'website/docs/concepts/memory-types.md',
  'website/docs/concepts/scopes.md',
  'website/docs/concepts/profiles.md',
  'website/docs/concepts/read-path.md',
  'website/docs/concepts/write-path.md',
  'website/docs/concepts/safety.md',
  'website/docs/entry/index.md',
  'website/docs/entry/launch.md',
  'website/docs/entry/connections.md',
  'website/docs/entry/construct.md',
  'website/docs/entry/policy.md',
  'website/docs/entry/core.md',
  'website/docs/entry/memories.md',
  'website/docs/entry/review.md',
  'website/docs/entry/field-reference.md',
  'website/docs/entry/field-authoring-guidelines.md',
  'website/docs/integrations/overview.md',
  'website/docs/integrations/codex.md',
  'website/docs/integrations/claude.md',
  'website/docs/integrations/gemini.md',
  'website/docs/integrations/cursor.md',
  'website/docs/integrations/windsurf.md',
  'website/docs/integrations/opencode.md',
  'website/docs/integrations/copilot.md',
  'website/docs/integrations/cline.md',
  'website/docs/integrations/slash.md',
  'website/docs/integrations/mcp.md',
  'website/docs/integrations/hooks.md',
  'website/docs/cli/overview.md',
  'website/docs/cli/load-search-graph.md',
  'website/docs/cli/save-session.md',
  'website/docs/cli/inject-link-upgrade.md',
  'website/docs/cli/profiles-workspaces-config.md',
  'website/docs/cli/verify-repair-quality.md',
  'website/docs/cli/sync-archive.md',
  'website/docs/operations/team-git-workflow.md',
  'website/docs/operations/release-upgrade.md',
  'website/docs/operations/troubleshooting.md',
  'website/docs/operations/faq.md',
  'website/docs/operations/changelog.md',
  'website/docs/comparison/overview.md',
  'website/docs/comparison/built-in-memory.md',
  'website/docs/comparison/agentmemory.md',
  'website/docs/comparison/obsidian.md',
  'website/docs/comparison/tolaria.md',
  'website/docs/comparison/hermes-agent.md',
];

let errors = 0;

// 1. Verify docs pages existence
for (const page of REQUIRED_DOCS_PAGES) {
  const absPath = path.join(repoRoot, page);
  if (!existsSync(absPath)) {
    console.error(`MISSING docs page: ${page} (resolved to: ${absPath})`);
    errors++;
  }
}

// 2. Parse CONFIG_FIELDS from config-schema.ts
const schemaPath = path.join(repoRoot, 'src/core/web/config-schema.ts');
if (!existsSync(schemaPath)) {
  console.error(`MISSING schema file: ${schemaPath}`);
  process.exit(1);
}
const schemaContent = readFileSync(schemaPath, 'utf8');
const fieldsBlockMatch = schemaContent.match(/export const CONFIG_FIELDS[\s\S]*?=\s*\[([\s\S]*?)\];/);
if (!fieldsBlockMatch) {
  console.error('Failed to find CONFIG_FIELDS in config-schema.ts');
  process.exit(1);
}
const fieldsBlock = fieldsBlockMatch[1];
const configFields = [];
const lines = fieldsBlock.split('\n');
for (const line of lines) {
  const keyMatch = line.match(/key:\s*'([^']+)'/);
  if (keyMatch) {
    const key = keyMatch[1];
    const isHidden = line.includes("hidden: true");
    const isRisky = line.includes("risk: 'risky'");
    const anchorMatch = line.match(/docsAnchor:\s*'([^']+)'/);
    const docsAnchor = anchorMatch?.[1] ?? key.replace(/\./g, '-').replace(/_/g, '-');
    configFields.push({ key, isHidden, isRisky, docsAnchor });
  }
}

const visibleConfigKeys = configFields.filter(f => !f.isHidden).map(f => f.key);

// 3. Parse ENTRY_FIELDS from entryFields.ts
const entryFieldsPath = path.join(repoRoot, 'website/src/data/entryFields.ts');
if (!existsSync(entryFieldsPath)) {
  console.error(`MISSING entry fields file: ${entryFieldsPath}`);
  process.exit(1);
}
const entryFieldsContent = readFileSync(entryFieldsPath, 'utf8');
const entryFieldsBlockMatch = entryFieldsContent.match(/export const ENTRY_FIELDS[\s\S]*?=\s*\[([\s\S]*?)\];/);
if (!entryFieldsBlockMatch) {
  console.error('Failed to find ENTRY_FIELDS in entryFields.ts');
  process.exit(1);
}
const entryFieldsBlock = entryFieldsBlockMatch[1];
const ENTRY_FIELDS = new Function(`return [\n${entryFieldsBlock}\n];`)();

const entryKeys = ENTRY_FIELDS.map(f => f.key);

// 4. Validate key sets are identical
const missingInDocs = visibleConfigKeys.filter(k => !entryKeys.includes(k));
const extraInDocs = entryKeys.filter(k => !visibleConfigKeys.includes(k));

for (const key of missingInDocs) {
  console.error(`MISSING docs entry: Key '${key}' is in CONFIG_FIELDS but not in ENTRY_FIELDS.`);
  errors++;
}

for (const key of extraInDocs) {
  console.error(`EXTRA docs entry: Key '${key}' is in ENTRY_FIELDS but not in CONFIG_FIELDS.`);
  errors++;
}



// 5. Validate exact config anchors against schema, website metadata, and canonical docs.
const visibleFields = configFields.filter((field) => !field.isHidden);
const configAnchors = visibleFields.map((field) => field.docsAnchor);
const entryAnchors = ENTRY_FIELDS.map((field) => field.docsAnchor);
const fieldReference = readFileSync(path.join(repoRoot, 'website/docs/entry/field-reference.md'), 'utf8');

for (const field of visibleFields) {
  if (!field.docsAnchor) {
    console.error(`FIELD ERROR: Visible config field '${field.key}' is missing docsAnchor.`);
    errors++;
  } else if (!fieldReference.includes(`id="${field.docsAnchor}"`)) {
    console.error(`FIELD ERROR: Anchor '${field.docsAnchor}' for '${field.key}' is missing from field-reference.md.`);
    errors++;
  }
}

if (new Set(configAnchors).size !== configAnchors.length) {
  console.error('FIELD ERROR: CONFIG_FIELDS docsAnchor values must be unique.');
  errors++;
}
if (new Set(entryAnchors).size !== entryAnchors.length) {
  console.error('FIELD ERROR: ENTRY_FIELDS docsAnchor values must be unique.');
  errors++;
}
for (const field of ENTRY_FIELDS) {
  const schemaField = visibleFields.find((candidate) => candidate.key === field.key);
  if (schemaField?.docsAnchor !== field.docsAnchor) {
    console.error(`FIELD ERROR: Anchor mismatch for '${field.key}': schema='${schemaField?.docsAnchor}', docs='${field.docsAnchor}'.`);
    errors++;
  }
}

// 6. Validate typed Auto-save Policy metadata against the canonical page.
const policySource = readFileSync(path.join(repoRoot, 'src/core/web/app/data/policy-fields.ts'), 'utf8');
const policyPage = readFileSync(path.join(repoRoot, 'website/docs/entry/policy.md'), 'utf8');
const policyPaths = [...policySource.matchAll(/path:\s*'([^']+)'/g)].map((match) => match[1]);
const policyAnchors = [...policySource.matchAll(/docsAnchor:\s*'([^']+)'/g)].map((match) => match[1]);

if (policyPaths.length !== 13 || new Set(policyPaths).size !== 13) {
  console.error(`POLICY ERROR: Expected 13 unique policy paths, found ${new Set(policyPaths).size}.`);
  errors++;
}
if (policyAnchors.length !== 13 || new Set(policyAnchors).size !== 13) {
  console.error(`POLICY ERROR: Expected 13 unique policy anchors, found ${new Set(policyAnchors).size}.`);
  errors++;
}
for (const anchor of policyAnchors) {
  if (!policyPage.includes(`{#${anchor}}`)) {
    console.error(`POLICY ERROR: Anchor '${anchor}' is missing from policy.md.`);
    errors++;
  }
}

// 7. Validate field metadata details
for (const field of ENTRY_FIELDS) {
  const { key, shortDescription, useCases, guidelines, risk, troubleshooting, control, min, max } = field;
  
  if (!shortDescription || typeof shortDescription !== 'string' || shortDescription.trim() === '') {
    console.error(`FIELD ERROR: '${key}' has missing or empty shortDescription.`);
    errors++;
  }
  
  if (!Array.isArray(useCases) || useCases.length === 0 || useCases.some(item => !item || typeof item !== 'string' || item.trim() === '')) {
    console.error(`FIELD ERROR: '${key}' must have at least one valid use case.`);
    errors++;
  }

  if (!Array.isArray(guidelines) || guidelines.length === 0 || guidelines.some(item => !item || typeof item !== 'string' || item.trim() === '')) {
    console.error(`FIELD ERROR: '${key}' must have at least one valid guideline.`);
    errors++;
  }

  // Risky or caution field troubleshooting validation
  if (risk === 'risky' || risk === 'caution') {
    if (!Array.isArray(troubleshooting) || troubleshooting.length === 0 || troubleshooting.some(item => !item || typeof item !== 'string' || item.trim() === '')) {
      console.error(`FIELD ERROR: Risky/caution field '${key}' must have at least one valid troubleshooting note.`);
      errors++;
    }
  }

  // Numeric field allowed range validation
  if (control === 'number') {
    if (typeof min !== 'number' || typeof max !== 'number' || isNaN(min) || isNaN(max)) {
      console.error(`FIELD ERROR: Numeric field '${key}' must define min and max values.`);
      errors++;
    }
  }
}

console.log(`Smoke check: ${entryKeys.length} config keys and ${policyAnchors.length} policy controls tracked, ${REQUIRED_DOCS_PAGES.length} docs pages verified.`);

if (errors > 0) {
  console.error(`${errors} metadata or docs errors found.`);
  process.exit(1);
}

console.log('Docs smoke check passed.');