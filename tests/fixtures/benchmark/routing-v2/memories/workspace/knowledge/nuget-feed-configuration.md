---
id: nuget-feed-configuration
type: knowledge
scope: workspace
tags: [nuget, feed, packages, dotnet, restore]
created: 2026-04-12
updated: 2026-05-20
author: dev@example.com
source: manual
confidence: high
lifecycle: review_due
review_after: 2026-06-01
---

# Knowledge: Nuget Feed Configuration

## Content

- Private packages are restored from the team Azure Artifacts feed configured in `nuget.config`.
- Use package source mapping so public packages never resolve from the private feed.
- Authenticate locally with the credential provider; CI uses the pipeline service connection.
