---
title: Flujo de trabajo en equipo con Git
sidebar_position: 1
description: Use Git para llevar la memoria de Engram entre máquinas y proporcionar historial de revisión.
---

# Flujo de trabajo en equipo con Git

Git lleva la memoria entre máquinas y proporciona un historial de revisión. Engram es nativo de Git: la memoria es Markdown simple, por lo que se aplica el flujo de trabajo normal de Git.

## Memoria del espacio de trabajo como submódulo

Si el humano desea que `.agents/.engram` sea rastreado como un repositorio separado:

```bash
engram inject --submodule
engram inject --submodule-remote <git-url>
```

Engram valida la URL, inicializa el submódulo en `main` y crea la primera confirmación (commit) del submódulo como `Initialize engram`.

## Origen Git global compartido

Si `engram entry` no muestra `global_git_detected.remote_url`, pregunte al humano si la memoria global debe compartirse a través de Git. Cuando proporcionen una URL:

```bash
engram inject --global-remote <git-url>
```

Configure el comportamiento de sincronización con los campos `global_git.*`:

- `global_git.enabled` — habilita el comportamiento de Git para la memoria global
- `global_git.remote` — nombre del control remoto (por defecto `origin`)
- `global_git.remote_url` — URL remota de memoria global compartida
- `global_git.branch` — rama de destino (por defecto `main`)
- `global_git.auto_sync` — comportamiento automático de pull/push
- `global_git.auto_resolve` — manejo automático de conflictos

:::warning
El manejo automático de conflictos puede ocultar los diffs de memoria. Revise los diffs de memoria antes de confiar en `global_git.auto_resolve`.
:::

## Flujo de trabajo de revisión

1. El agente propone candidatos de memoria.
2. El humano aprueba a través de la puerta A/B/C (terminal) o `yes`/`audit`/`cancel` (chat).
3. Engram escribe el Markdown aprobado y actualiza los hashes, el índice, el grafo y el historial de cambios.
4. Confirme (commit) y envíe (push) el cambio de memoria a través de Git.
5. Los compañeros de equipo realizan pull y ejecutan `engram upgrade` para conciliar.

## Siguientes pasos

- [Proceso de publicación y actualización](release-upgrade.md)
- [Conceptos: ruta de escritura y aprobación](../concepts/write-path.md)
