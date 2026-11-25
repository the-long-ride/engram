---
schema_version: 3
id: tauri-ipc-command-boundaries
type: rule
scope: workspace
tags: [tauri, ipc, invoke, webview2, desktop]
applies_to: [src-tauri/src/**]
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

# Rule: Tauri IPC Command Boundaries

## Content

- Keep Tauri v2 `invoke` IPC payloads small and typed; stream large binary blobs via temp files or channels instead of JSON serialization.
- Validate every command argument in Rust before touching filesystem or WebView2 state.
- Return structured serializable error enums from `#[tauri::command]` handlers instead of panicking.

## Example

```rust
#[tauri::command]
async fn load_item(id: String) -> Result<ItemDto, AppError> {
    validate_id(&id)?;
    fetch_item(&id).await
}
```
