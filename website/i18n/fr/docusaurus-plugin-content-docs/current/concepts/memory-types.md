---
title: Types de mémoire
sidebar_position: 2
description: La mémoire Engram est typée — Rule, Skill et Knowledge — afin que le routage et la relecture restent ciblés.
---

# Types de mémoire {#memory-types}

Chaque mémoire Engram active a un type. Le type contrôle le routage, la relecture et la façon dont la mémoire est présentée aux agents.

| Type | Usage |
| --- | --- |
| Rule | préférence de l’utilisateur, correction, contrainte, consigne « toujours / jamais » |
| Skill | flux de travail répétable, liste de contrôle, procédure, runbook |
| Knowledge | fait objectif du projet, décision, détail d’implémentation |

Les nouveaux fichiers utilisent `schema_version: 3`. Les mémoires Rule et Skill ont par défaut `authority: instruction` ; Knowledge a par défaut `authority: reference`. `revision` démarre à 1 et s’incrémente à chaque mise à jour. Les identifiants de trace vont dans `evidence_refs`, tandis que les identités de session ou de source vont dans `derived_from`.

## Une bonne mémoire {#good-memory}

Une bonne mémoire Engram est :

- assez stable pour compter la semaine prochaine
- assez précise pour être routée plus tard
- assez courte pour tenir dans le contexte d’un agent
- assez sûre pour être partagée avec la portée prévue
- rédigée comme une règle, un flux de travail ou un élément de connaissance

Une mauvaise mémoire, c’est du bruit de conversation temporaire, des secrets, des identifiants, des conjectures ponctuelles ou des faits que personne n’a approuvés.

## Variantes de règle {#rule-variants}

Engram dérive les formulations light, balanced et strict d’une règle au moment du rendu à partir de son `## Content` (balanced correspond au Content tel quel) ; les fichiers de règle nouveaux ou réécrits ne stockent donc que le Content. Une section `## Rule Variants` n’est conservée que pour une formulation personnalisée qu’un candidat fournit avec `LIGHT:`/`BALANCED:`/`STRICT:`. Le mode de variante de règle est une lentille de rendu pour la mémoire destinée aux agents :

- **Strict** aide les modèles de niveau inférieur à rester cadrés.
- Une formulation **light** ou **balanced** aide en général les modèles plus performants, afin que les règles ne brident pas leur raisonnement.

Lorsque les variantes sont désactivées, Engram rend par défaut la formulation balanced. Réglez-le avec :

```bash
engram set-rule-variant strict|balanced|light|off
```

## Sortie compacte par défaut {#compact-output-by-default}

Lorsque `engram load "<task>"` s’exécute, la sortie est hiérarchisée et allégée pour les agents IA par défaut :

| Aspect | Par défaut (`engram load`) | Complet (`engram load --full`) |
| --- | --- | --- |
| Frontmatter | Non rendu ; l’en-tête du corps est `### <id> [<type>, <authority>]` plus `requires: <ids>` | Schéma v3 complet et champs hérités, y compris provenance, révision, remplacement et validité |
| Divulgation | Les `load.expand_top` meilleurs résultats en corps, les autres en cartes d’une ligne (`- <id> [<type>] <directive-or-summary>`), puis une indication `fetch:` | Tous les corps empaquetés |
| Corps d’une règle | Une variante sélectionnée | Le Content, plus la section `## Rule Variants` stockée uniquement lorsque le fichier a des variantes personnalisées |
| Autres sections | `## Context`, `## Example` et `## Origin` ne sont pas rendues | Même contenu, titre inchangé |

Le `engram_load` MCP et les hooks utilisent par défaut la sortie hiérarchisée. Passez `full: true` sur l’outil MCP ou `engram load --full "<task>"` lorsqu’une sortie héritée plus large est nécessaire.

## Champs de routage facultatifs {#optional-routing-fields}

Ces champs de frontmatter sont facultatifs ; une mémoire qui en est dépourvue se comporte comme avant et `schema_version` reste 3.

| Champ | Signification |
| --- | --- |
| `directive` | Une ligne d’au plus 160 caractères ; affichée sur les cartes et pondérée dans le classement |
| `applies_to` | Liste de globs ; injecte la mémoire lorsqu’un fichier correspondant est lu ou modifié et compte comme un fort point d’ancrage |
| `tier` | `durable` (par défaut) ou `working` (limitée à une tâche, ignorée par Git, expire) |
| `objective` | Jusqu’à 200 caractères ; l’objectif pour lequel une mémoire de travail a été écrite |
| `valid_until` | Date d’expiration ; une mémoire de travail reçoit aujourd’hui + `load.working_ttl_days` |

<!-- evidence-foundation:v3:start -->
## Mémoire étayée par des preuves {#evidence-backed-memory}

Les nouveaux fichiers utilisent `schema_version: 3`. Les mémoires Rule et Skill ont par défaut `authority: instruction` ; Knowledge a par défaut `authority: reference`. `revision` démarre à 1 et s’incrémente à chaque mise à jour. Les identifiants de trace vont dans `evidence_refs`, tandis que les identités de session ou de source vont dans `derived_from`. Les anciens formats v1 (`Context` + `Content` + `Example`) et v2 (`Content`, `Origin` facultatif) restent lisibles.
<!-- evidence-foundation:v3:end -->

## Étapes suivantes {#next-steps}

- [Mémoire workspace et mémoire globale](scopes.md)
- [Chemin de lecture et routage](read-path.md)


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


<!-- configuration-upgrade-inventory -->
## Inventaire des mises à niveau de configuration {#configuration-upgrade-inventory}

Après une mise à jour du paquet, exécutez `engram upgrade --latest --plan` avant `engram upgrade --latest`. L’inventaire partagé analyse les mémoires, instructions, skillsets, configurations, hooks et plugins gérés par Engram, dans l’espace de travail et au niveau global. Les octets rédigés par l’utilisateur sont préservés ; les fichiers mixtes ambigus sont signalés comme conflits. Voir [Mises à niveau de configuration](../operations/configuration-upgrades.md).
