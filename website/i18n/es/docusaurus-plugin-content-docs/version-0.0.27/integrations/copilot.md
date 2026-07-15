---
title: Copilot
sidebar_position: 8
description: Integración de Engram con GitHub Copilot a través de instrucciones personalizadas del repositorio y del usuario.
---

# Copilot

GitHub Copilot lee las instrucciones personalizadas del repositorio desde `.github/copilot-instructions.md`. Para instalaciones globales de Copilot, Engram añade su bloque gestionado a `~/.copilot/copilot-instructions.md`.

## Instalación

```bash
engram link copilot
```

## Archivos escritos

| Archivo | Propósito |
| --- | --- |
| `.github/copilot-instructions.md` | Instrucciones personalizadas del repositorio |

## Instalación global

```bash
engram link --global copilot
```

Añade un bloque gestionado a `~/.copilot/copilot-instructions.md`.

## Objetivo de respaldo compacto/manual

Copilot es un objetivo de respaldo compacto/manual. Recibe el protocolo compacto completo porque los hooks actuales exponen el contexto de inicio de sesión pero no una inyección de contexto confiable en el momento del prompt en v1. Se omite la instalación del hook; no se escribe la configuración del hook.

## Siguientes pasos

- [Descripción general de las integraciones de agentes](overview.md)
- [Hooks y líneas de verificación](hooks.md)
