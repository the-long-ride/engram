# Guía De Operaciones

## Comandos Principales

| Necesidad | Comando |
| --- | --- |
| Cargar memoria | `engram load "<task>"` |
| Buscar | `engram search "<topic>"` |
| Guardar una memoria | `engram save [rule|workflow|knowledge] "<text>"` |
| Guardar sesión | `engram save-session` o `engram ss` |
| Aceptar todo | `engram ss -a` |
| Capturar nota cruda | `engram observe --file session.md` |
| Importar docs/guidance | `engram take-control --all` |
| Previsualizar takeover | `engram take-control --plan` |
| Ver grafo | `engram graph "<topic>"` |
| Verificar hashes | `engram verify` |
| Encontrar archivos inválidos | `engram repair` |
| Archivar memoria incorrecta | `engram archive --reason "<why>" <id-or-file>` |
| Ajustar fuerza de reglas | `engram set-rule-variant strict|balanced|light|off` |

Usa `save-session` para propuestas de memoria de sesiones largas. Forma corta: `ss`.

## Save Session

```text
TYPE: rule | TEXT: Always run tests before release.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

Sin `--accept-all`, Engram pregunta qué candidatos guardar. Con `ss -a`, guarda todos porque el humano aprobó explícitamente.

## Take Control

```bash
engram take-control --plan
engram take-control --all
engram take-control --file AGENTS.md
engram take-control --dir docs
engram take-control --include "docs/**/*.md" --exclude "docs/private/**"
engram take-control --max-sources 5 --max-chars 900
```

Las memorias guardadas registran `source_files` y `source_hashes`.

## Observe

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<note>.md
```

Las notas de `inbox/` no son memoria activa hasta que se convierten.

## Repair Y Review

```bash
engram repair
engram rebuild-index
engram verify
engram graph "package manager"
engram quality-check
engram archive --reason "Repo migrated to npm." rules/use-pnpm.md
```

Siguiente: [Comparación](comparison.md).
