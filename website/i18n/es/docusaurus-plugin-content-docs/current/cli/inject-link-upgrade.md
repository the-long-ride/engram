---
title: inject / link / upgrade
sidebar_position: 4
description: Comandos de configuración y adaptador — inicializar espacios de trabajo, vincular agentes y reconciliar después de actualizaciones de paquetes.
---

# inject / link / upgrade

Los comandos de configuración y adaptador inicializan espacios de trabajo, vinculan agentes y reconcilian después de actualizaciones de paquetes.

## inject

```bash
engram inject
engram inject --global-only --global-path <path>
engram inject --submodule
engram inject --submodule-remote <git-url>
engram inject --global-remote <git-url>
engram inject --no-skillset
engram inject --skillset all
```

`engram inject` crea `.agents/.engram/` e instala el objetivo Codex compacto de forma predeterminada. Se omiten los archivos existentes escritos por humanos.

La inyección interactiva pregunta en este orden: si agregar `./.agents/.engram` como submódulo, si usar una ruta global de Engram y si agregar un origen Git global compartido.

Usa `engram update-global-folder <new-path>` o `engram ugf <new-path>` para actualizar solo la ruta global configurada. Las formas de estilo chat como `engram set global memory path to <new-path>` y `engram move global folder from <old-path> to <new-path>` se normalizan al mismo comando. Agrega `--move-from-path <old-path>` cuando también deseen que Engram mueva toda la raíz global antigua.

## link

```bash
engram link codex
engram link claude
engram link gemini
engram link cursor
engram link windsurf
engram link --global opencode
engram link all
engram unlink
```

`engram link all` instala el conjunto de objetivos públicos e informa razones deterministas `SKIPPED` para hosts parciales a través de archivos de instrucciones de conjunto de habilidades, configuración de MCP, adaptadores de comandos slash y hooks de agente en una sola instalación unificada. `engram unlink` elimina todos ellos juntos. `engram unlink --global <target>` elimina solo el complemento global generado por Engram; un archivo escrito por humanos se conserva a menos que `--force` sea explícito.

## upgrade

```bash
engram upgrade
engram upgrade --plan
engram upgrade --latest
```

Usa `engram upgrade` después de instalar un paquete de Engram más nuevo. El comando compara las raíces de memoria inicializadas desde la versión v0.0.8 en adelante con el esquema de la versión actual y actualiza el archivo `HELP.md` generado, los índices de memoria, los archivos de grafo, los sidecars vectoriales elegibles, los conjuntos de habilidades generados para el espacio de trabajo, el andamiaje de la memoria global y los conjuntos de habilidades del agente global registrados, mientras conserva los archivos escritos por humanos.

Los comandos normales también ejecutan la misma reconciliación de raíz de forma silenciosa una vez por versión del paquete a menos que se configure `--no-auto-upgrade` o `ENGRAM_NO_AUTO_UPGRADE=1`.

Usa `engram upgrade --latest` cuando la salida del nuevo paquete deba sobrescribir los artefactos de agentes vinculados actuales administrados por Engram. Esa ruta vuelve a aplicar los archivos de instrucciones del espacio de trabajo vinculados, las reglas, la configuración de MCP/complementos y los hooks administrados, y también actualiza las instalaciones de agentes globales registradas con los últimos archivos generados.

Usa `--force` solo al reemplazar intencionalmente archivos de adaptadores generados por Engram.

## take-control

```bash
engram take-control --plan
engram take-control --all
engram take-control --file AGENTS.md
engram take-control --dir docs
engram take-control --include "docs/**/*.md" --exclude "docs/private/**"
engram take-control --max-sources 5 --max-chars 900
engram take-control --all --metacognize --accept-all
```

`take-control` es el flujo de toma de control asistido por el agente para las directrices existentes del espacio de trabajo. Construye un paquete de origen compacto a partir de archivos como `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, reglas de Cursor, notas del banco de memoria y carpetas de nivel superior `rules/`, `skills/`, `workflows/`, `knowledge/` o `notes/`, incluyendo notas `.txt`.

Las memorias de control guardadas registran `source_files` y `source_hashes`, por lo que las fuentes sin cambios se omiten más adelante.

## metacognize

```bash
engram metacognize --workspace
engram metacognize --global --dry-run
engram metacognize --all --accept-all
```

Usa `metacognize` cuando desees que un agente de IA revise una carpeta de memoria de Engram existente y proponga una estructura más segura a través del mismo flujo de aprobación de save-session. Los agentes deben usar `UPDATE: memory-id` para consolidación o limpieza de redacción y `DEPENDS_ON: memory-id` para memorias en capas.

## Siguientes pasos

- [profiles / workspaces / config](profiles-workspaces-config.md)
- [Descripción general de integraciones de agentes](../integrations/overview.md)
