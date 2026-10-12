---
title: save / save-session / observe
sidebar_position: 3
description: Comandos de escritura — guardar una memoria, guardar varias desde una sesión y capturar notas sin procesar.
---

# save / save-session / observe

Los comandos de escritura proponen memoria a través de la puerta de aprobación.

## save

```bash
engram save [rule|workflow|knowledge] "<text>"
engram save --role frontend "<text>"
engram save --scope global "<text>"
```

`engram save` captura la mejor candidata de memoria individual, actualiza automáticamente una memoria coincidente o crea una nueva, y muestra siempre la puerta de aprobación A/B/C antes de escribir.

Cuando `engram save` encuentra memorias activas relacionadas, la vista previa de aprobación las informa con una sugerencia de `depends_on` o una advertencia de posible duplicado.

## save-session

```bash
engram save-session
engram ss
engram save-session --query-level 3
engram ss -f
engram ss -f last 50 sessions
engram save-session --file transcript.md
engram save-session --force
```

Use `save-session` cuando una interacción larga haya producido varias candidatas:

```text
TYPE: rule | TEXT: Always run tests before release. | CONTEXT: Created from release planning so future agents preserve the test gate.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

`CONTEXT: ...` es opcional. Añádalo solo cuando explique por qué existe la memoria. Las candidatas también pueden añadir campos `DEPENDS_ON`, `LEVEL` o `UPDATE` al reestructurar memoria relacionada.

- `--query-level <n>` — extrae hasta n chats recientes accesibles entre personas y agentes; debe ser un entero positivo; los agentes no deben inventar historial no disponible
- `--force` / `-f` — se guarda toda candidata generada porque la persona aprobó explícitamente ese atajo
- `--file <path>` — para transcripciones o resúmenes largos que ya están en disco

### Veredictos de guardado

Cada vista previa de candidata (CLI, MCP y Entry) imprime una línea `Verdict:` justo después de `File:`: `ADD`, `UPDATE <id>`, `SUPERSEDE <id>` o `NOOP duplicate of <id>`. El veredicto es determinista (usa las puntuaciones existentes de deduplicación y de memorias relacionadas; sin llamadas a un modelo). `A` y `B` omiten las candidatas `NOOP` y las listan como omitidas; `A 1,3` escribe exactamente las numeradas. Aprobar un `SUPERSEDE` escribe `supersedes: [old]` en la memoria nueva y `lifecycle: superseded` en la anterior, de modo que `engram load` la descarta. `--force` y el autoguardado nunca aplican un `SUPERSEDE`: se aplaza hasta que vuelva a ejecutar sin `--force` y lo revise.

<a id="candidate-fields"></a>
### Campos de candidata

Además de `CONTEXT`, `DEPENDS_ON`, `LEVEL` y `UPDATE`, una candidata puede incluir:

| Campo | Significado |
| --- | --- |
| `OBJECTIVE: task` o `durable` | `task` guarda en el [nivel de trabajo](#working-memory-promote-and-prune); por defecto `durable` |
| `SCOPE: workspace` o `global` | Anula el ámbito del comando para esta candidata. La vista previa de aprobación indica el destino en su línea `Scope:`. Con `--force`, una candidata cuyo ámbito queda fuera del ámbito del comando se aplaza, no se escribe |
| `APPLIES_TO: <globs>` | Hasta 8 globs relativos; la memoria se inyecta cuando se lee o edita un archivo que coincide |
| `DIRECTIVE: <line>` | Una línea de como máximo 160 caracteres, que se muestra en la tarjeta de la memoria |

```text
TYPE: rule | TEXT: Route commands through MediatR. | DIRECTIVE: Route commands through MediatR | APPLIES_TO: src/Api/**
```

Los nombres de campo no distinguen mayúsculas de minúsculas en el formato con `|`. En el formato multilínea solo se reconocen en mayúsculas, de modo que las líneas de prosa normales como `Scope: the billing module` siguen siendo contenido.

Para `/engram take-control --force` o el natural `/engram take control force`, el adaptador slash normaliza la redacción, genera únicamente candidatas concisas `TYPE: ... | TEXT: ...` y deja que Engram las guarde sin un segundo aviso de aprobación.

<a id="working-memory-promote-and-prune"></a>
## Memoria de trabajo: promover y podar

```bash
engram promote <id>
engram promote workspace:<id>
engram working note "<text>" [--objective "<text>"] [--type knowledge|rule] [--scope workspace|global]
engram working prune --dry-run
engram working prune
```

Una candidata `OBJECTIVE: task` aprobada se escribe en `.agents/.engram/working/` (o `<global>/working/`), ignorado por Git, con `tier: working`, el texto de `--objective` y `valid_until` = hoy + `load.working_ttl_days` (por defecto 14, rango de 1 a 365). La vista previa de aprobación muestra `Tier: working (expires <date>)`. Las memorias de trabajo se cargan, buscan y enrutan como las duraderas hasta que caducan; después salen de `load` con el motivo de omisión `lifecycle`. Las tarjetas y los cuerpos para agentes se etiquetan como `working`.

- `engram promote <id>` muestra una vista previa A/B/C y, al aprobar, mueve la memoria al almacenamiento duradero: elimina `tier` y `valid_until`, conserva `objective` e incrementa `revision`. Las memorias de trabajo caducadas no pueden promoverse. Use `workspace:<id>` o `global:<id>` cuando ambos ámbitos contengan el mismo id.
- `engram working prune` elimina las memorias de trabajo cuyo `valid_until` ya pasó y reconstruye índices, hashes y grafos; `--dry-run` las lista antes. La memoria duradera nunca se toca.
- `engram working note "<text>"` guarda una nota de tarea (`source: note`, tipo por defecto `knowledge`, se permite `--type rule`) en el nivel de trabajo. El texto se redacta y se rechazan las líneas que parecen instrucciones. Un único aviso Y/C controla la escritura y cancelar no escribe nada. Una nota nunca actualiza una memoria duradera con el mismo id. El inicio de sesión la omite salvo que `ENGRAM_SESSION_OBJECTIVE` coincida con el `--objective` de la nota; en caso contrario aparece como una tarjeta. Promuévala con `engram promote <id>`.

Las memorias de trabajo nunca llegan a Git, y sus entradas de índice, grafo y hash permanecen en sidecars locales bajo `working/`.

## observe

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<note>.md
```

`observe` almacena notas sin procesar saneadas en `inbox/`. Las notas del inbox no son memoria activa. Úselo cuando quiera conservar notas en bruto antes de decidir qué debe convertirse en memoria duradera.

<!-- evidence-foundation:v3:start -->
## Memoria respaldada por evidencia

```bash
engram observe --file session.md
# Output includes Trace: tr_... and the inbox wrapper path
engram save-session --file .agents/.engram/inbox/<observation>.md
```

La fuente inmutable vive en `.agents/.engram/traces/<trace-id>.jsonl`; el Markdown del inbox es solo un envoltorio de revisión. La promoción vuelve a abrir la traza y escribe la memoria aprobada con `evidence_refs` y `derived_from`. `engram observe --propose --file session.md` puede entrar de inmediato en el flujo de aprobación normal, pero sigue usando la traza como evidencia de origen. `engram observe --queue [--dry-run] [--limit n]` vacía la cola opcional de transcripciones de `SessionEnd` hacia las mismas trazas saneadas y envoltorios de inbox, y no escribe ninguna memoria.
<!-- evidence-foundation:v3:end -->

## Sugerencias de memorias relacionadas

Cuando una ejecución de aceptar todo informa de memorias relacionadas antes de escribir, todavía no se ha guardado ningún archivo. El agente debe volver a ejecutar con candidatas estructuradas:

```text
TYPE: rule | TEXT: OAuth rotation follows release foundations. | DEPENDS_ON: release-foundation | LEVEL: advanced
TYPE: knowledge | TEXT: Invoice retries use exponential backoff. | UPDATE: invoice-retry-baseline
```

## Próximos pasos

- [inject / link / upgrade](inject-link-upgrade.md)
- [Conceptos: ruta de escritura y aprobación](../concepts/write-path.md)


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
