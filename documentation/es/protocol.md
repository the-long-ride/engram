# Protocolo De Memoria Humana

Engram no es solo "memoria de agente." Es un protocolo para que la memoria sea inspeccionable, portable y gobernada por humanos.

## Contrato

Markdown es memoria durable.

JSON index y graph son capas de aceleración.

La aprobación es la frontera de confianza.

Los hashes son controles de integridad.

Las ignore rules son controles de privacidad.

Git es portabilidad e historial de auditoría.

Los adaptadores de agente son comodidad, no autoridad.

Los agentes sugieren; los humanos deciden qué se vuelve memoria.

## Tipos

| Tipo | Uso |
| --- | --- |
| Rule | preferencia, corrección, restricción |
| Skill | workflow repetible, checklist, procedimiento |
| Knowledge | hecho objetivo, decisión, detalle de implementación |

Cada memoria activa tiene `Context`, `Content` y `Example`.

## Flujo De Escritura

1. El agente propone candidatos.
2. Engram detecta tipo y scope.
3. Valida schema, secretos, prompt injection y rutas.
4. El humano ve un preview.
5. Responde `A`, `A 1,3`, `B <note>` o `C`.
6. Solo lo aprobado se escribe.
7. Se refrescan index, graph, hashes y changelog.

## Flujo De Lectura

1. Engram carga workspace y global index.
2. Workspace gana sobre duplicados globales.
3. Ignore rules y roles filtran ruido.
4. El graph routing elige contexto compacto.
5. Hashes y seguridad corren antes de imprimir contenido.

Sin protocolo, la memoria se vuelve estado invisible. Engram la vuelve archivos, diffs, hashes y revisiones.

Siguiente: [Operaciones](operations.md).

