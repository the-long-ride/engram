---
title: Pestaña Workspaces (Espacios de trabajo)
sidebar_position: 6
description: Registre y vincule repositorios de proyectos desde la interfaz Entry Web UI.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Pestaña Workspaces

La pestaña Workspaces registra los repositorios de proyectos y administra su estado de enlace.

## Nombre del espacio de trabajo (Workspace name)

Nombre descriptivo fácil para la ruta del proyecto/repositorio. Manténgalo corto y reconocible.

## Ruta del espacio de trabajo (Workspace path)

Ruta del sistema de archivos hacia el repositorio/proyecto. Valide que la carpeta exista o pueda inicializarse; evite carpetas del sistema.

## Vincular / Desvincular (Link / Unlink)

Si Engram conecta activamente las instrucciones y hooks generados al espacio de trabajo. Vincule repositorios activos; desvincule repositorios archivados o de prueba.

<RiskCallout level="caution">
La desvinculación impide que los agentes reciban instrucciones de Engram. Confirme antes de desvincular un espacio de trabajo activo.
</RiskCallout>

## Eliminar (Delete)

Elimina el registro del espacio de trabajo. Aclare si elimina únicamente el registro o los archivos de memoria; la documentación debe coincidir con la implementación. Se prefiere desvincular antes que eliminar para facilitar la auditoría.

## Equivalente en CLI

```bash
engram inject
engram link codex
engram unlink
```

## Siguientes pasos

- [Pestaña Profiles](profiles.md)
- [Pestaña Connections](connections.md)
