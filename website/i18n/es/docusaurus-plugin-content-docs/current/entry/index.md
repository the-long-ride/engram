---
title: Descripción general de Entry Web UI
sidebar_position: 1
description: Entry Web UI es el panel de control local para configurar la memoria, perfiles, espacios de trabajo y conexiones de agentes de Engram.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Descripción general de Entry Web UI

La interfaz Entry Web UI es el panel de control local para Engram. Úselo para configurar raíces de memoria, vincular agentes de IA, ajustar el enrutamiento, revisar duplicados, inspeccionar el grafo de memoria y depurar la configuración del tiempo de ejecución sin editar archivos JSON manualmente.

## Cuándo usarlo

- Configuración inicial de un espacio de trabajo o raíz de memoria global
- Vincular o desvincular agentes de IA sin tener que recordar opciones de CLI
- Ajustar el enrutamiento, el grafo, la búsqueda vectorial y las variantes de reglas
- Revisar memorias duplicadas o en conflicto
- Inspeccionar el grafo de memoria
- Depurar configuraciones resueltas, rutas y detección de Git

## Modelo de acceso local únicamente (Local-only)

El panel se ejecuta en su máquina. No es un servicio en la nube. Cierre el servidor cuando termine por motivos de higiene de seguridad.

<RiskCallout level="risky">
El panel de Entry es local. Trátelo como abierto mientras configura la memoria, luego cierre el servidor desde el pie de la barra lateral al finalizar.
</RiskCallout>

## Relación con los comandos de CLI

Cada control visible se asigna a un comando de la CLI o clave de configuración. En los casos en que exista un equivalente de CLI, la referencia del campo lo indica. La CLI sigue siendo la fuente de verdad para la automatización y los scripts.

## Navegación y enrutamiento por URL

Entry Web UI usa enrutamiento `#hash` en la URL para que cada pestaña se pueda guardar en marcadores, recargar o navegar con el historial del navegador:

- `#config` — Construct
- `#author` — Git
- `#upgrade` — Updates
- `#recall` — Memories
- `#review` — Review
- `#maintain` — Core
- `#connect` — Connections

La barra lateral incluye una sección **Workspace** para controles de ámbito de workspace y muestra una insignia con el recuento pendiente en **Review** siempre que haya hallazgos, candidatos diferidos o recibos pendientes de triaje. En pantallas estrechas, la barra lateral se pliega en un cajón móvil que puede cerrar con el botón de cierre o pulsando `Escape`.

## Pestañas de un vistazo

| Pestaña | Hash | Propósito |
| --- | --- | --- |
| [Construct](construct.md) | `#config` | Configure campos de ejecución, perfiles, espacios de trabajo y estado en tiempo de ejecución de Engram |
| [Git](../operations/git-author-settings.md) | `#author` | Gestione la identidad de autor y la configuración de Git global |
| [Updates](../operations/configuration-upgrades.md) | `#upgrade` | Compruebe actualizaciones del paquete y aplique actualizaciones de configuración |
| [Memories](memories.md) | `#recall` | Busque, simule rutas, inspeccione, promueva y archive memoria activa |
| [Review](review.md) | `#review` | Clasifique recibos de aprendizaje de sesión, hallazgos y escrituras diferidas |
| [Core](core.md) | `#maintain` | Revise memorias duplicadas y en conflicto |
| [Connections](connections.md) | `#connect` | Compruebe la salud de Doctor, detecte agentes y vincule agentes de IA compatibles |

## Siguientes pasos

- [Inicio del panel de control](launch.md)
- [Pestaña Construct](construct.md)
- [Pestaña Core](core.md)
- [Referencia completa de campos](field-reference.md)


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

Read the complete [Git author settings guide](../operations/git-author-settings.md)
