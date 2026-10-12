import test from 'node:test';
import assert from 'node:assert/strict';
import { rm, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { runEngram, tempWorkspace } from '../helpers.mjs';

async function put(cwd, rel, body) {
  await mkdir(path.dirname(path.join(cwd, rel)), { recursive: true });
  await writeFile(path.join(cwd, rel), body);
}

const exportsFile = (prefix) => Array.from({ length: 30 }, (_, index) => `export function ${prefix}Handler${index}(input: string): string { return input; }`).join('\n');
const pad = (index) => String(index).padStart(3, '0');

test('take-control docs scans keep the original limits and never budget-drop --file sources', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  const line = 'Durable guidance line for agents about the release process.\n';
  await put(cwd, 'notes/a.md', `Always keep note A.\n${line.repeat(230)}`);
  await put(cwd, 'notes/b.md', `Always keep note B.\n${line.repeat(230)}`);
  const required = await runEngram(cwd, env, ['take-control', '--plan', '--file', 'notes/a.md', '--file', 'notes/b.md', '--max-chars', '15000']);
  assert.equal(required.code, 0, required.stderr);
  assert.match(required.stdout, /Selected sources: 2/);
  assert.doesNotMatch(required.stdout, /budget/);
  await rm(path.join(cwd, 'notes'), { recursive: true, force: true });
  for (let index = 0; index < 18; index += 1) await put(cwd, `notes/doc-${pad(index)}.md`, `Always follow doc ${index}.\n${line.repeat(34)}`);
  const wide = await runEngram(cwd, env, ['take-control', '--plan', '--max-sources', '20']);
  assert.equal(wide.code, 0, wide.stderr);
  assert.match(wide.stdout, /Selected sources: 18/);
  assert.doesNotMatch(wide.stdout, /budget/);
  const json = JSON.parse((await runEngram(cwd, env, ['take-control', '--plan', '--json'])).stdout);
  assert.equal(json.budgetTokens, null);
  assert.equal(json.sources.length, 12);
  assert.equal(json.omitted, 6);
  await put(cwd, 'src/wide.ts', exportsFile('wide'));
  const deep = await runEngram(cwd, env, ['take-control', '--plan', '--kind', 'code', '--budget-tokens', '100', '--file', 'src/wide.ts']);
  assert.equal(deep.code, 0, deep.stderr);
  assert.match(deep.stdout, /Selected sources: 1/);
  assert.match(deep.stdout, /- src\/wide\.ts \[code digest; /);
  await rm(cwd, { recursive: true, force: true });
});

test('take-control default guidance has no omitted line; non-default scans keep it', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  for (let index = 0; index < 14; index += 1) await put(cwd, `notes/n-${pad(index)}.txt`, `Always keep durable note ${index} concise.`);
  const guidance = await runEngram(cwd, env, ['take-control', '--dry-run']);
  assert.equal(guidance.code, 0, guidance.stderr);
  assert.doesNotMatch(guidance.stdout, /omitted by/);
  const plan = await runEngram(cwd, env, ['take-control', '--plan']);
  assert.match(plan.stdout, /- notes\/n-012\.txt: over --max-sources 12\n- notes\/n-013\.txt: over --max-sources 12\n/);
  const budgeted = await runEngram(cwd, env, ['take-control', '--dry-run', '--budget-tokens', '6000']);
  assert.match(budgeted.stdout, /2 more sources omitted by --max-sources\/--budget-tokens/);
  await rm(cwd, { recursive: true, force: true });
});

test('take-control stops reading once the token budget is spent and summarizes the tail', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  for (let index = 0; index < 60; index += 1) await put(cwd, `src/f${pad(index)}.ts`, exportsFile(`f${index}`));
  // Whitespace-only files sort last: if they were ever read, the plan would list them as `empty or unreadable`.
  for (let index = 0; index < 20; index += 1) await put(cwd, `src/zz/empty-${pad(index)}.ts`, '  \n');
  const plan = await runEngram(cwd, env, ['take-control', '--plan', '--kind', 'code']);
  assert.equal(plan.code, 0, plan.stderr);
  const selected = Number(/Selected sources: (\d+)/.exec(plan.stdout)[1]);
  assert.ok(selected > 0 && selected < 40, plan.stdout);
  assert.ok((plan.stdout.match(/over --budget-tokens/g) ?? []).length <= 3, plan.stdout);
  assert.equal((plan.stdout.match(/^- \d+ more files not read \(budget\/limit\)$/gm) ?? []).length, 1, plan.stdout);
  assert.doesNotMatch(plan.stdout, /empty or unreadable/);
  const json = JSON.parse((await runEngram(cwd, env, ['take-control', '--plan', '--json', '--kind', 'code'])).stdout);
  assert.equal(json.sources.length + json.omitted, 80);
  assert.ok(json.notRead > 20, JSON.stringify(json.notRead));
  const capped = await runEngram(cwd, env, ['take-control', '--plan', '--kind', 'code', '--max-sources', '2', '--budget-tokens', '200000']);
  assert.match(capped.stdout, /Selected sources: 2/);
  assert.match(capped.stdout, /^- 78 more files not read \(budget\/limit\)$/m);
  assert.doesNotMatch(capped.stdout, /over --max-sources|empty or unreadable/);
  await rm(cwd, { recursive: true, force: true });
});

test('take-control explicit includes reach into build and vendor directories', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await put(cwd, 'build/guide.md', '# Build guide\n\nAlways build with the release flag.\n');
  await put(cwd, 'vendor/lib/README.md', '# Vendor\n\nThe vendored lib is pinned.\n');
  const build = await runEngram(cwd, env, ['take-control', '--plan', '--include', 'build/**/*.md']);
  assert.equal(build.code, 0, build.stderr);
  assert.match(build.stdout, /- build\/guide\.md \[/);
  const vendor = await runEngram(cwd, env, ['take-control', '--plan', '--include', 'vendor/**']);
  assert.match(vendor.stdout, /- vendor\/lib\/README\.md \[/);
  const fallback = await runEngram(cwd, env, ['take-control', '--plan', '--all']);
  assert.doesNotMatch(fallback.stdout, /build\/guide|vendor\/lib/);
  await rm(cwd, { recursive: true, force: true });
});

test('take-control treats credential file names as secret files in any case', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  const names = [
    '.git-credentials', 'infra/prod.tfvars', 'infra/prod.tfvars.json', 'credentials.json', 'gcp-credentials-dev.json',
    'secrets.toml', '.htpasswd', 'keys/putty.ppk', 'kubeconfig', '.kube/config', '.dockercfg', '.pgpass', '.netrc',
    'KEY.PEM', '.ENV', 'config/Secrets.JSON'
  ];
  const explicit = await runEngram(cwd, env, ['take-control', '--plan', ...names.flatMap((name) => ['--file', name])]);
  assert.equal(explicit.code, 0, explicit.stderr);
  assert.match(explicit.stdout, /Selected sources: 0/);
  for (const name of names) assert.ok(explicit.stdout.includes(`- ${name}: secret file`), `${name} not refused:\n${explicit.stdout}`);
  for (const name of ['infra/prod.tfvars.json', 'credentials.json', 'gcp-credentials-dev.json', 'secrets.toml']) await put(cwd, name, '{"token": "zq5CredVal"}');
  const walked = await runEngram(cwd, env, ['take-control', '--plan', '--kind', 'all']);
  assert.equal(walked.code, 0, walked.stderr);
  assert.match(walked.stdout, /Selected sources: 0/);
  for (const name of ['infra/prod.tfvars.json', 'credentials.json', 'gcp-credentials-dev.json', 'secrets.toml']) assert.ok(walked.stdout.includes(`- ${name}: secret file`), walked.stdout);
  await rm(cwd, { recursive: true, force: true });
});

test('take-control --kind config keeps manifest script values and secret flags out', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await put(cwd, 'package.json', JSON.stringify({ name: 'demo', scripts: { 'publish:npm': 'npm publish --otp=zq9OtpVal42', build: 'tsc' } }, null, 2));
  await put(cwd, 'composer.json', JSON.stringify({ scripts: { deploy: 'deploy --otp zq9OtpVal43 --pass zq9PassVal44 --credential=zq9CredVal45' } }, null, 2));
  for (const mode of [['--dry-run'], ['--plan', '--json']]) {
    const result = await runEngram(cwd, env, ['take-control', ...mode, '--kind', 'config']);
    assert.equal(result.code, 0, result.stderr);
    assert.doesNotMatch(result.stdout, /zq9OtpVal42|zq9OtpVal43|zq9PassVal44|zq9CredVal45/);
  }
  const guidance = await runEngram(cwd, env, ['take-control', '--dry-run', '--kind', 'config']);
  assert.match(guidance.stdout, /scripts\.build\n/);
  assert.match(guidance.stdout, /scripts\.deploy: deploy --otp/);
  await rm(cwd, { recursive: true, force: true });
});

test('take-control --kind config redacts compound secret flags in script values', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await put(cwd, 'composer.json', JSON.stringify({ scripts: { deploy: 'tool --client-secret CS2_abc --private-key PK_xyz --api-token AT2_t', kb: 'tool --keyboard us' } }, null, 2));
  const guidance = await runEngram(cwd, env, ['take-control', '--dry-run', '--kind', 'config']);
  assert.equal(guidance.code, 0, guidance.stderr);
  assert.doesNotMatch(guidance.stdout, /CS2_abc|PK_xyz|AT2_t/);
  assert.match(guidance.stdout, /scripts\.deploy: tool --client-secret <redacted> --private-key <redacted> --api-token <redacted>/);
  assert.match(guidance.stdout, /scripts\.kb: tool --keyboard us/);
  await rm(cwd, { recursive: true, force: true });
});

test('default docs guidance strips URL passwords and secret flag values', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await put(cwd, 'AGENTS.md', [
    '# Agent Guidance', '',
    'Local database: postgres://admin:S3cretPwLocal@localhost:5432/app',
    'Deploy with `deploy --client-secret abc` from CI.',
    'Docs live at https://example.com/handbook.', ''
  ].join('\n'));
  const guidance = await runEngram(cwd, env, ['take-control', '--dry-run']);
  assert.equal(guidance.code, 0, guidance.stderr);
  assert.ok(!guidance.stdout.includes('S3cretPwLocal'), guidance.stdout);
  assert.ok(!guidance.stdout.includes('--client-secret abc'), guidance.stdout);
  assert.match(guidance.stdout, /postgres:\/\/admin:<redacted>@localhost:5432\/app/);
  assert.match(guidance.stdout, /Docs live at https:\/\/example\.com\/handbook\./);
  await rm(cwd, { recursive: true, force: true });
});

test('code scans skip tool cache dirs such as .angular/cache, so src/ keeps its budget', async () => {
  const { cwd, env } = await tempWorkspace('engram-take-control-cache-dirs-');
  const put = async (rel, body) => {
    await mkdir(path.dirname(path.join(cwd, rel)), { recursive: true });
    await writeFile(path.join(cwd, rel), body);
  };
  for (let i = 0; i < 60; i += 1) await put(`.angular/cache/20.0.0/babel-webpack/chunk-${i}.js`, `export function chunk${i}() { return ${i}; }\n`);
  for (const dir of ['.nx', '.turbo', '.svelte-kit', '.nuxt', '.parcel-cache', '.yarn', '.pnpm-store', '.gradle', '.terraform', '.vs', '.idea']) {
    await put(`${dir}/cached.js`, 'export const cached = true;\n');
  }
  for (const name of ['app.component', 'app.routes', 'app.config']) await put(`src/app/${name}.ts`, `export function ${name.replace('.', '_')}(): void {}\n`);
  const json = JSON.parse((await runEngram(cwd, env, ['take-control', '--plan', '--json', '--kind', 'code'])).stdout);
  const files = json.sources.map((source) => source.file);
  assert.deepEqual(files.filter((file) => file.startsWith('src/')).sort(), ['src/app/app.component.ts', 'src/app/app.config.ts', 'src/app/app.routes.ts']);
  assert.deepEqual(files.filter((file) => !file.startsWith('src/')), [], files.join(', '));

  const included = JSON.parse((await runEngram(cwd, env, ['take-control', '--plan', '--json', '--kind', 'code', '--include', '.nx/**'])).stdout);
  assert.ok(included.sources.some((source) => source.file === '.nx/cached.js'), 'an explicit --include still walks into the dir');
  await rm(cwd, { recursive: true, force: true });
});
