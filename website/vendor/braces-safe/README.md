# Bounded braces for the docs toolchain

This private local fork contains the MIT-licensed npm tarball braces 3.0.3.
Upstream: https://github.com/micromatch/braces
Tarball: https://registry.npmjs.org/braces/-/braces-3.0.3.tgz
Integrity: sha512-yQbXgO/OSZVD2IsiLlro+7Hf6Q18EJrKSEsdoMzKePKXct3gvD8oLcOQdIzGupr5Fj+EDe8gO/lxc1BzfMpxvA==

GHSA-vfj7-8cjw-p6xm reports recursive traversal exhaustion from deeply nested patterns. The advertised patched version 3.0.4 was not published when this fork was created on 2026-10-13. This is an explicitly versioned local patch, not an upstream release.

Changes to upstream are limited to:
- Reject nesting beyond 128 parser stack entries, including unbalanced parentheses and braces.
- Validate depth, child and parent cycles, and a 65536-node limit before public AST transformations recurse. Count pending nodes before allocating their traversal records.
- Keep the original 10000-character limit and normal alternatives, ranges, and escaping.

Normal expansion options and APIs are retained. General Cartesian expansion can still be large; this patch addresses deep recursion rather than changing all expansion semantics. Regression coverage is in website/src/security/braces-safe.test.ts.

Use the upstream package again once a released version fixes the advisory and passes the regression tests. Keep LICENSE with all upstream code.
