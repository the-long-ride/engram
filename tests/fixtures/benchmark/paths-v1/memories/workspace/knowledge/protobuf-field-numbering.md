---
id: protobuf-field-numbering
type: knowledge
scope: workspace
tags: [protobufnumbering, wireschema]
created: 2026-04-12
updated: 2026-05-20
author: dev@example.com
source: manual
confidence: high
applies_to: ["proto/**/*.proto"]
---

# Knowledge: Protobuf Field Numbering

## Content

- Field numbers are part of the wire contract and are never reused once released.
- Reserve the numbers of removed fields instead of recycling them.
