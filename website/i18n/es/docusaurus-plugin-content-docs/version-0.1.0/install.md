---
title: Instalar y configurar
sidebar_position: 3
description: Instalar la CLI de Engram, inicializar un espacio de trabajo, configurar la memoria global y vincular agentes de IA.
---

# Instalar y configurar

## Requisitos

- Node.js `>=20`
- Un agente de IA compatible (Codex, Claude, Gemini, Cursor, Windsurf, OpenCode, Copilot, Cline o cualquier host compatible con AGENTS.md)

## Instalar la CLI

```bash
npm install -g @the-long-ride/engram
```

Verificar:

```bash
engram --version
```

Se instalan dos binarios:

- `engram` — CLI principal
- `engram-mcp` — binario del servidor MCP para hosts que registran procesos de herramientas externos

## Inicializar un espacio de trabajo (workspace)

Desde la raíz del proyecto:

```bash
engram inject
```

Esto crea `.agents/.engram/` e instala el objetivo Codex compacto de forma predeterminada: `AGENTS.md` más `.agents/skills/engram/SKILL.md`.

Usa `engram inject --no-skillset` para omitir los archivos del agente, o `engram inject --skillset all` para instalar todos los adaptadores compatibles durante la inyección. Se omiten los archivos existentes escritos por humanos.

## Configurar con la interfaz Web de Entry

La ruta de configuración más amigable:

```bash
engram entry
```

Esto inicia un panel de control solo local. Configura las raíces de memoria, vincula agentes y ajusta el enrutamiento sin editar JSON a mano. Consulta [Interfaz Web de Entry](entry/index.md) para ver cada pestaña y campo.

## Configurar la memoria global

La memoria global es opcional y reside donde la configures. Guarda preferencias y contexto de equipo que deberían seguirte a través de los repositorios.

```bash
engram inject --global-only --global-path ~/Documents/engram
```

O actualiza la carpeta global más tarde:

```bash
engram update-global-folder ~/Documents/engram
engram ugf ~/Documents/engram
```

Las formas de estilo chat como `engram set global memory path to <new-path>` y `engram move global folder from <old-path> to <new-path>` se normalizan al mismo comando. Agrega `--move-from-path <old-path>` cuando también deseen que Engram mueva toda la raíz global antigua a la nueva ubicación.

## Vincular agentes de IA

Instala hooks de agente y registro MCP para un host:

```bash
engram link codex
engram link claude
engram link gemini
engram link cursor
engram link windsurf
engram link --global opencode
engram set-proof compact
```

`engram link all` instala el conjunto de objetivos públicos e informa razones deterministas `SKIPPED` para hosts parciales a través de archivos de instrucciones de conjunto de habilidades, configuración de MCP, adaptadores de comandos slash y hooks de agente en una sola instalación unificada. `engram unlink` elimina todos ellos juntos.

Consulta [Integraciones de agentes](integrations/overview.md) para ver la matriz de objetivos completa.

## Flujo de trabajo de subgrupamiento (Submodule)

Si el humano desea que `.agents/.engram` se rastree como un repositorio separado:

```bash
engram inject --submodule
```

Agrega `--submodule-remote <git-url>` solo después de que el humano proporcione una URL. Engram valida la URL, inicializa el submódulo en `main` y crea el primer commit del submódulo como `Initialize engram`.

## Origen Git global compartido

Si `engram entry` no muestra `global_git_detected.remote_url`, pregunta al humano si la memoria global debe compartirse a través de Git. Cuando proporcionen una URL:

```bash
engram inject --global-remote <git-url>
```

## Verificar la instalación

```bash
engram verify
engram load --dry-run "setup"
engram llm
```

`engram llm` imprime la guía de uso empaquetada del agente de IA y no requiere un espacio de trabajo inyectado.

## Siguientes pasos

- [Flujo de trabajo diario](daily-workflow.md)
- [Interfaz Web de Entry](entry/index.md)
- [Integraciones de agentes](integrations/overview.md)
