import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const coreRequire = createRequire(require.resolve('@docusaurus/core/package.json'));
const utilsRequire = createRequire(coreRequire.resolve('@docusaurus/utils/package.json'));
const micromatchRequire = createRequire(utilsRequire.resolve('micromatch/package.json'));
const braces = micromatchRequire('braces');
type Ast = { type: string; value?: string; nodes?: Ast[] };

test('brace parser rejects deep balanced and unbalanced nesting before recursive traversal', () => {
  const balanced = '{'.repeat(1024) + 'x' + '}'.repeat(1024);
  for (const parse of [braces, braces.parse, braces.compile, braces.expand, braces.stringify]) {
    assert.throws(() => parse(balanced), { name: 'SyntaxError', message: /nesting depth/ });
  }
  assert.throws(() => braces.parse('{'.repeat(1024)), /nesting depth/);
  assert.throws(() => braces.parse('('.repeat(1024)), /nesting depth/);
});

test('brace alternatives, ranges and escaped literal braces keep their behavior', () => {
  assert.deepEqual(braces.expand('src/{a,b}/{1..3}.ts'), ['src/a/1.ts','src/a/2.ts','src/a/3.ts','src/b/1.ts','src/b/2.ts','src/b/3.ts']);
  assert.equal(braces.compile('src/{a,b}.ts'), 'src/(a|b).ts');
  assert.equal(braces.stringify('src/{a,b}.ts'), 'src/{a,b}.ts');
  const literal = String.raw`\{`.repeat(1024);
  assert.equal(braces.stringify(literal), '{'.repeat(1024));
});

test('public AST operations reject deep, cyclic and oversized node trees', () => {
  let deep: Ast = { type: 'text', value: 'x' };
  for (let index = 0; index < 1024; index++) deep = { type: 'root', nodes: [deep] };
  const cycle: Ast = { type: 'root', nodes: [] };
  cycle.nodes!.push(cycle);
  const large = { type: 'root', nodes: Array.from({ length: 65537 }, () => ({ type: 'text', value: 'x' })) };
  for (const transform of [braces.compile, braces.expand, braces.stringify]) {
    assert.throws(() => transform(deep), /nesting depth/);
    assert.throws(() => transform(cycle), /cyclic/);
    assert.throws(() => transform(large), /node limit/);
  }
});


test('AST expansion rejects cyclic and excessive parent chains without hanging', () => {
  const script = `
    const braces = require(process.argv[1]);
    for (const mode of ['cycle', 'deep']) {
      const child = { type: 'paren', nodes: [] };
      if (mode === 'cycle') child.parent = child;
      else {
        let parent = { type: 'paren' };
        child.parent = parent;
        for (let index = 0; index < 1024; index++) parent = parent.parent = { type: 'paren' };
      }
      try { braces.expand({ type: 'root', nodes: [child] }); process.exit(1); }
      catch (error) {
        if (error.name !== 'SyntaxError' || !/cyclic|nesting depth/.test(error.message)) throw error;
      }
    }
    console.log('parent chains rejected');
  `;
  const result = spawnSync(process.execPath, ['-e', script, micromatchRequire.resolve('braces')], { encoding: 'utf8', timeout: 3000 });
  assert.equal(result.status, 0, result.error?.message ?? result.stderr);
  assert.match(result.stdout, /parent chains rejected/);
});
