---
schema_version: 3
id: oauth-pkce-login-hardening
type: skill
scope: workspace
tags: [auth, oauth, jwt, bearer, pkce, login]
applies_to: [src/auth/**]
created: 2026-04-10
updated: 2026-05-20
author_name: Engram Fixture
author_email: fixture@example.com
source: manual
confidence: high
authority: instruction
revision: 1
valid_from: 2026-04-10
last_confirmed: 2026-05-20
---

# Skill: OAuth PKCE Login Hardening

## Content

- Require Authorization Code Flow with PKCE (`S256`) for all browser and desktop OAuth logins.
- Verify JWT issuer, audience, signature, and expiration on every bearer API request.
- Rotate refresh credentials on use and revoke the family if reuse is detected.

## Example

```ts
const verified = await verifyJwt(bearerHeader, { issuer: expectedIssuer, audience: expectedAudience });
```
