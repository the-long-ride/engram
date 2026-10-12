---
title: Resumen de comandos
sidebar_position: 1
description: Mapa de todos los comandos de la CLI de Engram y de lo que hace cada uno.
---

# Resumen de comandos

Ejecute `engram -h` para ver la superficie compacta de comandos. Ejecute `engram help <topic>` o `engram -h <topic>` para ver ejemplos y casos de uso específicos de cada comando.

## Mapa de comandos

| Necesidad | Comando |
| --- | --- |
| Cargar la memoria de una tarea | `engram load "<task>"` |
| Cargar la memoria compacta de una tarea | `engram load "<task>"` |
| Imprimir la guía de uso para agentes de IA | `engram llm` |
| Previsualizar los archivos de memoria enrutados | `engram load --dry-run "<task>"` |
| Cargar con un límite de tokens | `engram load --budget-tokens 800 "<task>"` |
| Imprimir todos los cuerpos empaquetados | `engram load --disclosure full "<task>"` |
| Obtener tarjetas por id | `engram load --id <id>,<id>` |
| Buscar en la memoria | `engram search "<topic>"` |
| Guardar una memoria | `engram save [rule\|workflow\|knowledge] "<text>"` |
| Guardar varias memorias de la sesión | `engram save-session` o `engram ss` |
| Extraer de los chats recientes accesibles | `engram save-session --query-level 3` |
| Guardar a la fuerza las candidatas de la sesión | `engram ss -f` |
| Extraer y guardar a la fuerza los chats recientes | `engram ss -f last 50 sessions` |
| Capturar una nota sin procesar | `engram observe --file session.md` |
| Convertir documentos/guías existentes | `engram take-control --all` |
| Previsualizar la toma de control de fuentes | `engram take-control --plan` |
| Resumir código o configuración | `engram take-control --kind code --objective "<text>"` |
| Actualizar la memoria derivada de código obsoleta | `engram take-control --refresh` |
| Comprobar la frescura de las fuentes | `engram verify --sources` |
| Conservar una memoria de trabajo | `engram promote <id>` |
| Podar la memoria de trabajo caducada | `engram working prune [--dry-run]` |
| Ver los recuentos de obtención e inyección | `engram stats --usage` |
| Reestructurar una carpeta de memoria existente | `engram metacognize --workspace\|--global\|--all` |
| Resolver conflictos y metacognizar | `engram resolve-conflicts --metacognize` |
| Inspeccionar el enrutamiento del grafo | `engram graph "<topic>"` |
| Comprobar hashes | `engram verify` |
| Encontrar archivos de memoria mal formados | `engram repair` |
| Archivar una memoria incorrecta | `engram archive --reason "<why>" <id-or-file>` |
| Ajustar la firmeza de las reglas | `engram set-rule-variant strict\|balanced\|light\|off` |
| Definir el destino de guardado por defecto | `engram set-save-target workspace\|global\|both\|status` |
| Definir el límite de carga compacta | `engram set-load-limit 1..32\|status\|reset` |
| Definir las lecturas automáticas de los hooks | `engram set-read startup\|auto\|always\|manual\|off\|status` |
| Definir la visibilidad de la prueba del hook | `engram set-proof off\|compact\|status` |
| Instalar hooks de agente | `engram link codex\|claude\|gemini\|opencode\|cursor\|windsurf` |
| Gestionar perfiles globales | `engram profile status\|list\|create\|use\|merge` |
| Clonar la memoria de workspace/global | `engram clone-memory workspace global [--metacognize]` |

## Descubrimiento de comandos

```bash
engram help save-session
engram help set-role
engram -h set-rule-variant
```

Todos los comandos que aparecen en la ayuda incluyen alias cortos. Los alias dirigen al mismo comportamiento de la CLI y a las mismas puertas de aprobación que sus comandos canónicos.

## Autocompletado del shell

```bash
engram completion bash
engram completion zsh
engram completion powershell
```

## Próximos pasos

- [load / search / graph](load-search-graph.md)
- [save / save-session / observe](save-session.md)
- [inject / link / upgrade](inject-link-upgrade.md)


## Identidad de autor de Git

Engram puede almacenar un autor global y una anulación opcional por workspace. La resolución es workspace, global y, por último, un respaldo de Git de solo lectura. Los ajustes afectan solo a memorias futuras; una anulación de workspace nunca cambia la configuración global de Git. Use plan y confirmación explícitos para la sincronización con Git global o la migración de memorias heredadas.

```bash
engram author show
engram author set --name "Jane Doe" --email "jane@example.com"
engram author unset --scope workspace
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author migrate-memories --plan
engram author migrate-memories --confirm
```

Lea la [guía completa de ajustes del autor de Git](../operations/git-author-settings.md).
