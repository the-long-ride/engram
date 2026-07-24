---
title: Proceso de publicación y actualización
sidebar_position: 2
description: Actualice los paquetes de Engram y concilie las raíces de la memoria de forma segura.
---

# Proceso de publicación y actualización

## Después de una actualización del paquete npm

El siguiente comando normal de Engram concilia silenciosamente las raíces del espacio de trabajo/globales ya inicializadas una vez para la nueva versión. Esto cubre los cambios de esquema de memoria de versión a versión a partir de v0.0.8 al actualizar la ayuda generada, los índices de memoria, los archivos de grafo y los sidecars vectoriales elegibles cuando se detectan metadatos más antiguos.

La comprobación de inicio es intencionadamente económica después de la primera ejecución: solo lee pequeños marcadores de configuración cuando la versión actual ya está registrada. No se ejecuta desde npm postinstall, no crea nuevas raíces de memoria ni reemplaza archivos creados por humanos. Use `--no-auto-upgrade` o `ENGRAM_NO_AUTO_UPGRADE=1` para omitirla en un comando.

## Actualización explícita

```bash
engram upgrade
engram upgrade --plan
engram upgrade --latest
```

`engram upgrade` actualiza la ayuda generada del espacio de trabajo, los índices de memoria, los archivos de grafo, los sidecars vectoriales elegibles, los archivos de skillset del espacio de trabajo existentes generados por Engram y los skillsets globales registrados, conservando los archivos creados por humanos.

`engram upgrade --latest` es más potente: sobrescribe los artefactos de agentes vinculados administrados por Engram actuales para los agentes del espacio de trabajo ya vinculados y las instalaciones globales registradas, incluidos archivos de instrucciones, reglas, configuración de MCP/plugin y hooks administrados, de modo que los hosts vinculados recojan el resultado del nuevo paquete de inmediato.

Use `--force` solo cuando reemplace intencionadamente archivos de adaptadores Engram generados.

## Perfiles de renderizado de skillset

Para los hosts con capacidad de tiempo de ejecución, Engram instala pequeñas instrucciones de arranque en lugar del protocolo completo. Los hooks proporcionan un contexto de tarea enrutado, las herramientas MCP proporcionan un comportamiento de carga/búsqueda/propuesta y los adaptadores slash o Agent Skills llevan flujos de trabajo de comandos detallados. Los destinos alternativos sin inyección de contexto de tiempo de ejecución confiable siguen recibiendo instrucciones manuales compactas.

## Alternativa de base de datos de configuración SQLite

La base de datos de configuración SQLite de Engram es una optimización para la gestión de espacios de trabajo/perfiles. Si la base de datos no se puede abrir o inicializar, los comandos normales de lectura/escritura recurren a instantáneas de configuración JSON. Los comandos específicos de la base de datos informan que SQLite no está disponible en lugar de bloquear el uso normal de la memoria.

## Siguientes pasos

- [Resolución de problemas](troubleshooting.md)
- [CLI: inject / link / upgrade](../cli/inject-link-upgrade.md)
