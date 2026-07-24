---
title: Perfiles y resolución de alcance
sidebar_position: 4
description: Los perfiles aíslan las raíces de la memoria global para contextos de empresa, equipo y personales.
---

# Perfiles y resolución de alcance

Los perfiles aíslan las raíces de la memoria global para contextos de empresa, equipo y personales. Evitan que la memoria del cliente, de la empresa y la personal se filtren a través de los límites.

## Crear y cambiar perfiles

```bash
engram profile create personal --global-path ~/Documents/engram-personal --use
engram profile use company --workspace
engram profile merge personal company --dry-run
```

## Orden de resolución

El orden de resolución del perfil es:

1. `--profile` explícito o `ENGRAM_PROFILE`
2. El `default_profile` del espacio de trabajo
3. El perfil de usuario activo

Si el espacio de trabajo `W` está fijado al perfil `B` mientras que el predeterminado del usuario sigue siendo el perfil `A`, cada carga normal, carga MCP e inyección de hook de agente para `W` lee la memoria global del perfil `B` y nunca la del perfil `A`. Un perfil explícito diferente del predeterminado del espacio de trabajo utiliza la memoria global de ese perfil y deshabilita la memoria del espacio de trabajo para ese comando.

## Cuándo usar perfiles

- Memoria personal que nunca debería llegar a un repositorio de cliente
- Memoria de la empresa que nunca debería llegar a un repositorio personal
- Memoria aislada del cliente para consultores que trabajan en varios compromisos
- Memoria compartida del equipo que no debería filtrarse en experimentos individuales

## Alternativa de base de datos de configuración SQLite

La base de datos de configuración SQLite de Engram es una optimización para la gestión de espacios de trabajo/perfiles. Si la base de datos no se puede abrir o inicializar, los comandos normales de lectura/escritura recurren a instantáneas de configuración JSON. Los comandos específicos de la base de datos informan que SQLite no está disponible en lugar de bloquear el uso normal de la memoria.

## Siguientes pasos

- [Memoria de espacio de trabajo frente a memoria global](scopes.md)
- [Ruta de escritura y aprobación](write-path.md)
