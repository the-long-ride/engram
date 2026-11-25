---
title: Démarrage rapide avec un agent IA
sidebar_position: 2
description: Commencez à utiliser Engram via votre agent IA. Chargez la mémoire, faites le travail, puis proposez une mémoire durable lorsqu’un élément utile apparaît.
---

# Démarrage rapide avec un agent IA {#ai-agent-quickstart}

Utilisez d’abord Engram à travers votre agent. La CLI existe, mais la meilleure expérience est la suivante : demandez à l’agent de charger la mémoire, faites le travail, puis proposez une mémoire durable lorsqu’un élément utile apparaît.

## Approbation dans le chat de l’agent IA {#ai-agent-chat-approval}

Dans le chat d’un agent IA, l’approbation Engram est conversationnelle. L’agent présente d’abord des candidats `TYPE: ... | TEXT: ...` affinés, chacun avec sa ligne `Verdict:`, ainsi que la formulation balanced pour les règles (Light et Strict sont dérivées au rendu de la règle, sauf si un candidat fournit des variantes personnalisées). Répondez `yes` pour enregistrer les candidats exacts, `audit` pour les réviser ou `cancel` pour arrêter. Après `yes`, l’agent utilise `engram save-session --force` avec les candidats exacts approuvés. Les enregistrements directs depuis la CLI d’un terminal utilisent toujours A/B/C, sauf si une commande de forçage a été explicitement invoquée.

## Premier message dans une nouvelle session {#first-message-in-a-new-session}

Demandez :

```text
Use Engram for this task. Load memory for: <what we are doing>.
```

Si les adaptateurs slash sont installés :

```text
/engram load "<current task>"
```

Par défaut, l’agent doit répondre par une ligne de comptage compacte, comme `Engram loaded: 8 memories / 24 total related memories.` Avec les adaptateurs slash, `load` est la route destinée à l’agent.

Lorsqu’un agent a besoin d’un guide d’utilisation d’Engram autonome, exécutez :

```bash
engram llm
```

Cela affiche le guide `llm.txt` fourni avec le paquet et ne nécessite pas `engram inject`.

## Conversation de configuration recommandée {#recommended-setup-conversation}

Demandez à l’agent :

```text
Inject Engram memory routing for this workspace, configure it, and connect this agent.
```

L’agent proposera d’exécuter :

```bash
engram entry
```

Pour configurer la mémoire et lier les agents IA dans une interface web claire. En coulisses, pour initialiser le workspace :

```bash
engram inject
```

Pour lier le même agent globalement, afin que les nouveaux workspaces puissent charger la mémoire globale d’Engram sans exécuter d’abord `engram inject` :

```bash
engram link --global <agent-name>
```

Pour un usage natif dans le chat, demandez :

```text
Install slash support so I can use /engram directly from this agent.
```

## Boucle quotidienne {#daily-loop}

Au début :

```text
/engram load "current task"
```

Pendant le travail :

```text
/engram search "topic I might be missing"
```

Lorsque l’agent apprend un fait durable :

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

Pour inclure l’historique de chat récent auquel l’agent peut réellement accéder :

```text
/engram save-session --query-level 3
```

`--query-level` doit être un entier positif. L’agent peut utiliser jusqu’à ce nombre de sessions de chat récentes entre humain et agent, y compris la session en cours, et ne doit pas inventer un historique indisponible.

Raccourci de forçage, uniquement si vous le voulez vraiment :

```text
/engram ss -f
```

`-f` signifie que l’humain approuve explicitement chaque candidat recommandé par l’agent. Les agents ne doivent pas l’ajouter d’eux-mêmes.

Pour explorer les conversations récentes accessibles et enregistrer de force les candidats générés en une seule demande :

```text
/engram ss -f last 50 sessions
```

Cela se normalise en `engram save-session --query-level 50 --force`.

<!-- evidence-foundation:v3:start -->
## Mémoire étayée par des preuves {#evidence-backed-memory}

Capturez une source avant de décider de ce qui doit devenir durable :

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<observation>.md
```

Relisez l’enveloppe avant la promotion. L’enveloppe est modifiable, mais le contenu approuvé est récupéré depuis la trace immuable. La mémoire finale porte `evidence_refs`, de sorte que la relecture future dans la CLI et l’interface web peut suivre sa provenance.
<!-- evidence-foundation:v3:end -->

## Importer des connaissances existantes {#import-existing-knowledge}

Pour un dépôt qui possède déjà `AGENTS.md`, `CLAUDE.md`, des règles Cursor, des notes ou de la documentation :

```text
/engram take-control --plan
/engram take-control --all
```

Utilisez d’abord `--plan` lorsque vous voulez voir les fichiers sélectionnés, les fichiers ignorés, les estimations de tokens et les types de mémoire probables.

## Mémoire globale {#global-memory}

Utilisez la mémoire globale pour les préférences qui doivent vous suivre d’un dépôt à l’autre :

```text
Set up global Engram memory at <path>, then save this preference globally:
Use pnpm for package management.
```

L’agent peut utiliser :

```bash
engram inject --global-only --global-path <path>
engram save --scope global "Use pnpm for package management."
engram link --global <agent-name>
```

Lorsque inject voit une mémoire globale configurée, il crée ou sélectionne un profil utilisateur par défaut pour cette racine globale afin que les futurs workspaces puissent la réutiliser.

## La garder en bonne santé {#keep-it-healthy}

Demandez à l’agent à la fin d’un travail significatif :

```text
Check Engram health, report invalid memories, and propose anything worth saving from this session.
```

Commandes utiles :

```bash
engram upgrade
engram upgrade --plan
engram verify
engram repair
engram graph "<topic>"
engram quality-check
engram archive --reason "<why>" <id-or-file>
```

## Étapes suivantes {#next-steps}

- [Flux de travail quotidien](daily-workflow.md)
- [Installer et configurer](install.md)
- [Protocole détenu par l’humain](concepts/protocol.md)


<!-- configuration-upgrade-inventory -->
## Inventaire des mises à niveau de configuration {#configuration-upgrade-inventory}

Après une mise à jour du paquet, exécutez `engram upgrade --latest --plan` avant `engram upgrade --latest`. L’inventaire partagé analyse les mémoires, instructions, skillsets, configurations, hooks et plugins gérés par Engram, dans l’espace de travail et au niveau global. Les octets rédigés par l’utilisateur sont préservés ; les fichiers mixtes ambigus sont signalés comme conflits. Voir [Mises à niveau de configuration](operations/configuration-upgrades.md).
