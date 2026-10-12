/** Bound AST depth and node count before upstream recursive transformations. */
'use strict';
module.exports = function guardAst(root) {
  const pending = [{ node: root, depth: 0 }];
  const seen = new Set();
  while (pending.length) {
    const { node, depth } = pending.pop();
    if (!node || typeof node !== 'object') continue;
    if (depth >= 128) throw new SyntaxError('Brace AST exceeds maximum nesting depth (128)');
    if (seen.has(node)) throw new SyntaxError('Brace AST is cyclic or shares nodes');
    guardParents(node);
    seen.add(node);
    if (seen.size > 65536) throw new SyntaxError('Brace AST exceeds node limit (65536)');
    if (Array.isArray(node.nodes)) {
      if (seen.size + pending.length + node.nodes.length > 65536) throw new SyntaxError('Brace AST exceeds node limit (65536)');
      for (const child of node.nodes) pending.push({ node: child, depth: depth + 1 });
    }
  }
};

/** Expansion follows parent links too; those chains must have the same depth bound and no cycles. */
function guardParents(node) {
  const chain = new Set();
  while (node && typeof node === 'object') {
    if (chain.size >= 128) throw new SyntaxError('Brace AST exceeds maximum nesting depth (128)');
    if (chain.has(node)) throw new SyntaxError('Brace AST has cyclic parent links');
    chain.add(node);
    node = node.parent;
  }
}
