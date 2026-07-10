---
title: Workspaces tab
sidebar_position: 6
description: Register and link project repos from the Entry Web UI.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Workspaces tab

The Workspaces tab registers project repos and manages their link state.

## Workspace name {#workspace-name}

Friendly display name for a repo/project path. Keep it short and recognizable.

## Workspace path {#workspace-path}

Filesystem path to a repo/project. Validate the folder exists or can be initialized; avoid system folders.

## Link / Unlink

Whether Engram actively connects generated instructions and hooks to the workspace. Link active repos; unlink archived or test repos.

<RiskCallout level="caution">
Unlinking stops agents from receiving Engram instructions. Confirm before unlinking an active workspace.
</RiskCallout>

## Delete

Removes workspace registration. Clarify whether it deletes only registration or memory files; docs must match implementation. Prefer unlinking over deletion for auditability.

## CLI equivalent

```bash
engram inject
engram link codex
engram unlink
```

## Next steps

- [Profiles tab](profiles.md)
- [Connections tab](connections.md)
