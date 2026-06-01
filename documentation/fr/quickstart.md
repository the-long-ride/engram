# Démarrage Rapide pour Agent d'IA

Utilisez d'abord Engram par le biais de votre agent. Le CLI existe, mais la meilleure expérience est la suivante : demandez à l'agent de charger la mémoire, effectuez le travail, puis proposez une mémoire durable lorsque quelque chose d'utile se dégage.

## Premier Message Dans Une Nouvelle Session

Demandez :

```text
Utilise Engram pour cette tâche. Charge la mémoire pour : <ce que nous faisons>.
```

Si les adaptateurs slash sont installés :

```text
/engram load "<tâche actuelle>"
```

L'agent doit résumer uniquement les identifiants de mémoire (IDs) et les règles pertinentes, et non coller l'intégralité de chaque fichier.

## Conversation de Configuration Recommandée

Demandez à l'agent :

```text
Initialise Engram pour cet espace de travail, installe le bon ensemble de compétences (skillset) pour cet agent, et indique-moi la commande que je devrais utiliser ensuite.
```

L'agent peut exécuter :

```bash
engram init
engram help install-skillset
engram install-skillset <nom-de-l-agent>
```

Pour une utilisation native dans le chat, demandez :

```text
Installe le support des commandes slash pour que je puisse utiliser /engram directement depuis cet agent.
```

## Boucle Quotidienne

Démarrage :

```text
/engram load "tâche actuelle"
```

Pendant le travail :

```text
/engram search "sujet que je pourrais avoir manqué"
```

Lorsque l'agent apprend un fait durable :

```text
/engram save knowledge
```

Lorsque la session a produit plusieurs règles, faits ou flux de travail utiles :

```text
/engram save-session
```

Forme courte :

```text
/engram ss
```

Raccourci d'approbation totale (accept-all) uniquement lorsque vous le souhaitez vraiment :

```text
/engram ss -a
```

`-a` signifie que l'humain approuve explicitement chaque candidat recommandé par l'agent. Les agents ne doivent pas l'ajouter d'eux-mêmes.

## Importer des Connaissances Existantes

Pour un dépôt qui a déjà un fichier `AGENTS.md`, `CLAUDE.md`, des règles Cursor, des notes ou des documents :

```text
/engram take-control --plan
/engram take-control --all
```

Utilisez `--plan` en premier lorsque vous souhaitez voir les fichiers sélectionnés, les fichiers ignorés, les estimations de tokens et les types de mémoire probables.

## Mémoire Globale

Utilisez la mémoire globale pour les préférences qui doivent vous suivre dans tous les dépôts :

```text
Configure la mémoire globale d'Engram sur <chemin>, puis enregistre cette préférence globalement :
Use pnpm for package management.
```

L'agent peut utiliser :

```bash
engram init --global-only --global-path <chemin>
engram save --scope global "Use pnpm for package management."
```

## Garder le Système Sain

Demandez à l'agent à la fin de tout travail significatif :

```text
Vérifie la santé d'Engram, signale les mémoires invalides et propose tout ce qui mérite d'être sauvegardé de cette session.
```

Commandes utiles :

```bash
engram verify
engram repair
engram graph "<sujet>"
engram quality-check
engram archive --reason "<pourquoi>" <id-ou-fichier>
```

Suivant : [Protocole de mémoire humaine](protocol.md).
