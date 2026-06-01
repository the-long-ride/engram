# Entender Engram

Lee esta página antes de la guía de comandos. Engram importa por quién posee la memoria, no por la cantidad de comandos.

## Modelo En Una Frase

Engram es un protocolo de archivos que permite a los agentes de IA usar memoria duradera mientras las personas deciden qué se vuelve duradero.

## Qué Es Engram

Engram es un centro de memoria de conocimiento para:

- reglas de proyecto
- decisiones de equipo
- flujos repetibles
- hechos duraderos
- preferencias personales que deben viajar entre proyectos

La memoria es Markdown común. El índice, el grafo, los hashes y los adaptadores existen para que ese Markdown sea más fácil y seguro de usar.

## Qué No Es Engram

Engram no es:

- un cerebro oculto del agente
- un silo de memoria propiedad de un proveedor
- un reemplazo de la documentación del proyecto
- una base vectorial que pretende ser autoridad
- una grabadora automática que guarda todo para siempre

Los agentes pueden proponer memoria. Las personas aprueban, rechazan, editan, archivan y poseen la memoria.

## Promesa Principal

Engram busca que la memoria de IA sea:

- revisable: se lee en un editor normal
- portable: se sincroniza con Git y funciona con varios agentes
- corregible: la memoria incorrecta se archiva con una razón
- privada por defecto: ignore rules y aprobación reducen capturas accidentales
- deliberadamente simple: Markdown es más confiable que estado invisible de plataforma

## Capas

| Capa | Significado |
| --- | --- |
| Markdown | fuente de verdad duradera |
| JSON index | capa de búsqueda rápida |
| JSON graph | rutas por tema y relación |
| Hashes | controles de integridad |
| Approval | frontera de confianza antes de escribir |
| Ignore rules | controles de privacidad |
| Git | historial, portabilidad, revisión, recuperación |
| Agent adapters | capa de comodidad para Codex, Claude, Cursor, Gemini y otros agentes |

El JSON generado ayuda a encontrar memoria más rápido, pero no es la autoridad. Si el JSON y Markdown discrepan, gana Markdown.

## Ciclo De Vida De La Memoria

1. Una sesión, archivo o nota humana contiene conocimiento útil.
2. Un agente propone candidatos concisos.
3. Una persona aprueba todo, selecciona algunos, añade una nota o rechaza.
4. Engram escribe Markdown aprobado.
5. Engram actualiza hashes, índice, grafo y changelog.
6. Agentes futuros cargan solo la memoria relevante para la tarea.
7. Si una memoria se vuelve incorrecta, Engram la archiva con una razón.

Este ciclo mantiene la memoria activa sin hacerla invisible.

## Humano, Agente, Engram, Git

| Actor | Rol |
| --- | --- |
| Humano | decide qué se vuelve memoria duradera |
| Agente | detecta patrones y propone candidatos |
| Engram | aplica esquema, seguridad, rutas, aprobación y mantenimiento |
| Git | mueve memoria entre máquinas y conserva historial de revisión |

El agente ayuda, pero no es el dueño.

## Buena Memoria

Una buena memoria Engram es:

- suficientemente estable para importar la próxima semana
- suficientemente específica para encontrarse después
- suficientemente corta para entrar en contexto del agente
- segura para el alcance elegido
- escrita como regla, flujo o conocimiento

Mala memoria es ruido temporal de chat, secretos, credenciales, especulación puntual o hechos no aprobados.

## Alcance

La memoria workspace vive en:

```text
<project>/.agents/.engram/
```

La memoria global es opcional y vive donde la configure el usuario.

Workspace gana. Global es fallback para preferencias reutilizables, hábitos personales o defaults de equipo.

## Por Qué No Solo Memoria Integrada

La memoria integrada es cómoda, pero puede ser difícil de inspeccionar, comparar, exportar, compartir o corregir. Suele pertenecer a una app o cuenta.

Engram hace visible la capa duradera. La memoria integrada puede ayudar, pero Engram debe ser la fuente poseída cuando el conocimiento importa.

## Límites A Conocer

La búsqueda actual es léxica y determinista. Los vectores del grafo son vectores locales de palabras hasheadas, no embeddings semánticos. La detección de contradicciones es orientativa. Existe configuración de cifrado, pero el almacenamiento cifrado aún no está implementado.

Estos límites se declaran a propósito. Engram debe mostrar qué existe hoy y qué es trabajo futuro.

Siguiente: [Quickstart con agente](quickstart.md).
