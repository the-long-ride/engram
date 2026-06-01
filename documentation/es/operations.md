# Guía de Operaciones

Esta página contiene el uso detallado para que el README pueda seguir siendo breve.

## Superficie de Comandos

| Necesidad | Comando |
| --- | --- |
| Cargar memoria de tarea | `engram load "<tarea>"` |
| Buscar memoria | `engram search "<tema>"` |
| Guardar una memoria | `engram save [rule\|workflow\|knowledge] "<texto>"` |
| Guardar varias memorias de sesión | `engram save-session` o `engram ss` |
| Aceptar todos los candidatos de la sesión | `engram ss -a` |
| Capturar nota cruda | `engram observe --file sesion.md` |
| Convertir guías/documentos existentes | `engram take-control --all` |
| Previsualizar toma de control | `engram take-control --plan` |
| Inspeccionar enrutamiento de grafos | `engram graph "<tema>"` |
| Comprobar hashes | `engram verify` |
| Encontrar archivos de memoria mal formados | `engram repair` |
| Archivar memoria errónea | `engram archive --reason "<motivo>" <id-o-archivo>` |
| Ajustar la fuerza de las reglas | `engram set-rule-variant strict\|balanced\|light\|off` |

Use `save-session` para propuestas de memoria de sesiones largas. Forma corta: `ss`.

## Guardar Sesión (Save Session)

Use `save-session` cuando una interacción larga haya producido múltiples candidatos:

```text
TYPE: rule | TEXT: Always run tests before release.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

Sin `--accept-all`, Engram pregunta qué candidatos guardar. Con `ss -a`, cada candidato generado se guarda porque el humano aprobó explícitamente ese atajo.

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
