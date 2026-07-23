const { transformSync } = require('esbuild');

module.exports = {
  process(sourceText, sourcePath) {
    const loader = sourcePath.endsWith('.tsx') ? 'tsx' : 'ts';
    const result = transformSync(sourceText, {
      loader,
      format: 'cjs',
      target: 'es2022',
      jsx: 'automatic',
      sourcemap: 'inline',
      sourcefile: sourcePath,
    });
    return { code: result.code };
  },
};
