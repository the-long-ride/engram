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

La revisión de conflictos utiliza el mismo plan compartido en la CLI y en Entry. Ejecute ngram upgrade --latest --review para aceptar la última propuesta según el tipo, editarla mediante $VISUAL/$EDITOR o confirmar **Keep current**. Entry proporciona vistas **Current**, **Proposed** y **Diff**; **Diff** está predeterminado en **Inline** y puede cambiar a **Parallel**, con el contenido eliminado resaltado en rojo y el contenido añadido en verde. La aplicación final se bloquea mientras pendingReviewCount no sea cero, y ngram upgrade --latest --yes rechaza decisiones no resueltas o desactualizadas. Cada decisión se verifica con su hash de origen antes de escribir.

## Reconciliación de configuración con conocimiento de propiedad

El inventario de la actualización más reciente elimina duplicados de integraciones registradas por archivo físico. Si varios hosts comparten la misma guía Engram, Engram genera y escribe ese archivo una sola vez.

Cuando las ediciones manuales hacen que un artefacto Engram no sea seguro para el reemplazo normal, Entry solo ofrece **Force upgrade** cuando la propiedad se puede probar. Para un bloque Engram marcado, la actualización forzada solo reemplaza ese bloque y conserva el texto del usuario circundante. Para un archivo Engram generado/registrado, la actualización forzada puede reemplazar todo el archivo generado. La propiedad desconocida nunca se puede forzar, y la confirmación masiva nunca realiza acciones de forzado.

La aplicación exitosa se verifica mediante un escaneo posterior a la escritura. Los artefactos esperados que no convergen a current se notifican como errores de verificación.

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
