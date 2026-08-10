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

競合レビューは CLI と Entry で同じ共有プランを使用します。ngram upgrade --latest --review を実行して、タイプ認識された最新の提案を受け入れるか、$VISUAL/$EDITOR で編集するか、**Keep current** を確認します。Entry は **Current**、**Proposed**、**Diff** ビューを提供します。**Diff** はデフォルトで **Inline** に設定されており、**Parallel** に切り替えることができます。削除されたコンテンツは赤でハイライトされ、追加されたコンテンツは緑でハイライトされます。pendingReviewCount がゼロでない間は最終適用がブロックされ、ngram upgrade --latest --yes は未解決または古い決定を拒否します。各決定は書き込み前にソースハッシュと照合されます。

## 所有権を認識した構成の照合

最新のアップグレード インベントリは、物理ファイルごとに登録された統合を重複排除します。複数のホストが同じ Engram ガイドを共有している場合、Engram はそのファイルを 1 回だけレンダリングして書き込みます。

手動編集によって Engram アーティファクトの通常の置換が安全でない場合、Entry は所有権が証明できる場合にのみ **Force upgrade** を提供します。マークされた Engram ブロックの場合、強制置換はその Engram ブロックのみを置き換え、周囲のユーザーテキストを保持します。登録/生成された Engram ファイルの場合、強制置換は生成されたファイル全体を置き換えることができます。不明な所有権は一括操作で強制されることはありません。

書き込み後の再スキャンによって適用が成功したことが検証されます。current に収束しない予想更新アーティファクトは検証エラーとして報告されます。

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

Read the complete [Git author settings guide](../operations/git-author-settings.md).
