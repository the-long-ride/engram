import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('GitHub action is local-only and annotates failures without memory payloads', async () => {
  const action = await readFile('.github/actions/engram-check/action.yml', 'utf8');
  assert.match(action, /npm ci/);
  assert.match(action, /github\.action_path/);
  assert.match(action, /no memory root configured/);
  assert.match(action, /ENGRAM_POLICY_INPUT/);
  assert.match(action, /ENGRAM_BENCHMARK_INPUT/);
  assert.match(action, /benchmark "\$ENGRAM_BENCHMARK_INPUT" --policy "\$ENGRAM_POLICY_INPUT"/);
  assert.match(action, /policy validate --strict --json/);
  assert.match(action, /if: failure\(\)/);
  assert.match(action, /::error title=Engram checks/);
  assert.match(action, /memory bodies and transcript content are not uploaded/);
  assert.doesNotMatch(action, /curl|wget|ENGRAM_TOKEN|GITHUB_TOKEN/);
});

test('workflow avoids duplicate branch checks', async () => {
  const workflow = await readFile('.github/workflows/engram.yml', 'utf8');
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /push:\s*\n\s*branches: \[main\]/);
  assert.match(workflow, /permissions:\s*\n\s*contents: read/);
});

test('team policy is trackable while runtime memory remains ignored', async () => {
  const ignore = await readFile('.gitignore', 'utf8');
  assert.match(ignore, /!\.agents\/engram\.policy\.json/);
  assert.match(ignore, /\.agents\/\.engram\//);
});
