---
title: Pestaña Runtime (Tiempo de ejecución)
sidebar_position: 9
description: Informe de rutas y configuración resuelta de solo lectura, además de la acción de cerrar el servidor.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Pestaña Runtime

La pestaña Runtime muestra el informe de rutas y configuración resuelta de solo lectura. Trátela como la primera página de resolución de problemas.

## Grupos de informes del tiempo de ejecución

El informe agrupa los valores resueltos para:

- **Profile** — perfil activo y origen de resolución
- **Memory roots** — rutas de memoria global y del espacio de trabajo
- **Core config** — enabled, scope, read, proof, roles
- **Routing** — límite de carga, grafo, configuración vectorial
- **Graph** — enabled, máximo de relacionados, puntuación mínima
- **Git detection** — remoto, URL del remoto, rama, sincronización automática

Cada salida explica lo que Engram resolvió realmente, no solo lo que se configuró. Úselo para depurar el comportamiento de perfiles, raíces de memoria, Git, enrutamiento y hooks.

## Cerrar servidor (Close server)

Detiene el servidor Entry local. Úselo por motivos de higiene de seguridad tras realizar tareas de configuración.

<RiskCallout level="risky">
El panel es únicamente local. Cierre el servidor desde la pestaña Runtime cuando haya terminado para evitar dejarlo abierto.
</RiskCallout>

## Equivalente en CLI

```bash
engram config view
engram entry
```

## Siguientes pasos

- [Referencia completa de campos](field-reference.md)
- [Resolución de problemas operativos](../operations/troubleshooting.md)
