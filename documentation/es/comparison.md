# Comparación, Pros, Contras Y Roadmap

Engram optimiza propiedad humana, revisión y portabilidad.

## Fortalezas

- Markdown como fuente de verdad.
- Aprobación humana antes de escrituras durables.
- Historial y sync con Git.
- Workspace-first, global-fallback.
- Agnóstico a agentes.
- Seguridad: schema, secret scan, injection scan, hashes, ignore rules.
- Sin daemon, base de datos o nube obligatoria.
- Import, observe, archive, graph, benchmark y repair para mantenimiento.

## Costes

- Menos automático que sistemas daemon.
- Search default lexical; `search --semantic` usa similitud local determinista, no semantic embedding-backed.
- Graph vectors son hashed word vectors locales.
- Contradiction detection es heurística.
- `deduplicate --semantic` usa similitud local determinista, no embeddings externos.
- Pattern mining, encryption config y PR workflow aún no son flujos completos.

## Frente A Agentmemory

[rohitg00/agentmemory](https://github.com/rohitg00/agentmemory) es un motor automático para coding agents con servidor, MCP/hooks/REST, adaptadores, benchmarks, viewer, replay, hybrid retrieval e integración Hermes.

Usa agentmemory si quieres captura automática, replay, vector retrieval y muchas herramientas MCP.

Usa Engram si quieres un protocolo legible en repo: Markdown primero, aprobado por humanos, revisado en Git y portable entre agentes sin servidor.

| Dimensión | Engram | agentmemory |
| --- | --- | --- |
| Fuente de verdad | Markdown aprobado | Servidor/store |
| Confianza | Aprobación A/B/C | Captura automática + governance |
| Modo default | Protocolo de archivos | Servicio recomendado |
| Revisión | Git diff y Markdown | Viewer/API/sesiones |
| Mejor para | ownership y auditoría | recall automático y replay |

## Frente A Memoria Integrada

La memoria integrada es cómoda pero ligada a un host. Engram deja la autoridad en archivos que el humano controla.

## Roadmap

- Embeddings locales opcionales para graph/search.
- Diagnóstico de routing más explícito.
- Benchmark fixtures versionados.
- Mejor workflow para contradicciones.
- Más variantes de import agentmemory.
- Proveedor opcional de embeddings externos para dedupe semántico.
- Repair que proponga fixes después de reportar errores.
