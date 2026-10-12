---
title: Hooks y líneas de prueba
sidebar_position: 12
description: Los hooks de agente de Engram inyectan memoria enrutada al inicio de la sesión y en los turnos de prompt. Las líneas de prueba hacen visible la inyección.
---

# Hooks y líneas de prueba {#hooks-and-proof-lines}

Los hooks de agente son hooks de host opcionales que inyectan el contexto enrutado de Engram al inicio de la sesión y en los turnos posteriores de cambio de tarea cuando el host expone un canal seguro de contexto en tiempo de prompt.

## Instalar hooks {#install-hooks}

```bash
engram link codex
engram link claude
engram link gemini
engram link cursor
engram link windsurf
engram link --global opencode
engram set-proof compact
```

Use `--global` para la configuración a nivel de usuario y `engram unlink` para eliminar solo las entradas de hooks administradas por Engram.

## Modo de lectura {#read-mode}

`engram set-read startup|auto|always|manual|off` controla el comportamiento en tiempo de ejecución:

- `auto` carga al inicio de la sesión y en los turnos de prompt posteriores, inyectando solo cuerpos de memoria que no se hayan entregado previamente en la sesión.
- `startup` carga solo al inicio de la sesión.
- `always` reinvierte e inyecta en cada turno elegible.
- `manual` y `off` reducen la automatización.

La caché de hooks almacena hashes, IDs de sesión, host, cwd y las claves de memoria ya entregadas por sesión — nunca el texto sin formato del prompt.

## Inyección delta {#delta-injection}

Para cada (host, cwd, sesión), el hook registra las claves que ha entregado. Un turno de prompt solo inyecta los cuerpos aún no entregados y finaliza con una línea `already loaded: <ids>` para el resto; un turno sin novedades solo inyecta esa línea (junto con la línea de prueba, cuando la prueba está activada), y un turno que no enruta nada no inyecta memoria. `SessionStart` y `PreCompact` restablecen el conjunto, por lo que la memoria se entrega nuevamente después de una nueva sesión o una compactación de contexto. Los registros con más de 7 días se purgan y se conservan como máximo 200. OpenCode mantiene una única ranura de prompt del sistema, por lo que su plugin reemplaza o conserva la ranura actual en lugar de enviar un delta estricto.

## Límites de carga útil {#payload-caps}

Los hosts truncan la salida de hook excesiva, por lo que el hook mide el `additionalContext` renderizado en la unidad propia de cada host: como máximo 2,400 tokens en Codex (bytes UTF-8 / 4; Codex limita un mensaje a unos 2,500 tokens), como máximo 9,500 caracteres en Claude (límite 10,000) y `load.max_tokens` en otros lugares. Cuando el texto supera el límite, el hook vuelve a planificar con un presupuesto menor: los cuerpos se degradan a tarjetas de una línea y las tarjetas peor clasificadas se omiten; un cuerpo nunca se corta a mitad de texto. El mismo límite cubre `SubagentStart` y la salida de activadores de ruta, y solo los cuerpos realmente enviados se registran como entregados. Los IDs de `already loaded:` están ordenados y el `sig` de prueba aplica hash a las claves enrutadas ordenadas, de modo que el mismo conjunto enrutado siempre imprime los mismos bytes.

## Activadores basados en rutas {#path-scoped-triggers}

Las instalaciones de hooks de Claude, Codex y Gemini también registran un activador de ruta. Codex siempre utiliza `PreToolUse` y Gemini utiliza `AfterTool`. Claude utiliza `InstructionsLoaded` bajo `hooks.path_rules native` (el valor predeterminado) y `PreToolUse` bajo `hooks.path_rules hook`:

- Claude `InstructionsLoaded` (coincidencia `path_glob_match`, asíncrono, salida ignorada) se activa cuando Claude carga un archivo generado `.claude/rules/engram/<id>.md`, y registra esa memoria en el conjunto entregado y en `usage.json`. El propio archivo de regla contiene el cuerpo, por lo que nada se inyecta dos veces.
- Claude `PreToolUse` (modo hook) coincide con `Read`, `Edit`, `Write` y `MultiEdit` y utiliza `tool_input.file_path`.
- Codex no tiene herramientas de lectura ni de edición múltiple, y `PreToolUse` no se activa con lecturas, por lo que solo se activan los archivos editados a través de `apply_patch`.
- Gemini `AfterTool` (coincidencia `read_file|write_file|replace`, tiempo de espera en milisegundos) lee la ruta afectada desde la entrada de la herramienta y agrega las memorias al resultado de la herramienta, de modo que llegan un paso después de la lectura. El comparador de Gemini es una expresión regular no anclada, por lo que el hook también se inicia para herramientas cuyos nombres simplemente contienen `replace`; finaliza con `{}` para ellas. Comparte el conjunto entregado con `BeforeAgent`.

Cuando la ruta afectada (relativa al directorio de trabajo) coincide con los globs `applies_to` de una memoria que aún no se ha entregado, el hook inyecta hasta 3 cuerpos por evento como `additionalContext`. Nunca devuelve una decisión de permiso, por lo que no puede bloquear una llamada a una herramienta, y las rutas fuera del directorio de trabajo se ignoran. El texto del prompt que menciona una ruta de archivo real también cuenta como un ancla para memorias `applies_to`.

Ejecute `engram upgrade --latest` (o `engram link <host>` nuevamente) una vez para agregar el activador de ruta (`InstructionsLoaded` o `PreToolUse`) y `PreCompact` (Gemini: `PreCompress`) a una instalación anterior; una instalación existente de Claude cambia de `PreToolUse` a `InstructionsLoaded` en esa actualización, así que ejecute primero `engram config set hooks.path_rules hook` para mantener `PreToolUse`; `engram upgrade` simple no actualiza las configuraciones de hooks. Claude, Codex y Cursor leen el `timeout` del hook en segundos; las entradas administradas escriben `10`.

## Subagentes {#subagents}

Las instalaciones de hooks de Claude y Codex también registran `SubagentStart` (coincidencia `*`, todos los tipos de agente). Inyecta el contexto enrutado de `current session` en el subagente como contexto adicional y nunca devuelve una decisión. Los hooks de subagente llevan el `session_id` del padre, por lo que el conjunto entregado del subagente tiene como clave `<session_id>#agent:<agent_id>` y el conjunto del padre nunca se modifica; se conservan como máximo 100 registros de subagente para que no puedan desalojar sesiones padre. La salida de `SubagentStart` de Codex omite `suppressOutput`, que Codex no enumera para ese evento. Se aplica el mismo límite de carga útil. Brecha conocida: Codex no documenta `agent_id` en `PreToolUse`, por lo que un activador de ruta dentro de un subagente de Codex puede registrarse en el conjunto entregado del padre.

## Cola de transcripciones de sesión (opcional) {#session-transcript-queue-opt-in}

`engram link claude --session-end` y `engram link codex --session-end` también registran un hook de comando `SessionEnd` (tiempo de espera de Claude de 5 segundos, Codex de 3 segundos). Es un hook de comandos simple: no inyecta nada, responde `{}`, falla abierto y solo añade `{ transcript_path, host, session, at }` al archivo ignorado por git `session-queue.json` en la carpeta de memoria del espacio de trabajo. Las entradas se escriben bajo un bloqueo de archivo, se deduplican por host y sesión, y se limitan a las 50 más recientes. La opción está desactivada por defecto, `engram upgrade` nunca la añade (se conserva una entrada existente), `engram unlink` la elimina y Gemini no se registra. La ruta almacenada es absoluta y menciona a su usuario del sistema operativo, por lo que el archivo nunca sale de su máquina.

Vacíe la cola con `engram observe --queue` (`--dry-run` solo inspecciona, `--limit n` limita las entradas por ejecución). Cada transcripción debe existir, ser un archivo normal (ni enlace simbólico ni físico) y tener como máximo 5 MiB. Se redacta, se eliminan las líneas similares a inyecciones y se almacena como una traza más una envoltura de bandeja de entrada que nunca menciona la ruta absoluta. Las entradas omitidas o almacenadas salen de la cola; las que alcanzan la cuota de la bandeja de entrada (`max_files` en el archivo opcional `.agents/engram.transcripts.json`) permanecen. No se escribe memoria: promocione un archivo de la bandeja de entrada con `engram save-session --file <inbox file>` y la puerta de aprobación habitual. Ejecute `observe --queue` usted mismo o desde un hook de comando simple, no desde un hook asíncrono de Codex.

## Modo de prueba {#proof-mode}

`engram set-proof off|compact` controla si los hooks compatibles también añaden una línea compacta `Engram proof:` en cada turno elegible. La visibilidad de la prueba es independiente de `set-read`: `compact` puede informar sobre turnos cargados, reutilizados u omitidos sin cambiar cuándo se inyecta la memoria completa de Engram.

## Matriz de capacidades de hooks {#hook-capability-matrix}

| Host | Ruta de configuración | Eventos |
| --- | --- | --- |
| `codex` | `.codex/hooks.json`; global `~/.codex/hooks.json` | `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PreCompact`, `SubagentStart` (`SessionEnd` opcional) |
| `claude` | `.claude/settings.json`; global `~/.claude/settings.json` | `SessionStart`, `UserPromptSubmit`, `InstructionsLoaded` (`PreToolUse` cuando `hooks.path_rules hook`), `PreCompact`, `SubagentStart` (`SessionEnd` opcional) |
| `gemini` | `.gemini/settings.json`; global `~/.gemini/settings.json` | `SessionStart`, `BeforeAgent`, `AfterTool`, `PreCompress` |
| `cursor` | `.cursor/hooks.json`; plugin global `hooks/hooks.json` | `sessionStart` |
| `windsurf` / `cascade` | `.windsurf/hooks.json`; global `~/.codeium/windsurf/hooks.json` | `pre_user_prompt` |
| `opencode` | `~/.config/opencode/plugins/engram.js` | `chat.message`, `experimental.chat.system.transform` |
| `copilot` | Ninguno escrito | N/A |
| `cline` | Ninguno escrito | N/A |

## Pasos siguientes {#next-steps}

- [Visión general de integraciones de agentes](overview.md)
- [CLI: inject / link / upgrade](../cli/inject-link-upgrade.md)
