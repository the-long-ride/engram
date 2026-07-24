---
title: Pautas de redacción de campos
sidebar_position: 11
description: Reglas para mantenedores que documentan nuevos campos de la interfaz de usuario Entry.
---

# Pautas de redacción de campos

Reglas para mantenedores que documentan nuevos campos de la interfaz de usuario Entry.

## Al agregar un campo

1. Agregue el campo a `CONFIG_FIELDS` en `src/core/web/config-schema.ts` con una `description` corta, `options`, `min`/`max`/`step`, y `risk` (riesgo).
2. Agregue una entrada de documentación a `website/src/data/entryFields.ts` con `shortDescription`, `useCases`, y `guidelines` como mínimo.
3. Documente el campo en la página de la [Pestaña Construct](construct.md) y en la [Referencia completa de campos](field-reference.md).
4. Ejecute la verificación de cobertura de la documentación de campos:

   ```bash
   npm --prefix website run check:entry-fields
   ```

5. Si el campo es riesgoso, agregue al menos una nota de recuperación/resolución de problemas.

## Elementos de documentación requeridos por campo

| Elemento | Requerido |
| --- | --- |
| Descripción en lenguaje sencillo | Sí |
| Casos de uso | Sí (1+) |
| Valor predeterminado recomendado | Sí |
| Valores permitidos / rango | Sí |
| Nivel de riesgo | Sí |
| Efectos secundarios | Cuando corresponda |
| Equivalente en CLI | Cuando corresponda |
| Valores de ejemplo | Para campos de texto/ruta |
| Notas de resolución de problemas | Para campos riesgosos |

## Reglas de redacción

- Escriba para un usuario que configura un sistema de memoria de agente de IA, no para un mantenedor que lee el código fuente.
- Nombre el efecto real sobre la propiedad de la memoria, el enrutamiento, el tamaño del contexto, la privacidad o la sincronización de Git.
- Prefiera ejemplos de flujos de trabajo de Engram: Codex, Claude, Gemini, Cursor, OpenCode, memoria personal, perfil de cliente, repositorio de equipo.
- No recomiende límites altos de manera predeterminada; explique los pros y contras de la sobrecarga del contexto.
- Marque las configuraciones como riesgosas cuando puedan deshabilitar Engram, cambiar la ubicación de guardado, cambiar la sincronización de Git, archivar la memoria o afectar el cifrado/seguridad.
- Incluya comandos de recuperación para configuraciones riesgosas.
- Mantenga las descripciones dentro de la aplicación cortas; coloque la guía detallada en Docusaurus.

## Cobertura de CI

`website/scripts/check-entry-field-docs.mjs` falla cuando:

1. Un campo de `CONFIG_FIELDS` visible carece de entrada en la documentación.
2. Una entrada de la documentación hace referencia a un campo que ya no existe en `CONFIG_FIELDS`.
3. Un campo carece de `shortDescription`, `useCases`, o `guidelines`.
4. Un campo riesgoso carece de al menos una nota de resolución de problemas.
5. Un campo numérico omite el rango permitido en los documentos renderizados.

## Siguientes pasos

- [Referencia completa de campos](field-reference.md)
- [Pestaña Construct](construct.md)
