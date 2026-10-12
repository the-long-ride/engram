---
title: Vue d’ensemble des commandes
sidebar_position: 1
description: Carte de toutes les commandes de la CLI Engram et de leur rôle.
---

# Vue d’ensemble des commandes {#command-overview}

Exécutez `engram -h` pour la surface de commandes compacte. Exécutez `engram help <topic>` ou `engram -h <topic>` pour obtenir des exemples et des cas d’usage propres à une commande.

## Carte des commandes {#command-map}

| Besoin | Commande |
| --- | --- |
| Charger la mémoire d’une tâche | `engram load "<task>"` |
| Charger la mémoire compacte d’une tâche | `engram load "<task>"` |
| Afficher le guide d’utilisation pour agents IA | `engram llm` |
| Prévisualiser les fichiers de mémoire routés | `engram load --dry-run "<task>"` |
| Charger avec un plafond de tokens | `engram load --budget-tokens 800 "<task>"` |
| Afficher tous les corps empaquetés | `engram load --disclosure full "<task>"` |
| Récupérer des cartes par identifiant | `engram load --id <id>,<id>` |
| Rechercher dans la mémoire | `engram search "<topic>"` |
| Enregistrer une mémoire | `engram save [rule\|workflow\|knowledge] "<text>"` |
| Enregistrer plusieurs mémoires de session | `engram save-session` ou `engram ss` |
| Explorer les conversations récentes accessibles | `engram save-session --query-level 3` |
| Enregistrer de force les candidats de session | `engram ss -f` |
| Explorer et enregistrer de force les conversations récentes | `engram ss -f last 50 sessions` |
| Capturer une note brute | `engram observe --file session.md` |
| Convertir les documents et consignes existants | `engram take-control --all` |
| Prévisualiser la reprise des sources | `engram take-control --plan` |
| Résumer du code ou de la configuration | `engram take-control --kind code --objective "<text>"` |
| Actualiser une mémoire dérivée du code devenue obsolète | `engram take-control --refresh` |
| Vérifier la fraîcheur des sources | `engram verify --sources` |
| Conserver une mémoire de travail | `engram promote <id>` |
| Purger la mémoire de travail expirée | `engram working prune [--dry-run]` |
| Voir les compteurs de récupération et d’injection | `engram stats --usage` |
| Restructurer un dossier de mémoire existant | `engram metacognize --workspace\|--global\|--all` |
| Résoudre les conflits et métacognitiser | `engram resolve-conflicts --metacognize` |
| Inspecter le routage par graphe | `engram graph "<topic>"` |
| Vérifier les hachages | `engram verify` |
| Trouver les fichiers de mémoire malformés | `engram repair` |
| Archiver une mémoire erronée | `engram archive --reason "<why>" <id-or-file>` |
| Régler la force des règles | `engram set-rule-variant strict\|balanced\|light\|off` |
| Définir la cible d’enregistrement par défaut | `engram set-save-target workspace\|global\|both\|status` |
| Définir la limite de chargement compact | `engram set-load-limit 1..32\|status\|reset` |
| Définir les lectures automatiques des hooks | `engram set-read startup\|auto\|always\|manual\|off\|status` |
| Définir la visibilité de la preuve des hooks | `engram set-proof off\|compact\|status` |
| Installer les hooks d’agent | `engram link codex\|claude\|gemini\|opencode\|cursor\|windsurf` |
| Gérer les profils globaux | `engram profile status\|list\|create\|use\|merge` |
| Cloner la mémoire workspace/global | `engram clone-memory workspace global [--metacognize]` |

## Découverte des commandes {#command-discovery}

```bash
engram help save-session
engram help set-role
engram -h set-rule-variant
```

Toutes les commandes listées dans l’aide disposent d’alias courts. Les alias déclenchent le même comportement de CLI et les mêmes portes d’approbation que leurs commandes canoniques.

## Complétion du shell {#shell-completion}

```bash
engram completion bash
engram completion zsh
engram completion powershell
```

## Étapes suivantes {#next-steps}

- [load / search / graph](load-search-graph.md)
- [save / save-session / observe](save-session.md)
- [inject / link / upgrade](inject-link-upgrade.md)


## Identité d’auteur Git {#git-author-identity}

Engram peut stocker un auteur global et une surcharge d’espace de travail facultative. La résolution suit l’ordre workspace, global, puis repli Git en lecture seule. Les paramètres n’affectent que les mémoires futures ; une surcharge d’espace de travail ne modifie jamais la configuration Git globale. Utilisez un plan explicite et une confirmation pour la synchronisation Git globale ou la migration des anciennes mémoires.

```bash
engram author show
engram author set --name "Jane Doe" --email "jane@example.com"
engram author unset --scope workspace
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author migrate-memories --plan
engram author migrate-memories --confirm
```

Lisez le [guide complet des paramètres de l’auteur Git](../operations/git-author-settings.md).
