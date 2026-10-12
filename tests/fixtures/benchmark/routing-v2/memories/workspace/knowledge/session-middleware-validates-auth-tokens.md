---
id: session-middleware-validates-auth-tokens
type: knowledge
scope: workspace
tags: [auth, middleware, session, token, validation, jwt]
created: 2026-04-12
updated: 2026-05-20
author: dev@example.com
source: manual
confidence: high
depends_on: [jwt-signing-key-rotation]
dependency_depth: 1
---

# Knowledge: Session Middleware Validates Auth Tokens

## Content

- `SessionValidationMiddleware` runs after routing and before authorization.
- It validates the JWT signature, issuer, audience, and expiry, then attaches the claims principal to the request.
- Validation keys come from the JWKS cache described in the signing key rotation notes.
