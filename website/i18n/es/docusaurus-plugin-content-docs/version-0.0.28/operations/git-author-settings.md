---
title: Configuración de autor Git
sidebar_position: 2
description: Configure la identidad escrita en las futuras memorias de Engram y confirmaciones de Git.
---

# Configuración de autor Git

Engram posee un perfil de autor para que la autoría sea explícita y portable. La identidad resuelta se escribe en los metadatos de las futuras memorias.

<!-- future-memories-only -->
La configuración de autor afecta **solo a las futuras memorias**. Las memorias existentes cambian solo mediante el comando de migración explícito.

<a id="global-author"></a>
## Autor global

Establezca la identidad Engram predeterminada para todos los espacios de trabajo:

```bash
engram author set --name "Jane Doe" --email "jane@example.com"
engram author show
engram author --help
engram author set --help
```

Las nuevas memorias utilizan campos separados `author_name` y `author_email`. El campo heredado `author: jane@example.com` sigue siendo legible.

<a id="workspace-override"></a>
## Anulación de espacio de trabajo

Un espacio de trabajo puede anular el perfil global de Engram sin cambiar otros espacios de trabajo:

```bash
engram author set --scope workspace --name "Workspace Jane" --email "jane@work.com"
engram author show --scope workspace
```

<!-- workspace-never-syncs-global-git -->
Una anulación de espacio de trabajo nunca sincroniza la configuración global de Git. Se almacena en el espacio de trabajo.

<a id="resolution-order"></a>
## Orden de resolución

```bash
engram author show
engram author show --json
engram author show --help
```

Engram resuelve la identidad en este orden:
1. Autor Engram del espacio de trabajo.
2. Autor Engram global.
3. Valor de reserva de Git `user.name` y `user.email` de solo lectura.
4. No resuelto.

En Entry, la fuente resuelta se muestra con distintivos `WORKSPACE`, `GLOBAL`, `GIT` o `UNRESOLVED`.

<a id="remove-an-author-profile"></a>
## Eliminar un perfil de autor

```bash
engram author unset --scope workspace
engram author unset --scope global
engram author unset --help
```

Use `engram author unset --scope workspace` o `--scope global` para eliminar un perfil.

<a id="global-git-configuration"></a>
## Configuración Git global

Entry expone la configuración Git solo en la pestaña Global bajo **Configuración → Git**.

<a id="sync-to-global-git"></a>
## Sincronizar con Git global

```bash
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author sync-git-global --help
```

Solo el perfil global de Engram se puede copiar a la configuración global de Git. Previsualice primero y use `--confirm` para ejecutar.

<a id="migrate-existing-memories"></a>
## Migrar memorias existentes

```bash
engram author migrate-memories --plan
engram author migrate-memories --confirm
```

Rellene `author_name` y `author_email` mediante `engram author migrate-memories --plan` y luego use `--confirm`.
