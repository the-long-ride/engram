# Guía de Operaciones

Esta página contiene el uso detallado para que el README pueda seguir siendo breve.

## Superficie de Comandos

| Necesidad | Comando |
| --- | --- |
| Cargar memoria de tarea | `engram load "<tarea>"` |
| Buscar memoria | `engram search "<tema>"` |
| Guardar una memoria | `engram save [rule\|workflow\|knowledge] "<texto>"` |
| Guardar varias memorias de sesión | `engram save-session` o `engram ss` |
| Extraer de chats recientes accesibles | `engram save-session --query-level 3` |
| Aceptar todos los candidatos de la sesión | `engram ss -a` |
| Extraer y aceptar chats recientes | `engram ss -a last 50 sessions` |
| Capturar nota cruda | `engram observe --file sesion.md` |
| Convertir guías/documentos existentes | `engram take-control --all` |
| Previsualizar toma de control | `engram take-control --plan` |
| Inspeccionar enrutamiento de grafos | `engram graph "<tema>"` |
| Comprobar hashes | `engram verify` |
| Encontrar archivos de memoria mal formados | `engram repair` |
| Archivar memoria errónea | `engram archive --reason "<motivo>" <id-o-archivo>` |
| Ajustar la fuerza de las reglas | `engram set-rule-variant strict\|balanced\|light\|off` |
| Definir destino de guardado predeterminado | `engram set-save-target workspace\|global\|both\|status` |
| Gestionar perfiles globales | `engram profile status\|create\|use\|merge` |
| Clonar memoria workspace/global | `engram clone-memory workspace global` |

Use `save-session` para propuestas de memoria de sesiones largas. Forma corta: `ss`.
Use `--query-level <n>` cuando el humano quiera que el agente extraiga memoria de hasta n chats humano-agente recientes y accesibles, en lugar de solo la sesión actual. La redacción natural `engram ss -a last 50 sessions` se normaliza a `engram save-session --query-level 50 --accept-all`.

Cuando más de 8 memorias coinciden con una consulta, `load` refina el conjunto amplio de candidatos en un paquete de contexto top 8. `load --dry-run` muestra conteos de candidatos y etiquetas para acotar; `load --all` devuelve intencionalmente toda memoria visible enrutada.

## Perfiles, Destinos de Guardado y Clonado

Use `set-save-target` para elegir dónde se guardan las memorias normales:

```bash
engram set-save-target status
engram set-save-target workspace
engram set-save-target global
engram set-save-target both
```

Use `profile` cuando la memoria global personal, de empresa o de equipo deba mantenerse aislada:

```bash
engram profile create personal --global-path ~/Documents/engram-personal --use
engram profile use company --workspace
engram profile merge personal company --dry-run
```

Use `clone-memory` para copiar Markdown activo de `rules/`, `skills/` y
`knowledge/` entre los alcances workspace y global:

```bash
engram clone-memory workspace global
engram clone-memory global workspace --force
```

## Guardar Sesión (Save Session)

Use `save-session` cuando una interacción larga haya producido múltiples candidatos:

```text
TYPE: rule | TEXT: Always run tests before release.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

Sin `--accept-all`, Engram pregunta qué candidatos guardar. Con `ss -a`, cada candidato generado se guarda porque el humano aprobó explícitamente ese atajo.
`--query-level` debe ser un entero positivo. Los agentes solo deben incluir chats a los que realmente puedan acceder y no deben inventar historial no disponible. `engram ss -a last 50 sessions` usa `50` como query level y `-a` como aprobación humana explícita.

## Tomar Control (Take Control)

`take-control` ayuda a adoptar Engram en repositorios existentes. Escanea guías del agente, notas, documentos y archivos seleccionados, luego pide al agente candidatos concisos.

Selectores útiles:

```bash
engram take-control --plan
engram take-control --all
engram take-control --file AGENTS.md
engram take-control --dir docs
engram take-control --include "docs/**/*.md" --exclude "docs/private/**"
engram take-control --max-sources 5 --max-chars 900
```

Las memorias guardadas por `take-control` registran `source_files` y `source_hashes`, por lo que las fuentes que no hayan cambiado se omitirán más tarde.

## Observar (Observe)

`observe` almacena notas crudas desinfectadas en `inbox/`. Las notas de la bandeja de entrada (inbox) no son memoria activa.

```bash
engram observe --file sesion.md
engram save-session --file .agents/.engram/inbox/<nota>.md
```

Use esto cuando desee conservar notas preliminares antes de decidir qué debe convertirse en memoria duradera.

## Reparación y Revisión

Use `repair` después de ediciones manuales o importaciones:

```bash
engram repair
engram rebuild-index
engram verify
```

Use comprobaciones de grafos y calidad antes de archivar:

```bash
engram graph "package manager"
engram quality-check
engram archive --reason "Repo migrated to npm." rules/use-pnpm.md
```

Siguiente: [Comparación y hoja de ruta](comparison.md).
