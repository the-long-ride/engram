---
title: inject / link / upgrade
sidebar_position: 4
description: Comandos de configuración y adaptadores — inicializar workspaces, vincular agentes y reconciliar tras actualizar el paquete.
---

# inject / link / upgrade

Los comandos de configuración y adaptadores inicializan workspaces, vinculan agentes y reconcilian tras las actualizaciones del paquete.

## inject

```bash
engram inject
engram inject --scope workspace|global|both
engram inject --global-only --global-path <path>
engram inject --submodule
engram inject --submodule-remote <git-url>
engram inject --global-remote <git-url>
engram inject --global-branch <branch>
engram inject --no-skillset
engram inject --skillset all
engram inject --no-global
```

`engram inject` crea `.agents/.engram/` e instala por defecto el destino compacto de Codex. Los archivos escritos por personas se omiten.

El modo interactivo de inject pregunta en este orden: si se añade `./.agents/.engram` como submódulo, si se usa una ruta global de Engram y si se añade un origen Git global compartido.

Use `engram update-global-folder <new-path>` o `engram ugf <new-path>` para actualizar solo la ruta global configurada. Las formas en lenguaje de chat como `engram set global memory path to <new-path>` y `engram move global folder from <old-path> to <new-path>` se normalizan al mismo comando. Añada `--move-from-path <old-path>` cuando también quiera que Engram mueva toda la raíz global anterior.

## link

```bash
engram link codex
engram link claude
engram link gemini
engram link cursor
engram link windsurf
engram link --global opencode
engram link all
engram link list
engram link --all-supported
engram unlink
```

`engram link all` instala el conjunto de destinos públicos e informa motivos `SKIPPED` deterministas para los hosts parciales en los archivos de instrucciones del skillset, la configuración MCP, los adaptadores slash y los hooks del agente, todo en una instalación unificada. `engram unlink` los elimina todos juntos. `engram unlink --global <target>` elimina solo el plugin global generado por Engram; un archivo escrito por una persona se conserva salvo que se indique `--force` explícitamente.

`engram link claude --session-end` (o `codex`) registra además un hook de comando `SessionEnd` opcional que pone en cola la ruta de la transcripción de la sesión en el archivo `session-queue.json`, ignorado por Git; está desactivado por defecto y `engram upgrade` nunca lo añade. Vacíe la cola con `engram observe --queue`; consulte [Hooks](../integrations/hooks.md).

## upgrade

```bash
engram upgrade
engram upgrade --plan
engram upgrade --latest
engram upgrade --self
engram upgrade --memory-only
engram upgrade --global-skillsets-only
engram upgrade --target codex
```

Use `engram upgrade` después de instalar un paquete de Engram más reciente. El comando compara las raíces de memoria inicializadas desde v0.0.8 en adelante con el esquema de la versión actual y actualiza el `HELP.md` generado, los índices de memoria, los archivos de grafo, los sidecars vectoriales elegibles, los skillsets de workspace generados, la estructura de memoria global y los skillsets de agentes globales registrados, preservando los archivos escritos por personas.

Los comandos normales también ejecutan la misma reconciliación de raíces en silencio una vez por versión del paquete, salvo que se defina `--no-auto-upgrade` o `ENGRAM_NO_AUTO_UPGRADE=1`.

Use `engram upgrade --latest` cuando la salida del nuevo paquete deba sobrescribir los artefactos de agente vinculados y gestionados por Engram. Esa ruta vuelve a aplicar los archivos de instrucciones, las reglas, la configuración de MCP/plugins y los hooks gestionados del workspace vinculado, y además actualiza las instalaciones de agentes globales registradas con los últimos archivos generados.

Use `--force` solo cuando quiera reemplazar intencionadamente los archivos de adaptador generados por Engram.

## take-control

```bash
engram take-control --plan
engram take-control --all
engram take-control --file AGENTS.md
engram take-control --dir docs
engram take-control --include "docs/**/*.md" --exclude "docs/private/**"
engram take-control --max-sources 5 --max-chars 900
engram take-control --all --metacognize --force
engram take-control --plan --json --kind code
engram take-control --kind code --objective "add billing export"
engram take-control --refresh
engram take-control --from claude-auto-memory --plan
engram take-control --from codex-memories --plan
```

`take-control` es el flujo de toma de control asistido por agente para la guía existente del workspace. Construye un paquete de fuentes compacto a partir de archivos como `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, reglas de Cursor, notas de memory-bank y carpetas de primer nivel `rules/`, `skills/`, `workflows/`, `knowledge/` o `notes/`, incluidas las notas `.txt`.

Las memorias guardadas por take-control registran `source_files` y `source_hashes`, de modo que las fuentes sin cambios se omiten más adelante.

### Resúmenes de código y configuración

`--kind docs|code|config|all` (se admiten listas separadas por comas; por defecto `docs`, que mantiene el comportamiento anterior) añade extractores que emiten un resumen breve por fuente en lugar de texto sin procesar:

- **code**: firmas exportadas, primeras líneas de los comentarios de documentación e importaciones, nunca los cuerpos. La guía los muestra como un mapa del repositorio por directorio con nombres de símbolos y una línea de importaciones. Los análisis de código usan por defecto `--max-sources 40`.
- **config** y manifiestos de compilación: claves, y valores solo para las claves de la lista permitida (`scripts`, nombres de dependencias, `TargetFramework`, `engines`, `name`) y datos del stack.

Cada resumen se redacta (se eliminan los secretos). Los archivos `.env*` y de credenciales se omiten siempre como `secret file`; los archivos descubiertos de más de 256 KB o que parecen binarios se omiten indicando el motivo, y los análisis de código y configuración omiten los directorios de salida de compilación (`bin`, `obj`, `build`, `out`, `target`, `venv` y similares) a cualquier profundidad. `--budget-tokens` (6000 por defecto en los análisis de código y configuración; los análisis de documentación no tienen límite salvo que se pida), `--max-sources` y `--max-chars` acotan el paquete. `--plan --json` imprime el plan, incluidos los archivos omitidos con sus motivos, como JSON; su `budgetTokens` es `null` en el análisis de documentación por defecto.

### Candidatas orientadas al objetivo

`--objective "<text>"` indica el objetivo actual. La guía pide entonces dos tipos de candidatas: las de `OBJECTIVE: task`, útiles para el objetivo, y las de `OBJECTIVE: durable`, que vale la pena conservar después. La gramática de candidatas también admite `SCOPE: workspace|global`, `APPLIES_TO: <globs>` (hasta 8 globs relativos) y `DIRECTIVE: <line>` (hasta 160 caracteres); consulte [save-session](save-session.md#candidate-fields). Las candidatas `OBJECTIVE: task` aprobadas van al [nivel de trabajo](save-session.md#working-memory-promote-and-prune).

### Frescura

Las memorias de código, configuración y manifiestos registran el hash de su resumen (`source_hash_mode: digest`), de modo que las ediciones que solo cambian espacios en blanco o el cuerpo no las dejan obsoletas; las memorias de documentación registran el hash del archivo sin procesar. `engram verify --sources` registra las fuentes modificadas o ausentes en el archivo `stale.json`, ignorado por Git, y `engram take-control --refresh` vuelve a resumir solo esas fuentes y propone una candidata `UPDATE: <id>` por cada memoria obsoleta a través de la puerta de aprobación normal. Consulte [verify](verify-repair-quality.md#verify).

### Memorias del host

`--from claude-auto-memory|codex-memories` importa para revisión un almacén de memoria local del host en lugar de analizar el workspace. La memoria automática de Claude se lee de `~/.claude/projects/<project>/memory/` (o de `autoMemoryDirectory` en su configuración de Claude de usuario o local; `CLAUDE_CONFIG_DIR` reemplaza a `~/.claude`), y las memorias de Codex de `~/.codex/memories/`; `--dir <path>` sustituye el almacén cuando no puede localizarse sin ambigüedad. `type: feedback` propone una regla, `project` y `reference` proponen conocimiento, y `type: user`, los archivos sin tipo y el índice `MEMORY.md` se omiten. `--from` no puede combinarse con `--file`, `--include`, `--exclude`, `--kind`, `--all`, `--budget-tokens` ni `--refresh`.

Engram nunca escribe en un almacén del host. Las importaciones se redactan y se filtran contra inyecciones, pasan por la puerta de aprobación normal y registran `source: host-memory` con `source_files` relativos al preset (por ejemplo `claude-auto-memory/feedback_testing.md`, nunca una ruta del directorio personal). `engram verify --sources` comprueba la deriva solo en la máquina que contiene el almacén (en otras informa `host memory store not on this machine`). No existe un preset para Gemini.

## metacognize

```bash
engram metacognize --workspace
engram metacognize --global --dry-run
engram metacognize --all --force
```

Use `metacognize` cuando quiera que un agente de IA revise una carpeta de memoria de Engram existente y proponga una estructura más segura a través del mismo flujo de aprobación de save-session. Los agentes deben usar `UPDATE: memory-id` para consolidar o limpiar la redacción y `DEPENDS_ON: memory-id` para memorias en capas.


## Migración de memorias heredadas a schema v3

`engram upgrade --latest` también migra a schema v3 los archivos de memoria v1/v2 activos del workspace y de las raíces globales configuradas. Engram conserva exactamente cada cuerpo Markdown, escribe `backups/schema-v3/<memory-file>.pre-v3.bak` (una carpeta ignorada por Git; `engram repair --move-backups` reubica las copias de seguridad antiguas que quedaron junto a las memorias), rellena solo metadatos deterministas, actualiza los hashes de integridad y reconstruye el índice, el grafo y los sidecars vectoriales elegibles. Nunca inventa `evidence_refs`; una memoria sin vínculos de traza verificados se marca como `evidence_status: unverified`. Las memorias no válidas se informan y se omiten, las memorias archivadas no se reescriben y una segunda ejecución es idempotente.

Previsualice todos los cambios sin escribir:

```bash
engram upgrade --latest --plan
```

Ejecute solo la migración de memorias, sin sobrescribir los artefactos de agente vinculados:

```bash
engram upgrade --migrate-memories
```

Omita la migración de memorias durante una actualización latest:

```bash
engram upgrade --latest --no-migrate-memories
```

## Próximos pasos

- [profiles / workspaces / config](profiles-workspaces-config.md)
- [Resumen de integraciones de agentes](../integrations/overview.md)


<!-- configuration-upgrade-inventory -->
## Inventario de actualización de configuración

Tras actualizar un paquete, ejecute `engram upgrade --latest --plan` antes de `engram upgrade --latest`. El inventario compartido analiza las memorias, instrucciones, skillsets, configuraciones, hooks y plugins gestionados por Engram en el workspace y en el ámbito global. Los bytes escritos por personas se conservan; los archivos mixtos ambiguos se informan como conflictos. Consulte [Actualizaciones de configuración](../operations/configuration-upgrades.md).
