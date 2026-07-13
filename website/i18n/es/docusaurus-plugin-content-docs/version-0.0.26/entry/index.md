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
El panel de Entry es local. Trátelo como abierto mientras configura la memoria, luego cierre el servidor desde la pestaña Runtime al finalizar.
</RiskCallout>

## Relación con los comandos de CLI

Cada control visible se asigna a un comando de la CLI o clave de configuración. En los casos en que exista un equivalente de CLI, la referencia del campo lo indica. La CLI sigue siendo la fuente de verdad para la automatización y los scripts.

## Pestañas de un vistazo

| Pestaña | Propósito |
| --- | --- |
| [Connections](connections.md) | Detecte y vincule agentes de IA compatibles |
| [Construct](construct.md) | Configure cada campo de ejecución de Engram |
| [Profiles](profiles.md) | Administre perfiles de memoria global aislados |
| [Workspaces](workspaces.md) | Registre y vincule repositorios de proyectos |
| [Core](core.md) | Revise memorias duplicadas y en conflicto |
| [Memories](memories.md) | Inspeccione el grafo de memoria y archívelas |
| [Runtime](runtime.md) | Rutas y configuraciones resueltas de solo lectura |

## Siguientes pasos

- [Inicio del panel de control](launch.md)
- [Pestaña Construct](construct.md)
- [Referencia completa de campos](field-reference.md)
