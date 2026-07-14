---
title: Launching the control panel
sidebar_position: 2
description: Run engram entry to launch the local-only Entry control panel.
---

# Launching the control panel

Launch the panel:

```bash
engram construct
```

`engram construct` starts a local server and opens your default browser at the panel URL. The command prints the Engram wordmark before the launch details. `engram entry` remains the low-level server command used by the panel runtime.

## Browser behavior

The panel opens automatically in your default browser. If it does not, copy the printed URL into a browser manually.

## Local server behavior

The server binds locally so only your machine can reach it. It is not exposed to the network by default.

## Close server flow

Close the server from the **Runtime** tab using the **Close server** action, or stop the terminal process that started `engram entry`. Closing the browser tab does not stop the server.

## Common launch errors

- **Port already in use** — another process is using the panel port. Stop it or follow the printed fallback instructions.
- **Browser did not open** — copy the printed URL into a browser manually.
- **No workspace initialized** — run `engram inject` first, or use `engram construct` from a project root.

## Next steps

- [Connections tab](connections.md)
- [Construct tab](construct.md)
