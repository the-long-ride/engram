---
title: Resolución de problemas
sidebar_position: 3
description: Problemas comunes de Engram y cómo recuperarse.
---

# Resolución de problemas

Primer paso: abra `engram entry` y lea la pestaña **Runtime**. Muestra el perfil resuelto, raíces de memoria, configuración principal, enrutamiento, grafo y detección de Git.

## La memoria no se cargó

- Ejecute `engram load --dry-run "<tarea>"` para inspeccionar recuentos de candidatos y etiquetas de limitación.
- Verifique `engram config view` para `enabled`, `read` y `load.limit`.
- Confirme que la memoria del espacio de trabajo existe en `.agents/.engram/`.
- Ejecute `engram verify` para verificar los hashes.

## Hooks no inyectan

- Confirme que `engram set-read status` no esté en `off` o `manual`.
- Confirme que el host esté vinculado: `engram link <destino>`.
- Reinicie o recargue el host después de `link`/`unlink` (especialmente OpenCode).
- Verifique `engram set-proof status` para la visibilidad de la línea de prueba.

## Falló el guardado

- Lea la vista previa de aprobación para obtener pistas de memoria relacionada.
- Si aceptar todo informó memorias relacionadas, no se guardó ningún archivo. Vuelva a ejecutar con candidatos `DEPENDS_ON` o `UPDATE`.
- Verifique errores de esquema, secretos y escaneo de inyección en la salida de la CLI.

## Confusión de perfiles

- Ejecute `engram profile status`.
- Confirme el `default_profile` del espacio de trabajo y el perfil de usuario activo.
- Recuerde: un perfil explícito diferente del predeterminado del espacio de trabajo deshabilita la memoria del espacio de trabajo para ese comando.

## Archivos de memoria no válidos

```bash
engram verify
engram repair
engram rebuild-index
engram graph --rebuild
```

## Adaptadores obsoletos después de la actualización del paquete

```bash
engram upgrade
engram upgrade --latest
engram link all
```

Use `--force` solo cuando reemplace intencionadamente archivos de adaptadores Engram generados.

## Base de datos de configuración SQLite no disponible

Los comandos normales de lectura/escritura recurren a instantáneas de configuración JSON. Los comandos específicos de la base de datos informan que SQLite no está disponible en lugar de bloquear el uso normal de la memoria.

## Problemas de sincronización global de Git

- Confirme que `global_git.enabled` sea `true`.
- Verifique que `global_git.remote_url` sea una URL remota de Git válida.
- Revise `global_git.auto_resolve`: el manejo automático de conflictos puede ocultar los diffs de memoria.
- Ejecute la pestaña Runtime de `engram entry` para inspeccionar `global_git_detected`.

## Siguientes pasos

- [Preguntas frecuentes](faq.md)
- [CLI: verify / repair / quality-check](../cli/verify-repair-quality.md)
