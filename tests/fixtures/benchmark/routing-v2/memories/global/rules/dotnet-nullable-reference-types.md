---
id: dotnet-nullable-reference-types
type: rule
scope: global
tags: [dotnet, nullable, null-safety, csharp]
created: 2026-04-12
updated: 2026-05-20
author: dev@example.com
source: manual
confidence: high
---

# Rule: Dotnet Nullable Reference Types

## Context

Null reference exceptions were the top production error category.

## Content

- Enable nullable reference types in every project and treat nullable warnings as errors.
- Prefer `required` members and constructor validation over null checks scattered in methods.

## Example

Use this rule when creating a new .NET project or fixing nullable warnings.
