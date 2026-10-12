---
id: release-pipeline-artifact-validation
type: knowledge
scope: workspace
tags: [release, pipeline, artifact, validation, ci]
created: 2026-04-12
updated: 2026-05-20
author: dev@example.com
source: manual
confidence: high
---

# Knowledge: Release Pipeline Artifact Validation

## Content

- The release pipeline builds once and promotes the same artifact through test, staging, and production.
- Artifacts are validated by checksum and a smoke test before promotion.
- A failed validation stops the pipeline and posts the result to the release channel.
