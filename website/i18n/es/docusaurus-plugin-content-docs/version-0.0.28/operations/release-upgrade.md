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

## Legacy memory migration to schema v3

`engram upgrade --latest` also migrates active v1/v2 memory files in the workspace and configured global roots to schema v3. Engram preserves each Markdown body exactly, creates `<memory-file>.pre-v3.bak`, fills only deterministic metadata, refreshes integrity hashes, and rebuilds the index, graph, and eligible vector sidecars. It never invents `evidence_refs`; a memory without verified trace links is marked `evidence_status: unverified`. Invalid memories are reported and skipped, archived memories are not rewritten, and a second run is idempotent.

Preview all changes without writing:

```bash
engram upgrade --latest --plan
```

Run only the memory migration, without overwriting linked agent artifacts:

```bash
engram upgrade --migrate-memories
```

Skip memory migration during a latest upgrade:

```bash
engram upgrade --latest --no-migrate-memories
```

<!-- configuration-upgrade-inventory -->

La revisión de conflictos utiliza el mismo plan compartido en la CLI y en Entry. Ejecute ngram upgrade --latest --review para aceptar la última propuesta según el tipo, editarla mediante $VISUAL/$EDITOR o confirmar **Keep current**. Entry proporciona vistas **Current**, **Proposed** y **Diff**; **Diff** está predeterminado en **Inline** y puede cambiar a **Parallel**, con el contenido eliminado resaltado en rojo y el contenido añadido en verde. La aplicación final se bloquea mientras pendingReviewCount no sea cero, y ngram upgrade --latest --yes rechaza decisiones no resueltas o desactualizadas. Cada decisión se verifica con su hash de origen antes de escribir.

## Reconciliación de configuración con conocimiento de propiedad

El inventario de la actualización más reciente elimina duplicados de integraciones registradas por archivo físico. Si varios hosts comparten la misma guía Engram, Engram genera y escribe ese archivo una sola vez.

Cuando las ediciones manuales hacen que un artefacto Engram no sea seguro para el reemplazo normal, Entry solo ofrece **Force upgrade** cuando la propiedad se puede probar. Para un bloque Engram marcado, la actualización forzada solo reemplaza ese bloque y conserva el texto del usuario circundante. Para un archivo Engram generado/registrado, la actualización forzada puede reemplazar todo el archivo generado. La propiedad desconocida nunca se puede forzar, y la confirmación masiva nunca realiza acciones de forzado.

La aplicación exitosa se verifica mediante un escaneo posterior a la escritura. Los artefactos esperados que no convergen a current se notifican como errores de verificación.

## Git author identity

Engram can store a global author and an optional workspace override. Resolution is workspace, global, then read-only Git fallback. Settings affect future memories only; a workspace override never changes global Git configuration. Use explicit plan and confirmation for global Git sync or legacy-memory migration.

```bash
engram author show
engram author set --name "Jane Doe" --email "jane@example.com"
engram author unset --scope workspace
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author migrate-memories --plan
engram author migrate-memories --confirm
```

Read the complete [Git author settings guide](../operations/git-author-settings.md).
