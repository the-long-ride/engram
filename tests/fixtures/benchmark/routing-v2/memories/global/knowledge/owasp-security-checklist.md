---
schema_version: 3
id: owasp-security-checklist
type: knowledge
scope: global
tags: [security, owasp, injection, authentication, checklist]
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

# Knowledge: Owasp Security Checklist

## Content

- Check every change for injection, broken access control, and sensitive data exposure.
- Use parameterized queries and encode output for the target context.
- Validate input on the server even when the client validates it.
- Log security events without logging secrets.
