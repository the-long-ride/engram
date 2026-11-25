---
schema_version: 3
id: csp-xss-input-sanitization
type: skill
scope: workspace
tags: [xss, csrf, csp, sanitize, security, headers]
applies_to: [src/server/**]
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

# Skill: CSP And XSS Input Sanitization

## Content

- Emit a strict `Content-Security-Policy` header without `unsafe-inline` scripts and sanitize untrusted HTML before rendering.
- Enforce `SameSite=Lax` or `Strict` cookies together with CSRF anti-forgery verification on state-changing routes.
- Escape dynamic attributes and reject `javascript:` URLs in user-supplied links.

## Example

```ts
response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; object-src 'none'");
```
