---
id: structured-logging-with-serilog
type: knowledge
scope: workspace
tags: [logging, serilog, structured, dotnet, observability]
created: 2026-04-12
updated: 2026-05-20
author: dev@example.com
source: manual
confidence: high
---

# Knowledge: Structured Logging With Serilog

## Context

Plain text logs were hard to query during incidents.

## Content

- Use Serilog message templates with named properties, for example `Log.Information("Order {OrderId} shipped", id)`.
- Do not concatenate strings into log messages.
- Enrich logs with correlation id and tenant id; never log personal data or tokens.

## Example

Use this memory when adding log statements to .NET services.
