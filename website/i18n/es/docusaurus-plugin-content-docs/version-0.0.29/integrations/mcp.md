---
title: Herramientas MCP
sidebar_position: 11
description: El servidor MCP de Engram expone herramientas de carga, búsqueda y solo propuesta para hosts compatibles con MCP.
---

# Herramientas MCP {#mcp-tools}

Engram incluye un binario de servidor MCP `engram-mcp` que expone herramientas para hosts compatibles con MCP.

## Registro {#registration}

`engram link <target>` también instala por defecto el registro MCP conocido para ese objetivo.

| Ámbito | Ruta |
| --- | --- |
| Claude Code en espacio de trabajo y otros hosts que leen `.mcp.json` (no Codex, que solo lee `~/.codex/config.toml`; consulte Codex global) | `.mcp.json` |
| Gemini en espacio de trabajo | `mcpServers.engram` en `.gemini/settings.json` |
| Cursor en espacio de trabajo | `.cursor/mcp.json` |
| OpenCode en espacio de trabajo | campo `mcp` en `opencode.json` / `opencode.jsonc` |
| Claude global | No es un archivo: Engram imprime `claude mcp add --scope user engram -- engram-mcp` (Claude Code mantiene los servidores MCP del usuario en `~/.claude.json`) |
| Gemini global | `mcpServers.engram` fusionado en `~/.gemini/settings.json` |
| Codex global | Bloque administrado `[mcp_servers.engram]` en `~/.codex/config.toml` |
| Antigravity global | Archivo de configuración MCP de Gemini |
| OpenCode global | campo `mcp` en `~/.config/opencode/opencode.jsonc` / `opencode.json` |
| Cursor global | Integrado en el plugin local |
| Windsurf global | `~/.codeium/windsurf/mcp_config.json` |

El MCP de espacio de trabajo para Windsurf se omite porque el contrato oficial solo documenta la configuración de MCP a nivel de usuario.

El comando del servidor es `engram-mcp` cuando está en `PATH`, de lo contrario, la forma `npx` fijada a la versión instalada (`npx -y --package @the-long-ride/engram@<version> engram-mcp`); `engram upgrade` y `engram link <host>` vuelven a fijar las entradas existentes. Unlink solo elimina la entrada o el bloque administrado de Engram y deja intactos otros servidores y claves.

## Versiones del protocolo {#protocol-versions}

Un único proceso `engram-mcp` atiende dos eras de protocolo:

- **Heredada**: `initialize` devuelve el `protocolVersion` del cliente cuando es `2024-11-05`, `2025-03-26`, `2025-06-18` o `2025-11-25`, y `2025-11-25` en caso contrario. Nunca se devuelve una cadena de versión desconocida.
- **MCP 2026-07-28**: una solicitud cuyo `params._meta` lleva `io.modelcontextprotocol/protocolVersion` se atiende sin estado (`server/discover`, `tools/list`, `tools/call`, `resources/*`, `prompts/*`). También debe llevar `io.modelcontextprotocol/clientCapabilities` (`-32602` si falta). Los resultados llevan `resultType: "complete"`, y los métodos de lista agregan `ttlMs` y `cacheScope`. Una versión moderna no admitida devuelve `-32022` con `data.supported` y `data.requested`; `ping`, `initialize` y los métodos de herramientas simples devuelven `-32601` en esta era.

Stdout solo transporta JSON-RPC, un mensaje por línea.

## Instrucciones del servidor y búsqueda de herramientas {#server-instructions-and-tool-search}

Tanto el resultado `initialize` heredado como el resultado `server/discover` de MCP 2026-07-28 llevan la misma cadena `instructions` (como máximo 512 caracteres, autónoma). Indica al host cuándo usar las herramientas de Engram (recordar reglas y decisiones del proyecto, guardar conocimiento del proyecto) y que `engram_commit` necesita intervención humana. Codex lee los primeros 512 caracteres; Claude Code solo carga por adelantado los nombres de las herramientas más `instructions` y pospone las definiciones de herramientas tras la búsqueda de herramientas.

`engram-mcp --always-load` marca `engram_load` con `_meta["anthropic/alwaysLoad"]: true`, de modo que Claude Code carga esa herramienta por adelantado. Los hooks de Claude de Engram ya inyectan contexto, por lo que `engram link` solo agrega el indicador cuando no hay ningún hook de Claude de Engram instalado o instalándose, y solo en las configuraciones que Claude Code lee: `.mcp.json` y el comando impreso `claude mcp add --scope user`. Las configuraciones de Codex, Cursor, Gemini y Windsurf nunca lo reciben. Una entrada `engram` existente en `.mcp.json` solo cambia con `--force`, `engram upgrade` o una actualización. `engram-mcp --no-elicitation` mantiene el flujo de chat `approval_token` incluso para clientes compatibles con el cuadro de diálogo de aprobación (ver más abajo). Una opción desconocida de `engram-mcp` se ignora con una nota en stderr.

## Herramientas {#tools}

| Herramienta | Propósito | Escribe |
| --- | --- | --- |
| `engram_load` | Enrutar y devolver memoria para una tarea (`query`, `id`, `budget_tokens`, `disclosure`, `full`, `explain`) | No |
| `engram_route` | Clasificar una tarea y listar las memorias hacia las que se enruta | No |
| `engram_search` | Buscar en la memoria mediante consulta | No |
| `engram_verify`, `engram_status` | Comprobar hashes; informar sobre el estado y recuentos | No |
| `engram_save`, `engram_save_session` | Devolver una propuesta numerada y un `approval_token` | No |
| `engram_commit` | Escribir una propuesta aprobada | Sí, tras aprobación humana |
| `engram_set_role`, `engram_set_rule_variant` | Actualizar roles o modo de variante de regla | Sí |
| `engram_note` | Guardar una nota de tarea redactada en el nivel de trabajo (`text`, `objective`, `type`, `scope`); devuelve `{id, file, valid_until}` | Sí, tras una aprobación de sí/cancelar |

`engram_load` utiliza por defecto la salida escalonada descrita en [Ruta de lectura y enrutamiento](../concepts/read-path.md); pase `full: true` para una salida heredada más amplia. `budget_tokens` no tiene efecto junto con `id`.

## Resultados estructurados {#structured-results}

El texto para humanos se encuentra en `content[0].text`. `structuredContent` es la envoltura `{contract_version, ok, data, diagnostics}`, donde `data` contiene:

- `engram_load`: `selected_keys`, `body_keys`, `card_ids`, `omitted_ids` (IDs descartados por el presupuesto de tokens, recuperables mediante `id`) y `tokens`.
- `engram_search` y `engram_route`: `entries` con `id`, `type`, `scope` y `score`. Las entradas de ruta están en orden de carga, no ordenadas por puntuación.

## Aprobación y commit {#approval-and-commit}

`engram_save` y `engram_save_session` son **solo de propuesta**: devuelven la vista previa y un `approval_token`. Una vez que el humano aprueba en el chat los candidatos exactos, llame a `engram_commit` con `approval_token` y `approve: "all"` o una lista de números de candidatos basados en 1. Escribe a través de la misma ruta que `save-session --force`, por lo que los candidatos relacionados o duplicados se posponen como de costumbre.

- Los tokens son aleatorios, vinculados al espacio de trabajo, de un solo uso y caducan después de 30 minutos.
- Solo se almacena un hash del token en el archivo ignorado por git `pending-approvals.json`; editar un candidato pendiente hace que falle la comprobación de integridad.
- Nunca llame a `engram_commit` antes de que el humano haya aprobado los candidatos mostrados.
- `engram_commit` lleva `_meta["anthropic/requiresUserInteraction"]: true` en `tools/list`, lo que hace que Claude Code solicite confirmación en cada llamada, incluso en modos de omisión. El bloque administrado de Codex agrega `[mcp_servers.engram.tools.engram_commit]` con `approval_mode = "approve"`, y `engram doctor` advierte (`host.gemini_trust`) cuando una entrada de Gemini `mcpServers.engram` establece `trust: true`, lo que omitiría la confirmación.
- Cada candidato lleva una línea `Verdict:` determinista (`ADD`, `UPDATE <id>`, `SUPERSEDE <id>`, `NOOP duplicate of <id>`). El token fija los veredictos y `engram_commit` solo aplica un `SUPERSEDE` mientras el veredicto recalculado siga coincidiendo.
- El `approval_token` se devuelve al agente. Demuestra que existe una propuesta, no que un humano la haya aprobado. La puerta humana es el aviso de permiso por herramienta del host para `engram_commit`, así que no agregue a la lista de permitidos ni apruebe automáticamente `mcp__engram__engram_commit` (o el equivalente de su host).

### Cuadro de diálogo de aprobación (Elicitation) {#approval-dialog-elicitation}

Cuando el cliente declara la elicitación mediante formulario, `engram_save` y `engram_save_session` preguntan al humano en el propio cuadro de diálogo del host en lugar de devolver un token:

- El formulario enumera los números de candidatos con `ADD`/`UPDATE` y títulos de ID (nunca el texto de la memoria) y un ámbito de guardado; `both` puede reducirse a un solo ámbito, nunca ampliarse.
- `accept` escribe exactamente los candidatos seleccionados a través de la misma ruta que `engram_commit`. No se devuelve ningún `approval_token`.
- `decline` revoca la propuesta: un `engram_commit` posterior con su token fallará con `approval was declined in the approval dialog`. Una respuesta no válida también la revoca.
- `cancel`, un tiempo de espera de 60 segundos o un error del cliente recurren al texto del token anterior, con el prefijo `nothing was saved`, de modo que los hosts que declaran la elicitación pero cierran el cuadro de diálogo sigan funcionando. Un host que rechaza automáticamente necesita `engram-mcp --no-elicitation`.
- Los clientes heredados reciben una solicitud `elicitation/create` de servidor a cliente. Los clientes MCP 2026-07-28 reciben un resultado `input_required` cuyo `requestState` es una envoltura sellada con HMAC y con fecha de caducidad vinculada a la herramienta, el espacio de trabajo y los argumentos; reintentan `tools/call` con `inputResponses` y ese `requestState`. Un estado falsificado, caducado o no coincidente devuelve `-32602` y no escribe nada. Un reinicio del servidor invalida los estados abiertos, por lo que el agente vuelve a proponer.
- Las llamadas sin la capacidad y con `--no-elicitation` utilizan el flujo de tokens sin cambios.

### Notas del nivel de trabajo {#working-tier-notes}

`engram_note` guarda una breve nota de tarea en el nivel `working/` ignorado por git (`source: note`, `tier: working`, `valid_until` = hoy + `load.working_ttl_days`). El texto se redacta y las líneas que parecen instrucciones se rechazan antes de la vista previa. El humano responde a un aviso de sí/cancelar a través del mismo cuadro de diálogo, reintento de `input_required` o flujo de `approval_token` descrito anteriormente; `decline`, `cancel` y un tiempo de espera no escriben nada. Una nota nunca actualiza una memoria duradera con el mismo ID, y `engram promote` es la única forma de hacerla duradera. SessionStart omite una nota a menos que `ENGRAM_SESSION_OBJECTIVE` coincida con el objetivo de la nota; de lo contrario, aparece como una tarjeta de una sola línea. La herramienta lleva `readOnlyHint: false` y ningún `destructiveHint`.

## Regla de forzado {#force-rule}

Las solicitudes explícitas de `/engram save-session --force`, incluido el atajo `/engram ss -f`, deben utilizar la ruta de escritura de la CLI. El atajo contado `/engram ss -f last 50 sessions` debe utilizar `engram save-session --query-level 50 --force`. Los hosts que solo usan MCP confirman a través de `engram_commit`.

## Entrada MCP de OpenCode {#opencode-mcp-entry}

```json
"engram": {
  "type": "local",
  "command": ["engram-mcp"],
  "args": [],
  "enabled": true
}
```

El servidor MCP implementa el protocolo de enlace estándar JSON-RPC (`initialize`, `notifications/initialized`, `tools/list` y `tools/call`) y responde a `ping`. Las memorias también se exponen como recursos MCP (`engram://index` enumera tarjetas de una línea, `engram://memory/{id}` lee el mismo cuerpo que `engram load --id` y cuenta como una recuperación), y un prompt, `propose`, devuelve el protocolo de propuesta de memoria. `resources/list` devuelve el índice más las `mcp.resource_limit` memorias principales por uso (configuración JSON, valor predeterminado 20, de 0 a 200). Las herramientas de lectura llevan `annotations.readOnlyHint: true`. Una línea JSON mal formada recibe una respuesta de error `-32700` y el servidor sigue ejecutándose. Las solicitudes sin un `id` son notificaciones y no reciben respuesta, y una llamada de método simple que no sea `tools/call` devuelve texto sin formato.

## Pasos siguientes {#next-steps}

- [Visión general de integraciones de agentes](overview.md)
- [Hooks y líneas de prueba](hooks.md)
