---
title: Historial de cambios
sidebar_position: 5
description: Historial de versiones de Engram.
---

# Historial de cambios (Changelog)

El historial de versiones de Engram reside en el repositorio [`CHANGELOG.md`](https://github.com/the-long-ride/engram/blob/main/CHANGELOG.md).

Para conocer la versión actual del paquete, consulte [`package.json`](https://github.com/the-long-ride/engram/blob/main/package.json).

## Versión actual

La versión actual de Engram publicada es `0.1.0`.

## Novedades destacadas de 0.1.0

- **Recuperación y tokenización**: BM25F de 3 flujos (`title`, `tags`, `body`), 24 clústeres de conceptos más puentes de coocurrencia del corpus cuando faltan anclas exactas, y tokenización Unicode/vietnamita/CJK.
- **Frescura, ordenación y compresión de inicio**: puntuación de frescura y nivel de trabajo con `knowledgeFreshnessBoost`, ordenación topológica consciente de la atención con `orderForAgentConsumption`, y compresión de tarjetas de inicio con `hookStartupAuto` en modo `read: auto`.
- **Telemetría de uso de ciclo cerrado**: seguimiento de resultados en `usage.json` local e ignorado por Git (`applied`, `corrected` y decaimiento de ruido tras inyecciones repetidas sin utilidad) junto con `engram stats --backfill`.
- **Aprendizaje de sesión Opción A y notas de trabajo**: aprendizaje determinista en tiempo de prompt y desde transcripciones hacia memorias `working/` con caducidad e ignoradas por Git y recibos preparados `inbox/r-*.json` (`engram review inbox|triage|apply|dismiss`), `engram working note` / herramienta MCP `engram_note`, y encolado opcional de transcripciones en `SessionEnd` (`engram link claude|codex --session-end`).
- **Ergonomía de la CLI**: `engram status` (`engram stat`), `engram why <id> ["<query>"]`, `engram help --compact`, `engram graph link <parent-id> <child-id...>`, `engram review triage` y `engram benchmark --from-git`.
- **UX de Entry Web y seguridad**: flujos de trabajo mejorados en la interfaz web Entry y dependencias sin vulnerabilidades.

## Actualizar

```bash
npm install -g @the-long-ride/engram@latest
engram upgrade
```

Consulte [Proceso de publicación y actualización](release-upgrade.md) para más detalles.
