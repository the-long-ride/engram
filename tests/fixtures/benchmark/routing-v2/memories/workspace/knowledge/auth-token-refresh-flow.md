---
schema_version: 3
id: auth-token-refresh-flow
type: knowledge
scope: workspace
tags: [auth, token, refresh, jwt, login, session]
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
depends_on: [session-middleware-validates-auth-tokens]
dependency_depth: 2
---

# Knowledge: Auth Token Refresh Flow

## Content

- The Angular client refreshes the access token 60 seconds before expiry using the refresh token cookie.
- On a 401 response the HTTP interceptor retries once after a refresh and then redirects to the sign-in page.
- Refresh tokens are rotated on every use; reuse of an old refresh token revokes the whole session family.
