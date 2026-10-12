---
id: terraform-module-pinning
type: rule
scope: workspace
tags: [terraformpinning, hclmodules]
created: 2026-04-12
updated: 2026-05-20
author: dev@example.com
source: manual
confidence: high
applies_to: ["infra/**/*.tf"]
---

# Rule: Terraform Module Pinning

## Content

- Pin every remote module source to an exact released tag.
- Never reference a module by branch name in committed configuration.
