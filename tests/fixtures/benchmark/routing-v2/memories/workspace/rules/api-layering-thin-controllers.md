---
schema_version: 3
id: api-layering-thin-controllers
type: rule
scope: workspace
tags: [dotnet, api, controller, service, repository, layering]
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

# Rule: Api Layering Thin Controllers

## Content

- Controllers only translate HTTP to application calls and back; they hold no business logic.
- Business rules live in application services; data access lives in repositories behind interfaces.
- Services never reference `HttpContext`; pass explicit parameters instead.
- Return problem details for every error response.
