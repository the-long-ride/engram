/** Manifest extractor: stack facts (runtime, framework, scripts, dependency names) from build manifests. */
import { jsonEntries, parseJsonLoose, quotedItems, tomlEntries, yamlEntries, type KeyEntry } from '../structured.js';
import { baseName, extensionOf, nameList, normalizeRelPath, safeClip } from '../text.js';
import type { SourceExtractor } from '../types.js';

type Facts = Array<[string, string | undefined]>;
type FactReader = (text: string) => Facts;

export const manifestExtractor: SourceExtractor = {
  id: 'manifest',
  kind: 'manifest',
  matches(relPath) {
    return Boolean(readerFor(relPath));
  },
  extract(text, relPath) {
    const facts = (readerFor(relPath)?.(text) ?? [])
      .map(([label, value]) => [label, value?.trim() ? safeClip(value.trim(), 200) : ''] as const)
      .filter(([, value]) => value);
    const symbols = facts.filter(([label]) => label === 'name' || label === 'module').map(([, value]) => value);
    return { file: normalizeRelPath(relPath), kind: 'manifest', lines: facts.map(([label, value]) => `${label}: ${value}`), symbols };
  }
};

function readerFor(relPath: string): FactReader | undefined {
  const name = baseName(relPath);
  const ext = extensionOf(relPath);
  if (name === 'package.json') return packageJsonFacts;
  if (ext === 'csproj' || ext === 'fsproj' || ext === 'vbproj') return msbuildFacts;
  if (name === 'pyproject.toml') return pyprojectFacts;
  if (name === 'go.mod') return goModFacts;
  if (name === 'cargo.toml') return cargoFacts;
  if (name === 'dockerfile' || name.startsWith('dockerfile.') || ext === 'dockerfile') return dockerfileFacts;
  if (/(^|\/)\.github\/workflows\/[^/]+\.ya?ml$/i.test(normalizeRelPath(relPath))) return workflowFacts;
  return undefined;
}

function packageJsonFacts(text: string): Facts {
  const entries = jsonEntries(parseJsonLoose(text), 2);
  const node = valueAt(entries, 'engines', 'node');
  return [
    ['name', valueAt(entries, 'name')],
    ['runtime', node && `node${node}`],
    ['package-manager', valueAt(entries, 'packageManager')],
    ['module-type', valueAt(entries, 'type')],
    ['scripts', nameList(childKeys(entries, 'scripts'))],
    ['dependencies', nameList(childKeys(entries, 'dependencies'))],
    ['dev-dependencies', nameList(childKeys(entries, 'devDependencies'))],
    ['peer-dependencies', nameList(childKeys(entries, 'peerDependencies'))]
  ];
}

/** MSBuild projects: split on `<` so every tag is scanned once (linear even on one huge line). */
function msbuildFacts(text: string): Facts {
  const facts = { sdk: '', frameworks: [] as string[], output: '', packages: [] as string[], projects: [] as string[] };
  for (const chunk of text.split('<')) {
    const tag = /^[\w.]+/.exec(chunk)?.[0] ?? '';
    const close = chunk.indexOf('>');
    const head = close >= 0 ? chunk.slice(0, close) : chunk;
    const body = close >= 0 ? chunk.slice(close + 1).trim() : '';
    if (tag === 'Project') facts.sdk ||= attribute(head, 'Sdk');
    else if (tag === 'TargetFramework' || tag === 'TargetFrameworks') append(facts.frameworks, body.split(';'));
    else if (tag === 'OutputType') facts.output ||= body;
    else if (tag === 'PackageReference') facts.packages.push(attribute(head, 'Include'));
    else if (tag === 'ProjectReference') facts.projects.push(projectStem(attribute(head, 'Include')));
  }
  return [
    ['sdk', facts.sdk],
    ['framework', nameList(facts.frameworks)],
    ['output', facts.output],
    ['dependencies', nameList(facts.packages)],
    ['project-references', nameList(facts.projects)]
  ];
}

function pyprojectFacts(text: string): Facts {
  const entries = tomlEntries(text);
  const python = valueAt(entries, 'project', 'requires-python');
  const poetryPython = valueAt(entries, 'tool', 'poetry', 'dependencies', 'python');
  const deps = [
    ...quotedItems(valueAt(entries, 'project', 'dependencies') ?? '').map(requirementName),
    ...childKeys(entries, 'tool', 'poetry', 'dependencies').filter((name) => name !== 'python')
  ];
  return [
    ['name', valueAt(entries, 'project', 'name') ?? valueAt(entries, 'tool', 'poetry', 'name')],
    ['runtime', python ? `python${python}` : poetryPython && `python${poetryPython}`],
    ['dependencies', nameList(deps)],
    ['build', valueAt(entries, 'build-system', 'build-backend')]
  ];
}

function goModFacts(text: string): Facts {
  let module = '';
  let version = '';
  let inRequire = false;
  const deps: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const words = line.split(/\s+/);
    if (inRequire) {
      if (line.startsWith(')')) inRequire = false;
      else if (words[0] && !line.startsWith('//') && !line.includes('// indirect')) deps.push(words[0]);
    } else if (words[0] === 'module') module ||= words[1] ?? '';
    else if (words[0] === 'go') version ||= words[1] ?? '';
    else if (words[0] === 'require' && words[1] === '(') inRequire = true;
    else if (words[0] === 'require' && words[1] && !line.includes('// indirect')) deps.push(words[1]);
  }
  return [['module', module], ['runtime', version && `go${version}`], ['dependencies', nameList(deps)]];
}

function cargoFacts(text: string): Facts {
  const entries = tomlEntries(text);
  const rust = valueAt(entries, 'package', 'rust-version');
  return [
    ['name', valueAt(entries, 'package', 'name')],
    ['edition', valueAt(entries, 'package', 'edition')],
    ['runtime', rust && `rust>=${rust}`],
    ['dependencies', nameList(childKeys(entries, 'dependencies'))],
    ['dev-dependencies', nameList(childKeys(entries, 'dev-dependencies'))]
  ];
}

/** Dockerfiles: base images, exposed ports, and variable *names* only (ENV/ARG values may be secrets). */
function dockerfileFacts(text: string): Facts {
  const images: string[] = [];
  const stages = new Set<string>();
  const vars: string[] = [];
  const ports: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const words = raw.trim().split(/\s+/);
    const instruction = words[0]?.toUpperCase();
    const args = words.slice(1).filter((word) => !word.startsWith('--'));
    if (instruction === 'FROM' && args[0]) {
      if (!stages.has(args[0].toLowerCase())) images.push(args[0]);
      if (args[1]?.toUpperCase() === 'AS' && args[2]) stages.add(args[2].toLowerCase());
    } else if (instruction === 'ENV' || instruction === 'ARG') {
      const assigned = args.map((word) => /^([A-Za-z_]\w*)=/.exec(word)?.[1]).filter((name): name is string => Boolean(name));
      append(vars, assigned.length ? assigned : args.slice(0, 1).map((word) => word.split('=')[0]));
    } else if (instruction === 'EXPOSE') append(ports, args);
  }
  return [['base-images', nameList(images)], ['env', nameList(vars)], ['expose', nameList(ports)]];
}

function workflowFacts(text: string): Facts {
  const entries = yamlEntries(text);
  const inlineOn = valueAt(entries, 'on');
  const triggers = inlineOn ? inlineOn.replace(/[[\]]/g, '').split(',') : childKeys(entries, 'on');
  const actions: string[] = [];
  const runtimes: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const uses = /^\s*(?:-\s+)?uses:\s*(\S+)/.exec(line);
    if (uses) actions.push(uses[1].replace(/^["']|["']$/g, ''));
    const runtime = /^\s*(?:-\s+)?(node|python|dotnet|go|java)-version:\s*(\S+)/.exec(line);
    if (runtime) runtimes.push(`${runtime[1]} ${runtime[2].replace(/^["']|["']$/g, '')}`);
  }
  return [
    ['workflow', valueAt(entries, 'name')],
    ['triggers', nameList(triggers)],
    ['jobs', nameList(childKeys(entries, 'jobs'))],
    ['actions', nameList(actions)],
    ['runtime', nameList(runtimes)]
  ];
}

function valueAt(entries: KeyEntry[], ...path: string[]): string | undefined {
  return entries.find((entry) => samePath(entry.path, path))?.value;
}

function childKeys(entries: KeyEntry[], ...parent: string[]): string[] {
  return entries
    .filter((entry) => entry.path.length === parent.length + 1 && samePath(entry.path.slice(0, parent.length), parent))
    .map((entry) => entry.path[parent.length]);
}

/** Push without spreading, so a huge token list cannot overflow the call stack. */
function append(target: string[], items: string[]): void {
  for (const item of items) target.push(item);
}

function samePath(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((part, index) => part === b[index]);
}

function attribute(head: string, name: string): string {
  return new RegExp(`\\b${name}="([^"]*)"`).exec(head)?.[1] ?? '';
}

function projectStem(include: string): string {
  const file = include.replace(/\\/g, '/').split('/').pop() ?? '';
  return file.replace(/\.[^.]+$/, '');
}

function requirementName(requirement: string): string {
  return /^[A-Za-z0-9._-]+/.exec(requirement.trim())?.[0] ?? '';
}
