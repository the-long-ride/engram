---
schema_version: 3
id: write-xunit-tests-skill
type: skill
scope: workspace
tags: [xunit, unit-tests, dotnet, testing, mocking]
created: 2026-04-12
updated: 2026-05-20
author_name: Example Dev
author_email: dev@example.com
source: manual
confidence: high
authority: instruction
revision: 1
valid_from: 2026-04-12
last_confirmed: 2026-05-20
---

# Skill: Write Xunit Tests Skill

## Content

1. Name tests `Method_Scenario_ExpectedResult` and keep one behavior per test.
2. Arrange dependencies with NSubstitute and build the system under test through a factory method.
3. Assert on outcomes, not on internal calls, unless the call is the behavior.
4. Use `[Theory]` with `InlineData` for input tables.
