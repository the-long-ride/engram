---
title: Inicio del panel de control
sidebar_position: 2
description: Ejecute engram entry para iniciar el panel de control local Entry.
---

# Inicio del panel de control

Inicie el panel:

```bash
engram entry
```

El comando inicia un servidor local y abre su navegador predeterminado en la URL del panel.

## Comportamiento del navegador

El panel se abre automáticamente en su navegador predeterminado. Si no es así, copie la URL impresa en el navegador de forma manual.

## Comportamiento del servidor local

El servidor se vincula localmente para que solo su máquina pueda acceder a él. No está expuesto a la red de forma predeterminada.

## Flujo de cierre del servidor

Cierre el servidor desde la pestaña **Runtime** usando la acción **Close server**, o detenga el proceso del terminal que inició `engram entry`. Cerrar la pestaña del navegador no detiene el servidor.

## Errores comunes de inicio

- **Port already in use (Puerto ya en uso)** — otro proceso está usando el puerto del panel. Deténgalo o siga las instrucciones impresas.
- **Browser did not open (El navegador no se abrió)** — copie la URL impresa en un navegador manualmente.
- **No workspace initialized (Ningún espacio de trabajo inicializado)** — ejecute `engram inject` primero, o use `engram entry` desde la raíz de un proyecto.

## Siguientes pasos

- [Pestaña Connections](connections.md)
- [Pestaña Construct](construct.md)
