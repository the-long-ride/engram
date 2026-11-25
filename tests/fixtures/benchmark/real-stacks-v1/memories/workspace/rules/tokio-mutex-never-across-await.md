---
schema_version: 3
id: tokio-mutex-never-across-await
type: rule
scope: workspace
tags: [tokio, mutex, deadlock, starvation, concurrency]
applies_to: [src-tauri/src/**/*.rs]
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

# Rule: Never Hold Std Sync Mutex Across Await

## Content

- Never hold a `std::sync::Mutex` guard across `.await` points in Tokio tasks; it causes executor starvation and deadlocks.
- Scope synchronous locks inside a short block to clone data before awaiting, or switch to `tokio::sync::Mutex` when async coordination is required.
- Offload CPU-heavy loops to `tokio::task::spawn_blocking`.

## Example

```rust
let snapshot = {
    let guard = state.lock().expect("state lock");
    guard.clone()
};
send_update(snapshot).await?;
```
