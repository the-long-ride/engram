---
title: Privacidad, reglas de ignorado y seguridad
sidebar_position: 7
description: Las reglas de ignorado, puertas de aprobación, hashes y perfiles protegen el contexto privado de capturas accidentales.
---

# Privacidad, reglas de ignorado y seguridad

Engram es privado por defecto. Varias capas evitan que el contexto privado se filtre a la memoria duradera o a través de los límites del perfil.

## Puerta de aprobación

Las escrituras requieren aprobación humana. Los agentes proponen candidatos; los humanos aprueban, rechazan, editan o archivan. La CLI directa de la terminal utiliza A/B/C. El chat del agente de IA utiliza `yes` / `audit` / `cancel`.

## Reglas de ignorado

Las reglas de ignorado son controles de privacidad. Ocultan entradas irrelevantes o sensibles del enrutamiento. Configúrelas en `.engramignore` y en la configuración de la memoria del espacio de trabajo para que las rutas y patrones privados nunca entren en el índice.

## Hashes

Los hashes son comprobaciones de integridad. Se ejecutan antes de imprimir el contenido y revelan ediciones inseguras que omitieron el flujo de escritura normal.

## Perfiles

Los perfiles aíslan la memoria de la empresa, del cliente y la personal para que las API externas o los agentes proporcionados por la empresa no filtren contexto entre proyectos. Consulte [Perfiles y resolución de alcance](profiles.md).

## Escaneo de secretos e inyección

Al momento de guardar, Engram verifica:

- validación de esquema
- escaneo de secretos
- patrones de inyección de prompts
- seguridad de ruta

## Límites a conocer

La búsqueda predeterminada de Engram es una búsqueda léxica determinista. `engram search --semantic` agrega similitud local determinista, no búsqueda semántica respaldada por incrustaciones (embeddings). Los vectores del grafo son vectores de palabras hash locales, no incrustaciones semánticas. La detección de contradicciones es consultiva. Existe la configuración de cifrado, pero el almacenamiento cifrado aún no está implementado.

Estos límites se indican claramente de forma intencionada. Engram debe decir a los usuarios qué es real hoy y qué es trabajo futuro.

## Siguientes pasos

- [Ruta de escritura y aprobación](./write-path.md)
- [Resolución de problemas de operaciones](../operations/troubleshooting.md)
