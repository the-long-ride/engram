---
title: Release and upgrade process
sidebar_position: 2
description: Upgrade Engram packages and reconcile memory roots safely.
---

# Release and upgrade process

## After an npm package update

The next normal Engram command quietly reconciles already-initialized workspace/global roots once for the new version. This covers release-to-release memory schema changes from v0.0.8 onward by refreshing generated help, memory indexes, graph files, and eligible vector sidecars when older metadata is detected.

The startup check is intentionally cheap after the first run: it only reads small config markers when the current version is already recorded. It does not run from npm postinstall, create new memory roots, or replace human-authored files. Use `--no-auto-upgrade` or `ENGRAM_NO_AUTO_UPGRADE=1` to skip it for a command.

## Explicit upgrade

```bash
engram upgrade
engram upgrade --plan
engram upgrade --latest
```

`engram upgrade` refreshes generated workspace help, memory indexes, graph files, eligible vector sidecars, existing Engram-generated workspace skillset files, and registered global skillsets while preserving human-authored files.

`engram upgrade --latest` is stronger: it overwrites current Engram-managed linked agent artifacts for already-linked workspace agents and registered global installs, including instruction files, rules, MCP/plugin config, and managed hooks, so linked hosts pick up the new package output immediately.

Use `--force` only when replacing generated Engram adapter files intentionally.

## Skillset render profiles

For runtime-capable hosts, Engram installs small bootstrap instructions instead of the full protocol. Hooks provide routed task context, MCP tools provide load/search/proposal behavior, and slash adapters or Agent Skills carry detailed command workflows. Fallback targets without reliable runtime context injection still receive compact manual instructions.

## SQLite config DB fallback

Engram's SQLite config DB is an optimization for workspace/profile management. If the DB cannot be opened or initialized, normal read/write commands fall back to JSON config snapshots. DB-specific commands report SQLite as unavailable instead of blocking normal memory use.

## Next steps

- [Troubleshooting](troubleshooting.md)
- [CLI: inject / link / upgrade](../cli/inject-link-upgrade.md)

## Legacy memory migration to schema v3

`engram upgrade --latest` also migrates active v1/v2 memory files in the workspace and configured global roots to schema v3. Engram preserves each Markdown body exactly, creates `<memory-file>.pre-v3.bak`, fills only deterministic metadata, refreshes integrity hashes, and rebuilds the index, graph, and eligible vector sidecars. It never invents `evidence_refs`; a memory without verified trace links is marked `evidence_status: unverified`. Invalid memories are reported and skipped, archived memories are not rewritten, and a second run is idempotent.

Preview all changes without writing:

```bash
engram upgrade --latest --plan
```

Run only the memory migration, without overwriting linked agent artifacts:

```bash
engram upgrade --migrate-memories
```

Skip memory migration during a latest upgrade:

```bash
engram upgrade --latest --no-migrate-memories
```

<!-- configuration-upgrade-inventory -->

충돌 검토는 CLI와 Entry에서 동일한 공유 플랜을 사용합니다. ngram upgrade --latest --review를 실행하여 유형별 최신 제안을 수락하거나, $VISUAL / $EDITOR를 통해 편집하거나, **Keep current**를 확인하세요. Entry는 **Current**, **Proposed**, **Diff** 뷰를 제공합니다. **Diff**는 기본적으로 **Inline**으로 설정되며 **Parallel**로 전환할 수 있습니다. 삭제된 콘텐츠는 빨간색으로, 추가된 콘텐츠는 녹색으로 강조 표시됩니다. pendingReviewCount가 0이 아닌 동안에는 최종 적용이 차단되며, ngram upgrade --latest --yes는 미해결되거나 만료된 결정을 거부합니다. 각 결정은 쓰기 전에 소스 해시와 비교 검증됩니다.

## 소유권 인식 구성 조정

최신 업그레이드 인벤토리는 물리적 파일별로 등록된 통합의 중복을 제거합니다. 여러 호스트가 동일한 Engram 가이드를 공유하는 경우 Engram은 해당 파일을 한 번만 렌더링하고 기록합니다.

수동 편집으로 인해 정상적인 교체가 안전하지 않은 경우, Entry는 소유권을 증명할 수 있는 경우에만 **Force upgrade**를 제공합니다. 표시된 Engram 블록의 경우 강제 교체는 해당 Engram 블록만 교체하고 주변 사용자 텍스트를 보존합니다. 등록/생성된 Engram 파일의 경우 강제 교체는 생성된 파일 전체를 교체할 수 있습니다. 알 수 없는 소유권은 일괄 처리로 강제 실행되지 않습니다.

쓰기 후 재검색을 통해 성공적인 적용이 검증됩니다. current로 수렴되지 않는 예상 업데이트 아티팩트는 검증 오류로 보고됩니다.

## Git author identity

Engram can store a global author and an optional workspace override. Resolution is workspace, global, then read-only Git fallback. Settings affect future memories only; a workspace override never changes global Git configuration. Use explicit plan and confirmation for global Git sync or legacy-memory migration.

```bash
engram author show
engram author set --name "Jane Doe" --email "jane@example.com"
engram author unset --scope workspace
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author migrate-memories --plan
engram author migrate-memories --confirm
```

Read the complete [Git author settings guide](git-author-settings.md).
