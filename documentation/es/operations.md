# Guía de Operaciones

Esta página contiene el uso detallado para que el README pueda mantenerse corto.

## Superficie de Comandos

| Necesidad | Comando |
| --- | --- |
| Cargar memoria de tarea | `engram load "<tarea>"` |
| Imprimir guía del agente de IA | `engram llm` |
| Vista previa de archivos enrutados | `engram load --dry-run "<tarea>"` |
| Buscar en la memoria | `engram search "<tema>"` |
| Guardar una memoria | `engram save [rule\|workflow\|knowledge] "<texto>"` |
| Guardar memorias de sesión | `engram save-session` o `engram ss` |
| Minar chats recientes accesibles | `engram save-session --query-level 3` |
| Aceptar todos los candidatos | `engram ss -a` |
| Minar y aceptar chats recientes | `engram ss -a last 50 sessions` |
| Capturar nota sin procesar | `engram observe --file session.md` |
| Convertir documentos existentes | `engram take-control --all` |
| Vista previa de importación | `engram take-control --plan` |
| Importar e integrar documentación | `engram take-control --all --metacognize --accept-all` |
| Reestructurar carpeta de memoria | `engram metacognize --workspace\|--global\|--all` |
| Resolver conflictos e integrar | `engram resolve-conflicts --metacognize` |
| Inspeccionar enrutamiento de grafo | `engram graph "<tema>"` |
| Verificar hashes | `engram verify` |
| Encontrar archivos mal formados | `engram repair` |
| Archivar memoria incorrecta | `engram archive --reason "<motivo>" <id-o-archivo>` |
| Ajustar fuerza de reglas | `engram set-rule-variant strict\|balanced\|light\|off` |
| Configurar destino de guardado | `engram set-save-target workspace\|global\|both\|status` |
| Configurar límite de carga | `engram set-load-limit 1..32\|status\|reset` |
| Configurar lecturas automáticas | `engram set-read startup\|auto\|always\|manual\|off\|status` |
| Configurar prueba de hooks | `engram set-proof off\|compact\|status` |
| Instalar hooks del agente | `engram install-agent-hooks codex\|claude\|gemini` |
| Administrar perfiles globales | `engram profile status\|create\|use\|merge` |
| Clonar memoria workspace/global | `engram clone-memory workspace global [--metacognize]` |

Use `save-session` para propuestas de memoria en sesiones largas. Forma corta: `ss`.
Use `--query-level <n>` cuando el humano desee que el agente mine hasta n chats recientes humano-agente accesibles en lugar de solo la sesión actual. La redacción natural como `engram ss -a last 50 sessions` se normaliza a `engram save-session --query-level 50 --accept-all`.

Use `load --dry-run` cuando desee inspeccionar qué archivos de memoria se enrutarían sin imprimir sus contenidos.
`load` primero ancla el enrutamiento en términos de consulta significativos, ignorando palabras de memoria genéricas como `rule`, `knowledge` y stopwords comunes. Luego refina el grupo de candidatos más amplio en un paquete de contexto compacto. La carga normal informa de los recuentos seleccionados y totales relacionados, como `loaded 8 memory files / 14 total related memories`. `load --dry-run` muestra los recuentos de candidatos, las etiquetas de estrechamiento y los motivos de coincidencia; `load --all` devuelve cada coincidencia enrutada visible en lugar de aplicar el límite compacto.
`workflow` y `workflows` todavía se enrutan a memorias de habilidades, pero las palabras de tipo genérico no crean una coincidencia amplia por sí mismas.

## Capas de Dependencias (Dependency Layers)

Use frontmatter `depends_on` cuando una memoria deba construirse sobre otra en lugar de repetirse:

```yaml
depends_on: [release-foundation]
level: advanced
```

Ejecute `engram graph --rebuild` después de las ediciones manuales. El grafo informa de las capas de dependencias, y `engram load` extrae los prerrequisitos enrutados en el mismo paquete de contexto compacto antes de las memorias más profundas. Los bordes relacionados con el grafo y los aciertos vectoriales no pueden cargar memorias no relacionadas por sí mismos; solo ayudan a volver a clasificar o expandir las memorias que ya coinciden con los términos de consulta significativos. Los prerrequisitos explícitos `depends_on` pueden seguir cargándose sin su propia coincidencia de palabras clave.

## Reconciliación de Actualizaciones (Upgrade Reconciliation)

Use `engram upgrade` después de instalar un paquete Engram más nuevo. El comando compara las raíces de memoria inicializadas desde la versión v0.0.8 en adelante con el esquema de la versión actual y actualiza los archivos HELP.md generados, los índices de memoria, los archivos de grafo, los sidecars vectoriales elegibles, los conjuntos de habilidades del espacio de trabajo generados, el andamiaje de la memoria global y los conjuntos de habilidades de agentes globales registrados mientras preserva los archivos creados por humanos. Los comandos normales también ejecutan la misma reconciliación de forma silenciosa una vez por versión del paquete, a menos que se configure `--no-auto-upgrade` o `ENGRAM_NO_AUTO_UPGRADE=1` se establezca.
Cuando `engram save` encuentra memorias activas relacionadas, la vista previa de aprobación informa de ellas con un `depends_on` sugerido o una advertencia de posible duplicado. Aceptar guarda la vista previa tal cual; rechace primero si desea reestructurar dependencias o archivar duplicados antes de guardar.
Para `save-session --accept-all`, Engram se detiene antes de escribir cuando aparecen esas sugerencias de memoria relacionadas. El agente debe usar la respuesta para proponer una nueva ejecución estructurada: agregar `DEPENDS_ON: memory-id` para las dependencias, `LEVEL: advanced` cuando una memoria es más profunda que su prerrequisito, o `UPDATE: memory-id` cuando un candidato deba fusionarse en un posible duplicado.

## Perfiles, Destinos de Guardado y Clonación

Use `set-save-target` para elegir a dónde van los guardados normales:

```bash
engram set-save-target status
engram set-save-target workspace
engram set-save-target global
engram set-save-target both
```

Use `profile` cuando la memoria global personal, de la empresa o del equipo deba permanecer aislada:

```bash
engram profile create personal --global-path ~/Documents/engram-personal --use
engram profile use company --workspace
engram profile merge personal company --dry-run
```

Use `clone-memory` para copiar Markdown activo de `rules/`, `skills/` y `knowledge/` entre los alcances de workspace y global:

```bash
engram clone-memory workspace global
engram clone-memory global workspace --force
```

Agregue `--metacognize` cuando desee que las memorias clonadas se propongan a través del flujo de aprobación save-session en lugar de copiarse textualmente.

## Reestructurar Memoria (Metacognize Memory)

Use `metacognize` cuando desee que un agente de IA revise una carpeta de memoria Engram existente y proponga una estructura más segura a través del mismo flujo de aprobación de save-session:

```bash
engram metacognize --workspace
engram metacognize --global --dry-run
engram metacognize --all --accept-all
```

El comando verifica las memorias activas `rules/`, `skills/` y `knowledge/` en el alcance seleccionado, devuelve un paquete de origen compacto cuando no se proporcionan candidatos, y luego escribe solo las líneas `TYPE: ... | TEXT: ...` generadas después de la aprobación. Los agentes deben usar `UPDATE: memory-id` para la consolidación o limpieza de la redacción y `DEPENDS_ON: memory-id` para memorias en capas. La redacción natural como `engram restructure workspace memory accept all` se normaliza a `engram metacognize --workspace --accept-all`.

## Guardar Sesión (Save Session)

Use `save-session` cuando una interacción larga haya producido múltiples candidatos:

```text
TYPE: rule | TEXT: Always run tests before release. | CONTEXT: Created from release planning so future agents preserve the test gate.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

`CONTEXT: ...` es opcional. Agréguelo solo cuando explique por qué existe la memoria, la situación de origen, el uso previsto o el límite. Las memorias de hechos simples pueden omitirlo y usar el contexto de aprobación predeterminado de Engram.

Sin `--accept-all`, Engram pregunta qué candidatos guardar. Con `ss -a`, se guarda cada candidato generado porque el humano aprobó explícitamente ese atajo.
Cuando una ejecución de accept-all informa de memorias relacionadas antes de escribir, no se guardó ningún archivo aún. El agente debe volver a ejecutar con candidatos estructurados como:

```text
TYPE: rule | TEXT: OAuth rotation follows release foundations. | DEPENDS_ON: release-foundation | LEVEL: advanced
TYPE: knowledge | TEXT: Invoice retries use exponential backoff. | UPDATE: invoice-retry-baseline
```

`--query-level` debe ser un entero positivo. Los agentes deben incluir solo chats a los que realmente puedan acceder y no deben inventar historial no disponible. `engram ss -a last 50 sessions` utiliza `50` como el nivel de consulta y `-a` como aprobación explícita del usuario.

## Tomar el Control (Take Control)

`take-control` ayuda a adoptar Engram en repositorios existentes. Escanea la guía del agente, notas, documentos y archivos seleccionados, luego pide al agente candidatos concisos.

Selectores útiles:

```bash
engram take-control --plan
engram take-control --all
engram take-control --file AGENTS.md
engram take-control --dir docs
engram take-control --include "docs/**/*.md" --exclude "docs/private/**"
engram take-control --max-sources 5 --max-chars 900
engram take-control --all --metacognize --accept-all
```

Las memorias de take-control guardadas registran `source_files` and `source_hashes`, por lo que las fuentes sin cambios se omiten más tarde.
Use `--metacognize` con accept-all cuando las sugerencias de memoria relacionadas deban pausar la escritura y permitir al agente volver a ejecutar con `UPDATE` o `DEPENDS_ON`.

## Resolver Conflictos con Reestructuración (Resolve Conflicts With Metacognition)

Use `resolve-conflicts` para previsualizar o resolver conflictos de memoria de workspace pertenecientes a Engram. Agregue `--metacognize` cuando el agente deba revisar la carpeta de memoria después del manejo de conflictos:

```bash
engram resolve-conflicts --dry-run --metacognize
engram resolve-conflicts --metacognize
engram resolve conflicts and metacognize
```

El comando mantiene el manejo determinista de conflictos en `.agents/.engram/`, luego agrega el paquete de origen metacognize de workspace para candidatos `TYPE/TEXT` concisos.

## Observar (Observe)

`observe` almacena notas sin procesar e higienizadas en `inbox/`. Las notas de inbox no son memoria activa.

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<nota>.md
```

Use esto cuando desee preservar notas provisionales antes de decidir qué debe convertirse en memoria duradera.

## Reparación y Revisión

Use `repair` después de ediciones manuales o importaciones:

```bash
engram repair
engram rebuild-index
engram verify
```

Use grafos y comprobaciones de calidad antes de archivar:

```bash
engram graph "package manager"
engram quality-check
engram archive --reason "Repo migrated to npm." rules/use-pnpm.md
```

Siguiente: [Comparación y hoja de ruta](comparison.md).
