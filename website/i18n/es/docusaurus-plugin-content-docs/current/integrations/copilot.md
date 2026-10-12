---
title: Copilot
sidebar_position: 8
description: Integración de Engram con GitHub Copilot mediante instrucciones personalizadas del repositorio y del usuario.
---

# Copilot

GitHub Copilot lee las instrucciones personalizadas del repositorio desde `.github/copilot-instructions.md`. Para instalaciones globales de Copilot, Engram añade su bloque gestionado a `~/.copilot/copilot-instructions.md`.

## Instalación {#install}

```bash
engram link copilot
```

## Archivos escritos {#files-written}

| Archivo | Propósito |
| --- | --- |
| `.github/copilot-instructions.md` | Instrucciones personalizadas del repositorio |

## Instalación global {#global-install}

```bash
engram link --global copilot
```

Añade un bloque gestionado a `~/.copilot/copilot-instructions.md`.

## Destino de respaldo compacto/manual {#compact-manual-fallback-target}

Copilot es un destino de respaldo compacto/manual. Recibe el protocolo compacto completo. La instalación de hooks se omite en v1; use el skillset de Engram o un `engram load` manual para obtener contexto.

## Próximos pasos {#next-steps}

- [Resumen de integraciones de agentes](overview.md)
- [Hooks y líneas de prueba](hooks.md)
