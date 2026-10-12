---
id: dotnet-async-and-cancellation
type: rule
scope: workspace
tags: [dotnet, async, await, cancellation, naming]
created: 2026-04-12
updated: 2026-05-20
author: dev@example.com
source: manual
confidence: high
---

# Rule: Dotnet Async And Cancellation

## Context

Several request handlers kept running after the client disconnected.

## Content

- Async methods end with the `Async` suffix and return `Task` or `ValueTask`.
- Accept a `CancellationToken` as the last parameter and pass it to every downstream call.
- Never block on async code with `.Result` or `.Wait()`.

## Example

Use this rule when writing or reviewing .NET service and repository methods.
