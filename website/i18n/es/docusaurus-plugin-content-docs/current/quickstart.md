---
title: Inicio rápido con agentes de IA
sidebar_position: 2
description: Empiece a usar Engram a través de su agente de IA. Cargue memoria, haga el trabajo y proponga memoria duradera cuando surja algo útil.
---

# Inicio rápido con agentes de IA

Use Engram primero a través de su agente. La CLI existe, pero la mejor experiencia es esta: pida al agente que cargue memoria, haga el trabajo y proponga memoria duradera cuando surja algo útil.

## Aprobación en el chat del agente de IA

En el chat del agente de IA, la aprobación de Engram es conversacional. El agente muestra primero las candidatas `TYPE: ... | TEXT: ...` ya refinadas, cada una con su línea `Verdict:`, y la redacción balanced para las reglas (Light y Strict se derivan cuando la regla se presenta, salvo que una candidata aporte variantes personalizadas). Responda `yes` para guardar las candidatas exactas, `audit` para revisarlas o `cancel` para detenerse. Tras `yes`, el agente usa `engram save-session --force` con las candidatas exactas aprobadas. Los guardados directos desde la terminal siguen usando A/B/C salvo que se haya invocado explícitamente un comando de fuerza.

## Primer mensaje en una sesión nueva

Pregunte:

```text
Use Engram for this task. Load memory for: <what we are doing>.
```

Si los adaptadores slash están instalados:

```text
/engram load "<current task>"
```

Por defecto, el agente debe responder con una línea de recuento compacta, como `Engram loaded: 8 memories / 24 total related memories.` Con los adaptadores slash, `load` es la ruta orientada al agente.

Cuando un agente necesite una guía de uso de Engram autocontenida, ejecute:

```bash
engram llm
```

Esto imprime la guía `llm.txt` empaquetada y no requiere `engram inject`.

## Conversación de configuración recomendada

Pida al agente:

```text
Inject Engram memory routing for this workspace, configure it, and connect this agent.
```

El agente sugerirá ejecutar:

```bash
engram entry
```

Para configurar la memoria y vincular agentes de IA en una interfaz web limpia. Internamente, para inicializar el workspace:

```bash
engram inject
```

Para vincular el mismo agente globalmente, de modo que los workspaces nuevos puedan cargar la memoria global de Engram sin ejecutar antes `engram inject`:

```bash
engram link --global <agent-name>
```

Para un uso nativo del chat, pida:

```text
Install slash support so I can use /engram directly from this agent.
```

## Bucle diario

Al empezar:

```text
/engram load "current task"
```

Durante el trabajo:

```text
/engram search "topic I might be missing"
```

Cuando el agente aprende un hecho duradero:

```text
/engram save knowledge
```

Cuando la sesión produjo varias reglas, hechos o flujos de trabajo útiles:

```text
/engram save-session
```

Forma corta:

```text
/engram ss
```

Para incluir el historial de chat reciente al que el agente puede acceder realmente:

```text
/engram save-session --query-level 3
```

`--query-level` debe ser un entero positivo. El agente puede usar hasta esa cantidad de sesiones de chat recientes entre personas y agentes, incluida la actual, y no debe inventar historial no disponible.

Atajo de fuerza solo cuando realmente lo quiera:

```text
/engram ss -f
```

`-f` significa que la persona aprueba explícitamente todas las candidatas recomendadas por el agente. Los agentes no deben añadirlo por su cuenta.

Para extraer los chats recientes accesibles y guardar a la fuerza las candidatas generadas en una sola petición:

```text
/engram ss -f last 50 sessions
```

Eso se normaliza a `engram save-session --query-level 50 --force`.

<!-- evidence-foundation:v3:start -->
## Memoria respaldada por evidencia

Capture una fuente antes de decidir qué debe volverse duradero:

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<observation>.md
```

Revise el envoltorio antes de la promoción. El envoltorio es editable, pero el contenido aprobado se recupera de la traza inmutable. La memoria final lleva `evidence_refs`, de modo que la futura revisión en la CLI y en la Web UI pueda seguir su procedencia.
<!-- evidence-foundation:v3:end -->

## Importar conocimiento existente

Para un repositorio que ya tiene `AGENTS.md`, `CLAUDE.md`, reglas de Cursor, notas o documentación:

```text
/engram take-control --plan
/engram take-control --all
```

Use `--plan` primero cuando quiera ver los archivos seleccionados, los archivos omitidos, las estimaciones de tokens y los tipos de memoria probables.

## Memoria global

Use la memoria global para preferencias que deben acompañarle entre repositorios:

```text
Set up global Engram memory at <path>, then save this preference globally:
Use pnpm for package management.
```

El agente puede usar:

```bash
engram inject --global-only --global-path <path>
engram save --scope global "Use pnpm for package management."
engram link --global <agent-name>
```

Cuando inject ve memoria global configurada, crea o selecciona un perfil de usuario por defecto para esa raíz global, de modo que los workspaces futuros puedan reutilizarla.

## Mantenerla saludable

Pida al agente, al final de un trabajo significativo:

```text
Check Engram health, report invalid memories, and propose anything worth saving from this session.
```

Comandos útiles:

```bash
engram upgrade
engram upgrade --plan
engram verify
engram repair
engram graph "<topic>"
engram quality-check
engram archive --reason "<why>" <id-or-file>
```

## Próximos pasos

- [Flujo de trabajo diario](daily-workflow.md)
- [Instalar y configurar](install.md)
- [Protocolo propiedad de las personas](concepts/protocol.md)


<!-- configuration-upgrade-inventory -->
## Inventario de actualización de configuración

Tras actualizar un paquete, ejecute `engram upgrade --latest --plan` antes de `engram upgrade --latest`. El inventario compartido analiza las memorias, instrucciones, skillsets, configuraciones, hooks y plugins gestionados por Engram en el workspace y en el ámbito global. Los bytes escritos por personas se conservan; los archivos mixtos ambiguos se informan como conflictos. Consulte [Actualizaciones de configuración](operations/configuration-upgrades.md).
