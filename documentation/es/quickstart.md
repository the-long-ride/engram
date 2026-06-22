# Inicio Rápido para Agentes de IA

Use Engram a través de su agente primero. La interfaz de línea de comandos (CLI) existe, pero la mejor experiencia es: pida al agente que cargue la memoria, realice el trabajo y luego proponga memoria duradera cuando surja algo útil.

## Primer Mensaje en Una Nueva Sesión

Pregunte:

```text
Use Engram para esta tarea. Cargue la memoria para: <lo que estamos haciendo>.
```

Si los adaptadores de comando slash están instalados:

```text
/engram load "<tarea actual>"
```

El agente debe resumir únicamente los identificadores de memoria (IDs) y las reglas relevantes, no pegar cada archivo.

Cuando un agente necesite una guía de uso de Engram autónoma, ejecute:

```bash
engram llm
```

Esto imprime la guía empaquetada `llm.txt` y no requiere `engram inject`.


## Conversación de Configuración Recomendada

Pregunte al agente:

```text
Inicialice Engram para este espacio de trabajo, instale el conjunto de habilidades (skillset) correcto para este agente y dígame qué comando debo usar a continuación.
```

El agente puede ejecutar:

```bash
engram inject
engram help link
engram link <nombre-del-agente>
```

Para enseñar al mismo agente de forma global, de modo que los nuevos espacios de trabajo puedan cargar la memoria global de Engram sin ejecutar `engram inject` primero:

```bash
engram link --global <nombre-del-agente>
```


Para uso nativo del chat, pregunte:

```text
Instale el soporte de comando slash para que pueda usar /engram directamente desde este agente.
```

## Bucle Diario

Inicio:

```text
/engram load "tarea actual"
```

Durante el trabajo:

```text
/engram search "tema que podría estar perdiéndome"
```

Cuando el agente aprende un hecho duradero:

```text
/engram save knowledge
```

Cuando la sesión produce varias reglas, hechos o flujos de trabajo útiles:

```text
/engram save-session
```

Forma corta:

```text
/engram ss
```

Para incluir historial de chat reciente al que el agente realmente pueda acceder:

```text
/engram save-session --query-level 3
```

`--query-level` debe ser un entero positivo. El agente puede usar hasta ese número de sesiones recientes humano-agente, incluida la sesión actual, y no debe inventar historial no disponible.

Atajo de aprobación total (accept-all) solo cuando realmente lo decida:

```text
/engram ss -a
```

`-a` significa que el humano aprueba explícitamente cada candidato recomendado por el agente. Los agentes no deben agregarlo por sí mismos.

Para extraer chats recientes accesibles y aceptar todos los candidatos generados en una sola petición:

```text
/engram ss -a last 50 sessions
```

Esto se normaliza a `engram save-session --query-level 50 --accept-all`.

## Importar Conocimiento Existente

Para un repositorio que ya tiene `AGENTS.md`, `CLAUDE.md`, reglas de Cursor, notas o documentos:

```text
/engram take-control --plan
/engram take-control --all
```

Use `--plan` primero cuando desee ver los archivos seleccionados, los archivos omitidos, las estimaciones de tokens y los tipos de memoria probables.

## Memoria Global

Use la memoria global para las preferencias que deben seguirle en todos los repositorios:

```text
Configure la memoria global de Engram en <ruta>, luego guarde esta preferencia globalmente:
Use pnpm para la gestión de paquetes.
```

El agente puede usar:

```bash
engram inject --global-only --global-path <ruta>
engram save --scope global "Use pnpm para la gestión de paquetes."
engram link --global <nombre-del-agente>
```

Cuando inject detecta una memoria global configurada, crea o selecciona un perfil de usuario predeterminado para esa raíz global para que los futuros espacios de trabajo puedan reutilizarla.


## Mantenerlo Sano

Pregunte al agente al final del trabajo significativo:

```text
Compruebe la salud de Engram, informe sobre memorias no válidas y proponga cualquier cosa que valga la pena guardar de esta sesión.
```

Comandos útiles:

```bash
engram upgrade
engram upgrade --plan
engram verify
engram repair
engram graph "<tema>"
engram quality-check
engram archive --reason "<motivo>" <id-o-archivo>
```


Siguiente: [Protocolo de memoria de propiedad humana](protocol.md).
