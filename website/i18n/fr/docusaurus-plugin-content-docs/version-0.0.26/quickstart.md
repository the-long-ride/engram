---
title: "Démarrage rapide pour agent IA"
sidebar_position: 2
description: "Commencez à utiliser Engram via votre agent IA. Chargez la mémoire, faites le travail, puis proposez une mémoire durable lorsqu'un élément utile apparaît."
---

# Démarrage Rapide pour Agent d'IA

## Approbation en Chat IA

Dans le chat avec un agent IA, l'approbation Engram est conversationnelle. L'agent montre d'abord des candidats affines `TYPE: ... | TEXT: ...`, y compris les variantes Light/Balanced/Strict pour les regles. Repondez `yes` pour enregistrer exactement ces candidats, `audit` pour les reviser, ou `cancel` pour arreter. Apres `yes`, l'agent utilise `engram save-session --force` avec les candidats approuves. Les enregistrements directs en CLI continuent d'utiliser A/B/C sauf si une commande accept-all a ete invoquee explicitement.


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

L'agent doit uniquement résumer les identifiants de mémoire (IDs) et les règles pertinentes, pas coller chaque fichier.

Lorsqu'un agent a besoin d'un guide d'utilisation d'Engram autonome, exécutez :

```bash
engram llm
```

Cela affiche le guide `llm.txt` empaqueté et ne nécessite pas `engram inject`.

## Conversation de Configuration Recommandée

Demandez à l'agent :

```text
Initialise Engram pour cet espace de travail, installe le bon ensemble de compétences (skillset) pour cet agent, et indique-moi la commande que je devrais utiliser ensuite.
```

L'agent peut exécuter :

```bash
engram inject
engram help link
engram link <nom-de-l-agent>
```

Pour enseigner au même agent de manière globale, afin que les nouveaux espaces de travail puissent charger la mémoire globale d'Engram sans exécuter `engram inject` au préalable :

```bash
engram link --global <nom-de-l-agent>
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

Pour inclure l'historique de chat récent auquel l'agent peut réellement accéder :

```text
/engram save-session --query-level 3
```

`--query-level` doit être un entier positif. L'agent peut utiliser jusqu'à ce nombre de sessions humain-agent récentes, y compris la session actuelle, et ne doit pas inventer d'historique indisponible.

Raccourci d'approbation totale (accept-all) uniquement lorsque vous le souhaitez vraiment :

```text
/engram ss -f
```

`-f` signifie que l'humain approuve explicitement chaque candidat recommandé par l'agent. Les agents ne doivent pas l'ajouter d'eux-mêmes.

Pour exploiter des conversations récentes accessibles et accepter tous les candidats générés en une seule requête :

```text
/engram ss -f last 50 sessions
```

Cela se normalise en `engram save-session --query-level 50 --force`.

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
engram inject --global-only --global-path <chemin>
engram save --scope global "Utiliser pnpm pour la gestion des paquets."
engram link --global <nom-de-l-agent>
```

Lorsque inject détecte une mémoire globale configurée, il crée ou sélectionne un profil utilisateur par défaut pour cette racine globale afin que les futurs espaces de travail puissent la réutiliser.


## Garder le Système Sain

Demandez à l'agent à la fin de tout travail significatif :

```text
Vérifie la santé d'Engram, signale les mémoires invalides et propose tout ce qui mérite d'être sauvegardé de cette session.
```

Commandes utiles :

```bash
engram upgrade
engram upgrade --plan
engram verify
engram repair
engram graph "<sujet>"
engram quality-check
engram archive --reason "<pourquoi>" <id-ou-fichier>
```


Suivant : [Protocole de mémoire humaine](concepts/write-path.md).

