# Quickstart Con Agente IA

Usa Engram primero mediante el agente. El CLI existe, pero la mejor experiencia es pedir al agente que cargue memoria, haga el trabajo y proponga memoria durable al final.

## Primer Mensaje

```text
Usa Engram para esta tarea. Carga memoria para: <lo que estamos haciendo>.
```

Si hay slash adapters:

```text
/engram load "<current task>"
```

El agente debe resumir IDs/reglas relevantes, no pegar todos los archivos.

## Configuración Recomendada

```text
Inicializa Engram para este workspace, instala el skillset correcto para este agente
y dime qué comando debería usar después.
```

El agente puede ejecutar:

```bash
engram init
engram help install-skillset
engram install-skillset <agent-name>
```

Para usarlo desde el chat:

```text
Instala soporte slash para que pueda usar /engram directamente.
```

## Ciclo Diario

```text
/engram load "current task"
/engram search "topic I might be missing"
/engram save knowledge
/engram save-session
/engram ss
```

Usa accept-all solo si lo quieres explícitamente:

```text
/engram ss -a
```

`-a` significa aprobación humana para guardar todos los candidatos recomendados. El agente no debe añadirlo por su cuenta.

## Importar Conocimiento Existente

Para repos con `AGENTS.md`, `CLAUDE.md`, reglas de Cursor, notas o docs:

```text
/engram take-control --plan
/engram take-control --all
```

`--plan` muestra fuentes seleccionadas, omitidas, estimación de tokens y tipos de memoria probables.

## Memoria Global

```text
Configura memoria global de Engram en <path>, luego guarda esta preferencia global:
Use pnpm for package management.
```

Comandos posibles:

```bash
engram init --global-only --global-path <path>
engram save --scope global "Use pnpm for package management."
```

## Mantenimiento

```text
Revisa la salud de Engram, reporta memorias inválidas y propone qué vale la pena guardar de esta sesión.
```

```bash
engram verify
engram repair
engram graph "<topic>"
engram quality-check
engram archive --reason "<why>" <id-or-file>
```

Siguiente: [Protocolo](protocol.md).

