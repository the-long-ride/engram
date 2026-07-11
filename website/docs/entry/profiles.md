---
title: Profiles tab
sidebar_position: 5
description: Manage isolated global memory profiles from the Entry Web UI.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Profiles tab

The Profiles tab manages isolated global memory profiles. Profiles keep client, company, and personal memory from leaking across boundaries.

## Profile name {#profile-name}

Named memory context such as `personal`, `client-a`, `team-platform`. Use letters, numbers, `.`, `_`, `-`; avoid spaces and sensitive names. Names must match `^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$`.

## Global path {#global-path}

Filesystem folder backing the profile. Prefer absolute paths outside volatile temp folders; ensure write permission.

## Activate

Makes the profile active for user-level default resolution. Switching from personal to work/client memory affects future loads and saves.

<RiskCallout level="caution">
Activating a profile changes which global memory future loads and saves use. Confirm the profile name before activating.
</RiskCallout>

## Delete

Removes profile registration. Profile metadata is removed; memory files may still exist on disk unless code behavior changes. Review the folder before relying on deletion.

## CLI equivalent

```bash
engram profile create personal --global-path ~/Documents/engram-personal --use
engram profile use company --workspace
engram profile merge personal company --dry-run
```

## Next steps

- [Profiles and scope resolution](../concepts/profiles.md)
- [Workspaces tab](workspaces.md)
