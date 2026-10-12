---
id: hotfix-deployment-skill
type: skill
scope: workspace
tags: [hotfix, deployment, release, production, rollback]
created: 2026-04-12
updated: 2026-05-20
author: dev@example.com
source: manual
confidence: high
---

# Skill: Hotfix Deployment Skill

## Content

1. Branch from the production tag as `hotfix/<ticket>`.
2. Apply the minimal fix and add a regression test.
3. Run the full test suite and open a pull request against the release branch.
4. After approval, tag and deploy through the release pipeline.
5. Merge the hotfix back to main and verify the rollback plan.
