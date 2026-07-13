---
title: save / save-session / observe
sidebar_position: 3
description: Comandos de escritura — guardar una memoria, guardar varias de una sesión y capturar notas sin procesar.
---

# save / save-session / observe

Los comandos de escritura proponen memorias a través del control de aprobación.

## save

```bash
engram save [rule|workflow|knowledge] "<text>"
engram save --role frontend "<text>"
engram save --scope global "<text>"
```

`engram save` captura el mejor candidato de memoria única, actualiza automáticamente una memoria coincidente o crea una nueva, y siempre muestra la puerta de aprobación A/B/C antes de escribir.

Cuando `engram save` encuentra memorias activas relacionadas, la vista previa de aprobación las informa con una sugerencia de `depends_on` o una advertencia de posible duplicado.

## save-session

```bash
engram save-session
engram ss
engram save-session --query-level 3
engram ss -f
engram ss -f last 50 sessions
engram save-session --file transcript.md
engram save-session --force
```

Usa `save-session` cuando una interacción larga produzca varios candidatos:

```text
TYPE: rule | TEXT: Always run tests before release. | CONTEXT: Created from release planning so future agents preserve the test gate.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

`CONTEXT: ...` es opcional. Agrégalo solo cuando explique por qué existe la memoria. Los candidatos también pueden agregar campos `DEPENDS_ON`, `LEVEL` o `UPDATE` al reestructurar memorias relacionadas.

- `--query-level <n>` — extrae hasta n chats recientes accesibles entre humano y agente; debe ser un entero positivo; los agentes no deben inventar historial no disponible
- `--force` / `-f` — se guarda cada candidato generado porque el humano aprobó explícitamente ese acceso directo
- `--file <path>` — para transcripciones o resúmenes largos ya en el disco

Para `/engram take-control --force` o el `/engram take control accept all` natural, el adaptador normaliza la redacción, genera solo candidatos concisos `TYPE: ... | TEXT: ...` y permite que Engram los guarde sin una segunda solicitud de aprobación.

## observe

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<note>.md
```

`observe` almacena notas sin procesar e higienizadas en `inbox/`. Las notas de la bandeja de entrada no son memoria activa. Usa esto cuando desees preservar notas preliminares antes de decidir qué debería convertirse en memoria duradera.

## Pistas de memoria relacionada

Cuando una ejecución de aceptar todo informa memorias relacionadas antes de escribir, no se guardó ningún archivo aún. El agente debe volver a ejecutar con candidatos estructurados:

```text
TYPE: rule | TEXT: OAuth rotation follows release foundations. | DEPENDS_ON: release-foundation | LEVEL: advanced
TYPE: knowledge | TEXT: Invoice retries use exponential backoff. | UPDATE: invoice-retry-baseline
```

## Siguientes pasos

- [inject / link / upgrade](inject-link-upgrade.md)
- [Conceptos: ruta de escritura y aprobación](../concepts/write-path.md)

