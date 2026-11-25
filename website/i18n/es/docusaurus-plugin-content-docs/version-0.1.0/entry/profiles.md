---
title: Pestaña Profiles (Perfiles)
sidebar_position: 5
description: Administre perfiles de memoria global aislados desde la interfaz Entry Web UI.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Pestaña Profiles

La pestaña Profiles administra los perfiles de memoria global aislados. Los perfiles evitan que la memoria de los clientes, las empresas y la personal se filtren entre los diferentes ámbitos.

## Nombre del perfil (Profile name)

Contexto de memoria con nombre como `personal`, `client-a`, `team-platform`. Use letras, números, `.`, `_`, `-`; evite espacios y nombres sensibles. Los nombres deben coincidir con `^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$`.

## Ruta global (Global path)

Carpeta del sistema de archivos que respalda al perfil. Se prefieren rutas absolutas fuera de carpetas temporales volátiles; asegure permisos de escritura.

## Activar (Activate)

Activa el perfil para la resolución predeterminada a nivel de usuario. Cambiar de la memoria personal a la de trabajo/cliente afecta las cargas y guardados futuros.

<RiskCallout level="caution">
La activación de un perfil cambia qué memoria global utilizarán las cargas y guardados futuros. Confirme el nombre del perfil antes de activarlo.
</RiskCallout>

## Eliminar (Delete)

Elimina el registro del perfil. Se eliminan los metadatos del perfil; los archivos de memoria pueden seguir existiendo en el disco a menos que cambie el comportamiento del código. Revise la carpeta antes de confiar en la eliminación.

## Equivalente en CLI

```bash
engram profile create personal --global-path ~/Documents/engram-personal --use
engram profile use company --workspace
engram profile merge personal company --dry-run
```

## Siguientes pasos

- [Perfiles y resolución de alcance](../concepts/profiles.md)
- [Pestaña Workspaces](workspaces.md)
