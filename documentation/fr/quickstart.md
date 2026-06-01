# Quickstart Avec Agent IA

Utilisez Engram via l'agent d'abord. Le CLI existe, mais le meilleur flux est: demander à l'agent de charger la mémoire, travailler, puis proposer ce qui mérite de devenir durable.

## Premier Message

```text
Utilise Engram pour cette tâche. Charge la mémoire pour: <ce que nous faisons>.
```

Avec les slash adapters:

```text
/engram load "<current task>"
```

L'agent doit résumer les IDs/règles pertinents, pas coller tous les fichiers.

## Installation Recommandée

```text
Initialise Engram pour ce workspace, installe le skillset adapté à cet agent,
et dis-moi quelle commande utiliser ensuite.
```

```bash
engram init
engram help install-skillset
engram install-skillset <agent-name>
```

Pour le chat:

```text
Installe le support slash pour que je puisse utiliser /engram directement.
```

## Boucle Quotidienne

```text
/engram load "current task"
/engram search "topic I might be missing"
/engram save knowledge
/engram save-session
/engram ss
```

Accept-all seulement si vous le voulez vraiment:

```text
/engram ss -a
```

`-a` signifie que l'humain approuve explicitement tous les candidats proposés.

## Importer L'Existant

```text
/engram take-control --plan
/engram take-control --all
```

`--plan` montre sources sélectionnées, sources ignorées, estimation de tokens et types probables.

## Mémoire Globale

```text
Configure une mémoire globale Engram à <path>, puis sauvegarde cette préférence globalement:
Use pnpm for package management.
```

```bash
engram init --global-only --global-path <path>
engram save --scope global "Use pnpm for package management."
```

## Santé

```text
Vérifie la santé d'Engram, signale les mémoires invalides et propose quoi sauvegarder depuis cette session.
```

```bash
engram verify
engram repair
engram graph "<topic>"
engram quality-check
engram archive --reason "<why>" <id-or-file>
```

Suite: [Protocole](protocol.md).

