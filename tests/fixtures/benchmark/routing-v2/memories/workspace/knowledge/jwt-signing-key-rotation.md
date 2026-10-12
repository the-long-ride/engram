---
id: jwt-signing-key-rotation
type: knowledge
scope: workspace
tags: [jwt, signing, keys, rotation, jwks, auth]
created: 2026-04-12
updated: 2026-05-20
author: dev@example.com
source: manual
confidence: high
dependency_depth: 0
---

# Knowledge: Jwt Signing Key Rotation

## Content

- Signing keys rotate every 90 days; the previous key stays valid for 24 hours after rotation.
- Public keys are published through a JWKS endpoint and cached for 10 minutes by consumers.
- Rotation is automated by a scheduled job and recorded in the operations runbook.
