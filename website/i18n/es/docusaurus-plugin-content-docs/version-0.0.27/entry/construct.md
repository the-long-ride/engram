---
title: Pestaña Construct (Construir)
sidebar_position: 4
description: Configure cada campo del tiempo de ejecución de Engram desde la pestaña Construct. Cada campo tiene su caso de uso, valor predeterminado seguro, validación y advertencia de riesgo.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Pestaña Construct

La pestaña Construct expone cada campo de configuración del tiempo de ejecución de Engram, agrupado exactamente como en la interfaz de usuario. Cada campo tiene su descripción, casos de uso, valor predeterminado seguro, validación y advertencia de riesgo.

<RiskCallout level="caution">
Los campos marcados como **risky** (riesgosos) pueden deshabilitar Engram, cambiar los objetivos de almacenamiento, cambiar el comportamiento de Git o afectar la seguridad de la memoria. Lea la advertencia antes de modificarlos.
</RiskCallout>

## Grupo Core (Núcleo)

### Enabled (Habilitado)

**Clave de configuración:** `enabled`  
**Control:** alternancia  
**Predeterminado:** `true`  
**Riesgo:** risky

Interruptor principal. Deshabilitarlo detiene por completo el comportamiento de Engram. Úselo únicamente para apagados temporales o pruebas.

### Save Target (Objetivo de almacenamiento)

**Clave de configuración:** `scope`  
**Control:** selección — `workspace`, `global`, `both`  
**Predeterminado:** `both`  
**Riesgo:** risky

Controla dónde se guardan las nuevas memorias aprobadas. Use `workspace` para memoria específica del repositorio, `global` para memoria personal/de equipo y `both` para nuevas instalaciones que deseen usar ambos ámbitos.

### Read Mode (Modo de lectura)

**Clave de configuración:** `read`  
**Control:** selección — `auto`, `startup`, `always`, `manual`, `off`  
**Predeterminado:** `auto`  
**Riesgo:** normal

Controla cuándo los hooks de los agentes inyectan el contexto de memoria. `auto` carga en el inicio de la sesión y vuelve a inyectar solo cuando cambia el contexto enrutado. `manual` y `off` reducen la automatización a cambio de evitar la sobrecarga del contexto.

### Proof Mode (Modo de prueba)

**Clave de configuración:** `proof`  
**Control:** selección — `off`, `compact`  
**Predeterminado:** `off`  
**Riesgo:** normal

Si los hooks añaden una línea compacta `Engram proof:` en cada turno elegible. Útil para depuración y visibilidad de auditoría.

### Global Memory Path (Ruta de memoria global)

**Clave de configuración:** `global_path`  
**Control:** texto/ruta  
**Predeterminado:** vacío hasta que se configure  
**Riesgo:** risky

Ruta del sistema de archivos para la memoria global. Use una carpeta estable y de propiedad del usuario como `~/Documents/engram`. Evite carpetas temporales, carpetas públicas sincronizadas y directorios en los que no pueda escribir.

<RiskCallout level="risky">
El uso de una carpeta pública sincronizada en la nube para la memoria privada puede filtrar secretos. Use una ruta privada o un repositorio Git privado.
</RiskCallout>

**Equivalente en CLI:**

```bash
engram update-global-folder ~/Documents/engram
engram ugf ~/Documents/engram
```

### Default Profile (Perfil predeterminado)

**Clave de configuración:** `default_profile`  
**Control:** selección  
**Predeterminado:** vacío  
**Riesgo:** risky

Perfil utilizado cuando no se establece ninguno explícitamente. Consulte [Perfiles y resolución de alcance](../concepts/profiles.md).

### Active Roles (Roles activos)

**Clave de configuración:** `roles`  
**Control:** entrada de roles separada por comas  
**Predeterminado:** lista vacía  
**Riesgo:** normal

Restringe y vuelve a clasificar las memorias por rol. Use nombres seguros que coincidan con `^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$`.

## Grupo Load Routing (Enrutamiento de carga)

### Load Limit (Límite de carga)

**Clave de configuración:** `load.limit`  
**Control:** número 1–32  
**Predeterminado:** `8`  
**Riesgo:** normal

Cantidad máxima de memorias devueltas por una carga normal. Los valores más bajos reducen la saturación del contexto en modelos de contexto bajo; los valores más altos ayudan en tareas de arquitectura profunda.

## Grupo Memory Limits (Límites de memoria)

### Rule Line Target (Línea objetivo de regla)

**Clave de configuración:** `memory.rule_line_target`  
**Control:** número 50–200, paso 10  
**Predeterminado:** `70`  
**Riesgo:** normal

Tamaño recomendado para las memorias de reglas. Las reglas concisas se enrutan mejor que las políticas demasiado largas.

### Rule Line Hard Limit (Límite estricto de línea de regla)

**Clave de configuración:** `memory.rule_line_hard_limit`  
**Control:** número 50–200, paso 10  
**Predeterminado:** `100`  
**Riesgo:** risky

Límite máximo estricto para memorias de reglas.

<RiskCallout level="risky">
Aumentar este límite puede incrementar la saturación del contexto y reducir la calidad del enrutamiento. Mantenga las reglas concisas.
</RiskCallout>

## Grupo Graph (Grafo)

### graph.enabled

**Control:** alternancia  
**Predeterminado:** `true`  
**Riesgo:** normal

Habilita el enrutamiento de dependencias y relaciones mediante `depends_on`, memorias relacionadas y la vista de grafo.

### graph.max_related

**Control:** número 1–20  
**Predeterminado:** `4`  
**Riesgo:** normal

Limita el número de memorias relacionadas extraídas a través de las señales del grafo.

### graph.min_related_score

**Control:** número 0–1, paso 0.01  
**Predeterminado:** `0.22`  
**Riesgo:** normal

Puntaje mínimo de similitud para aristas relacionadas. Aumente para mayor precisión, disminuya para mayor recuperación.

## Grupo Vector Search (Búsqueda vectorial)

### vector.enabled

**Control:** alternancia  
**Predeterminado:** `true`  
**Riesgo:** normal

Habilita el enrutamiento vectorial local opcional. Sin dependencias de la nube.

### vector.auto_threshold

**Control:** número 10–1000  
**Predeterminado:** `100`  
**Riesgo:** normal

Cantidad de memorias a partir de la cual se activa la búsqueda vectorial. Es posible que las bóvedas pequeñas no necesiten búsqueda vectorial.

### vector.candidate_pool

**Control:** número 8–100  
**Predeterminado:** `24`  
**Riesgo:** normal

Cuántos candidatos considera la búsqueda vectorial antes de volver a clasificar. Valores más altos mejoran la recuperación a costa de la latencia.

### vector.dimensions

**Control:** número 16–512  
**Predeterminado:** `64`  
**Riesgo:** normal

Dimensiones de incrustación (embeddings) para el sidecar vectorial local. Cambiar esto requiere una reconstrucción.

## Grupo Rule Variants (Variantes de reglas)

### rule_variants.enabled

**Control:** alternancia  
**Predeterminado:** `false`  
**Riesgo:** normal

Habilita las variantes de roles/estrictez. Úselo cuando los equipos necesiten un enrutamiento ligero, equilibrado o estricto.

### rule_variants.active

**Control:** selección — `light`, `balanced`, `strict`  
**Predeterminado:** `balanced`  
**Riesgo:** normal

Controla la estrictez de las reglas cargadas. El modo `strict` ayuda a los modelos de menor capacidad; `light` y `balanced` suelen adaptarse mejor a modelos más fuertes.

## Grupo Live Sync (Sincronización en vivo)

### live_sync.enabled

**Control:** alternancia  
**Predeterminado:** `false`  
**Riesgo:** normal

Sincroniza los archivos de contexto generados del agente al guardar.

## Grupo Global Git (Git global)

<RiskCallout level="risky">
Todos los campos de Git global son riesgosos. Controlan el historial de auditoría y el comportamiento de sincronización del equipo para la memoria global. Revise cada uno antes de habilitarlos.
</RiskCallout>

| Campo | Control | Predeterminado | Notas |
| --- | --- | --- | --- |
| `global_git.enabled` | alternancia | `true` | Habilita el comportamiento de Git para la memoria global |
| `global_git.remote` | texto | `origin` | Nombre del remoto de Git; no puede contener espacios en blanco |
| `global_git.remote_url` | texto | vacío | URL del remoto de memoria global compartida; se acepta HTTPS/SSH |
| `global_git.branch` | texto | `main` | Rama de destino para la sincronización |
| `global_git.auto_sync` | alternancia | `true` | Comportamiento automático de pull/push |
| `global_git.auto_resolve` | alternancia | `true` | Manejo automático de conflictos — revise las diferencias de memoria |

## Grupo Pattern Mining (Minería de patrones)

| Campo | Control | Predeterminado | Notas |
| --- | --- | --- | --- |
| `pattern_mining.enabled` | alternancia | `false` | Extracción experimental de patrones recurrentes |
| `pattern_mining.threshold` | número 1–20 | `3` | Repeticiones antes de que un candidato a patrón sea relevante |
| `pattern_mining.lookback_sessions` | número 1–100 | `20` | Sesiones recientes a inspeccionar |

## Grupo PR Workflow (Flujo de trabajo de PR)

| Campo | Control | Predeterminado | Notas |
| --- | --- | --- | --- |
| `pr_workflow.enabled` | alternancia | `false` | Flujo de trabajo de PR en equipo experimental para cambios de memoria |
| `pr_workflow.target_branch` | texto | `main` | Rama que recibe las PR de memoria |

## Grupo Encryption (Cifrado)

<RiskCallout level="risky">
Existe la configuración de cifrado, pero el almacenamiento cifrado aún no está implementado. Documente claramente las limitaciones actuales a los usuarios.
</RiskCallout>

| Campo | Control | Predeterminado | Notas |
| --- | --- | --- | --- |
| `encryption.enabled` | alternancia | `false` | Modo de cifrado futuro/avanzado |
| `encryption.scope` | selección — `workspace`, `global` | `global` | A qué ámbito se aplica el cifrado |
| `encryption.key_source` | selección — `portable-file` | `portable-file` | Estrategia de origen de la clave; riesgo de pérdida de la copia de seguridad |

## Siguientes pasos

- [Referencia completa de campos](field-reference.md)
- [Pestaña Profiles](profiles.md)
- [Pestaña Runtime](runtime.md)
