---
title: Flujo de trabajo diario
sidebar_position: 4
description: El bucle diario de Engram — cargar, trabajar, buscar, guardar y mantener la memoria saludable.
---

# Flujo de trabajo diario

El bucle diario de Engram es intencionalmente simple: cargar la memoria al inicio, buscar cuando necesites más, guardar cuando surja algo duradero y auditar al final.

## Inicio de la sesión

```text
/engram load --for-agents "tarea actual"
```

O desde la terminal:

```bash
engram load --for-agents "<tarea>"
```

El agente debe responder con una línea de recuento compacta como `Engram loaded: 8 memories / 24 total related memories.` a menos que el humano solicite IDs, reglas o salida sin procesar.

## Durante el trabajo

Busca cuando la tarea cambie o sospeches que falta conocimiento del proyecto:

```text
/engram search "tema que podría faltarme"
```

Previsualiza qué archivos de memoria se enrutarían sin imprimir sus contenidos:

```bash
engram load --dry-run "<consulta>"
```

Devuelve cada coincidencia enrutada visible en lugar del límite compacto:

```bash
engram load --all "<consulta>"
```

## Guardar un dato duradero

```text
/engram save knowledge
```

`engram save` captura el mejor candidato de memoria única, actualiza automáticamente una memoria coincidente o crea una nueva, y siempre muestra la puerta de aprobación A/B/C antes de escribir.

## Guardar varias memorias de una sesión

```text
/engram save-session
/engram ss
```

Proporciona candidatos con esta forma:

```text
TYPE: rule | TEXT: Always run tests before release. | CONTEXT: Created from release planning so future agents preserve the test gate.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

`CONTEXT: ...` es opcional. Agrégalo solo cuando explique por qué existe la memoria.

## Extraer chats recientes

```text
/engram save-session --query-level 3
/engram ss -a last 50 sessions
```

`--query-level` debe ser un entero positivo. El agente puede usar hasta esa cantidad de sesiones de chat recientes entre humano y agente, incluida la actual, y no debe inventar historial no disponible.

## Atajo para aceptar todo

```text
/engram ss -a
```

`-a` significa que el humano aprueba explícitamente cada candidato recomendado por el agente. Los agentes no deben agregar `--accept-all` a menos que el humano lo haya solicitado.

Cuando una ejecución de aceptar todo informa memorias relacionadas antes de escribir, no se guardó ningún archivo aún. El agente debe volver a ejecutar con candidatos estructurados:

```text
TYPE: rule | TEXT: OAuth rotation follows release foundations. | DEPENDS_ON: release-foundation | LEVEL: advanced
TYPE: knowledge | TEXT: Invoice retries use exponential backoff. | UPDATE: invoice-retry-baseline
```

## Enrutamiento de roles (Role routing)

Guardar memoria específica del rol:

```bash
engram save --role frontend ...
engram save-session --role backend ...
```

Ajustar el enrutamiento de roles:

```bash
engram set-role frontend
engram set-role backend security
engram set-role
```

Cuando `engram set-role ...` o `engram set-rule-variant ...` tiene éxito, la CLI devuelve una línea `Agent action:`. Los adaptadores de comandos slash y hosts MCP compatibles con Engram deben volver a ejecutar inmediatamente `engram load "<tarea/solicitud actual>"` y tratar ese resultado como reemplazo del contexto cargado previamente por Engram.

## Fin del trabajo significativo

```text
Check Engram health, report invalid memories, and propose anything worth saving from this session.
```

Comandos útiles:

```bash
engram upgrade
engram verify
engram repair
engram graph "<tema>"
engram quality-check
engram archive --reason "<por-qué>" <id-o-archivo>
```

## Siguientes pasos

- [Referencia de CLI](cli/overview.md)
- [Resolución de problemas de operaciones](operations/troubleshooting.md)
- [Interfaz Web de Entry](entry/index.md)
