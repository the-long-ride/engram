---
title: Field authoring guidelines
sidebar_position: 11
description: Rules for maintainers documenting new Entry UI fields.
---

# Field authoring guidelines

Rules for maintainers documenting new Entry UI fields.

## When you add a field

1. Add the field to `CONFIG_FIELDS` in `src/core/web/config-schema.ts` with a short `description`, `options`, `min`/`max`/`step`, and `risk`.
2. Add a docs entry to `website/src/data/entryFields.ts` with `shortDescription`, `useCases`, and `guidelines` at minimum.
3. Document the field on the [Construct tab](construct.md) page and in the [Complete field reference](field-reference.md).
4. Run the field docs coverage check:

   ```bash
   npm --prefix website run check:entry-fields
   ```

5. If the field is risky, add at least one recovery/troubleshooting note.

## Required doc items per field

| Item | Required |
| --- | --- |
| Plain-language description | Yes |
| Use cases | Yes (1+) |
| Recommended default | Yes |
| Allowed values / range | Yes |
| Risk level | Yes |
| Side effects | When relevant |
| CLI equivalent | When relevant |
| Example values | For text/path fields |
| Troubleshooting notes | For risky fields |

## Writing rules

- Write for a user configuring an AI-agent memory system, not a maintainer reading source code.
- Name the real effect on memory ownership, routing, context size, privacy, or Git sync.
- Prefer examples from Engram workflows: Codex, Claude, Gemini, Cursor, OpenCode, personal memory, client profile, team repo.
- Do not recommend high limits by default; explain context bloat tradeoffs.
- Mark settings as risky when they can disable Engram, change save location, change Git sync, archive memory, or affect encryption/security.
- Include recovery commands for risky settings.
- Keep in-app descriptions short; put detailed guidance in Docusaurus.

## CI coverage

`website/scripts/check-entry-field-docs.mjs` fails when:

1. A visible `CONFIG_FIELDS` key lacks a docs entry.
2. A docs entry references a field no longer in `CONFIG_FIELDS`.
3. A field lacks `shortDescription`, `useCases`, or `guidelines`.
4. A risky field lacks at least one troubleshooting note.
5. A numeric field omits allowed range in rendered docs.

## Next steps

- [Complete field reference](field-reference.md)
- [Construct tab](construct.md)
