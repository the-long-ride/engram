---
title: Privacy, ignore rules, and safety
sidebar_position: 7
description: Ignore rules, approval gates, hashes, and profiles protect private context from accidental capture.
---

# Privacy, ignore rules, and safety

Engram is private by default. Several layers keep private context from leaking into durable memory or across profile boundaries.

## Approval gate

Writes require human approval. Agents propose candidates; humans approve, reject, edit, or archive. Direct terminal CLI uses A/B/C. AI-agent chat uses `yes` / `audit` / `cancel`.

## Ignore rules

Ignore rules are privacy controls. They hide irrelevant or sensitive entries from routing. Configure them in `.engramignore` and workspace memory config so private paths and patterns never enter the index.

## Hashes

Hashes are integrity checks. They run before content is printed and reveal unsafe edits that bypassed the normal write flow.

## Profiles

Profiles isolate company, client, and personal memory so external APIs or company-provided agents do not leak context across projects. See [Profiles and scope resolution](profiles.md).

## Secrets and injection scanning

At save time Engram checks:

- schema validation
- secret scan
- prompt-injection patterns
- path safety

## Limits to know

Default Engram search is deterministic lexical search. `engram search --semantic` adds deterministic local similarity, not embedding-backed semantic search. Graph vectors are local hashed word vectors, not semantic embeddings. Contradiction detection is advisory. Encryption config exists, but encrypted storage is not implemented yet.

These limits are intentional to state clearly. Engram should tell users what is real today and what is future work.

## Next steps

- [Write path and approval](write-path.md)
- [Operations troubleshooting](../operations/troubleshooting.md)
