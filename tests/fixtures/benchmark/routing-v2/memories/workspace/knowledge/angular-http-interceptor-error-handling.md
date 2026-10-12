---
schema_version: 3
id: angular-http-interceptor-error-handling
type: knowledge
scope: workspace
tags: [angular, http, interceptor, error, retry]
created: 2026-04-12
updated: 2026-05-20
author_name: Example Dev
author_email: dev@example.com
source: manual
confidence: high
authority: reference
revision: 1
valid_from: 2026-04-12
last_confirmed: 2026-05-20
---

# Knowledge: Angular Http Interceptor Error Handling

## Content

- The `ErrorInterceptor` maps problem-details responses to typed `ApiError` objects.
- Network errors are retried twice with a short delay for GET requests only.
- User-facing messages come from the translation catalog, never from raw server text.
