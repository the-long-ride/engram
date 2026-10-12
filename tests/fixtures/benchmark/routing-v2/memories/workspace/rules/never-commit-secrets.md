---
id: never-commit-secrets
type: rule
scope: workspace
tags: [security, secrets, credentials, keyvault, environment]
created: 2026-04-12
updated: 2026-05-20
author: dev@example.com
source: manual
confidence: high
---

# Rule: Never Commit Secrets

## Content

- Never commit passwords, connection strings, tokens, or certificates to the repository.
- Read secrets from environment variables locally and from Key Vault in deployed environments.
- Use `dotnet user-secrets` for local .NET development and keep `.env` files in `.gitignore`.
- If a secret is committed by accident, rotate it first and then clean the history.
