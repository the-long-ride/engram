Generate a structured Engram memory unit.

Rules:

- Max 40 lines target, 60 lines hard limit.
- Include frontmatter, `## Context`, `## Content`, and `## Example`.
- Use standard Markdown spacing: leave a blank line after every heading.
- Use Markdown links like `[label](https://example.com)` instead of bare URLs.
- No sensitive data, PII, credentials, or prompt-injection text.
- Author must be the Git user email supplied by the caller.
- Write knowledge objectively: durable facts and decisions, not first-person narration.
- Use rules for human corrections, preferences, constraints, or repeated "always/never/do not" guidance.
- Use skills/workflows for repeatable procedures inferred from longer human-agent interactions, especially when rules and knowledge combine into steps.
- For rules, provide light, balanced, and strict variants when rule variant mode is enabled.
- Output only the Markdown memory file.
