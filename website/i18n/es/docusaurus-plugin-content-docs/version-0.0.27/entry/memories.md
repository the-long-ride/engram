---
title: Pestaña Memories (Memorias)
sidebar_position: 8
description: Inspeccione el gráfico de memoria, obtenga una vista previa de las memorias, edítelas y archívelas.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Pestaña Memories

La pestaña Memories inspecciona el grafo de memoria y realiza acciones de mantenimiento de memoria.

## Fichas de alcance (Scope chips)

Filtre el grafo por origen de la memoria. Compare la memoria del espacio de trabajo con la global. Comience solo con el espacio de trabajo actual si el grafo resulta ruidoso visualmente.

## Fichas de tipo (Type chips)

Filtre el grafo por tipo de memoria. Inspeccione las reglas, habilidades o conocimientos por separado.

## Alternancia de enlaces semánticos

Muestra las aristas semánticas del grafo. Desactívelo si el grafo resulta visualmente ruidoso.

## Actualizar / reconstruir (Refresh / rebuild)

Recarga o reconstruye los datos del grafo. Úselo después de ediciones, importaciones, archivados o cambios de configuración.

## Vista previa de la memoria

Muestra el contenido de la memoria seleccionada. Útil para auditar lo que recibirá el agente.

<RiskCallout level="caution">
El contenido sensible local puede ser visible en el navegador. Trate el panel como abierto mientras realiza la vista previa.
</RiskCallout>

## Editar memoria

Abre el archivo en un editor y copia la ruta. Úselo para correcciones manuales o revisiones. La fuente de verdad es el archivo Markdown.

## Archivar memoria

Elimina la memoria del enrutamiento activo mientras la conserva en `archive/`. Utilice archivar, no eliminar, para facilitar la auditoría.

<RiskCallout level="caution">
El archivo de memorias cambia el enrutamiento de forma inmediata. Utilice archivar en lugar de eliminación manual para conservar el historial.
</RiskCallout>

## Equivalente en CLI

```bash
engram graph "<topic>"
engram quality-check
engram archive --reason "<why>" <id-or-file>
```

## Siguientes pasos

- [Pestaña Core](core.md)
- [Pestaña Runtime](runtime.md)
