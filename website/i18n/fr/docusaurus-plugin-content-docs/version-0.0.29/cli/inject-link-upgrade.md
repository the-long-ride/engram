---
title: inject / link / upgrade
sidebar_position: 4
description: Commandes de configuration et d’adaptateurs — initialiser les espaces de travail, lier les agents et réconcilier après une mise à jour du paquet.
---

# inject / link / upgrade

Les commandes de configuration et d’adaptateurs initialisent les espaces de travail, lient les agents et réconcilient l’installation après une mise à jour du paquet.

## inject

```bash
engram inject
engram inject --scope workspace|global|both
engram inject --global-only --global-path <path>
engram inject --submodule
engram inject --submodule-remote <git-url>
engram inject --global-remote <git-url>
engram inject --global-branch <branch>
engram inject --no-skillset
engram inject --skillset all
engram inject --no-global
```

`engram inject` crée `.agents/.engram/` et installe par défaut la cible Codex compacte. Les fichiers rédigés par un humain sont ignorés.

L’`inject` interactif pose les questions dans cet ordre : faut-il ajouter `./.agents/.engram` comme sous-module, faut-il utiliser un chemin Engram global, et faut-il ajouter une origine Git globale partagée.

Utilisez `engram update-global-folder <new-path>` ou `engram ugf <new-path>` pour ne mettre à jour que le chemin global configuré. Les formes en langage courant, comme `engram set global memory path to <new-path>` et `engram move global folder from <old-path> to <new-path>`, sont normalisées vers la même commande. Ajoutez `--move-from-path <old-path>` pour qu’Engram déplace aussi toute l’ancienne racine globale.

## link

```bash
engram link codex
engram link claude
engram link gemini
engram link cursor
engram link windsurf
engram link --global opencode
engram link all
engram link list
engram link --all-supported
engram unlink
```

`engram link all` installe l’ensemble des cibles publiques et signale des raisons `SKIPPED` déterministes pour les hôtes partiels, dans une seule installation unifiée couvrant les fichiers d’instructions du skillset, la configuration MCP, les adaptateurs de commandes slash et les hooks d’agent. `engram unlink` supprime tout cela d’un seul bloc. `engram unlink --global <target>` ne supprime que le plugin global généré par Engram ; un fichier rédigé par un humain est conservé sauf si `--force` est explicite.

`engram link claude --session-end` (ou `codex`) enregistre en plus un hook de commande `SessionEnd` optionnel qui place le chemin de la transcription de session dans la file `session-queue.json`, ignorée par Git ; il est désactivé par défaut et `engram upgrade` ne l’ajoute jamais. Vous le vidangez avec `engram observe --queue` ; voir [Hooks](../integrations/hooks.md).

## upgrade

```bash
engram upgrade
engram upgrade --plan
engram upgrade --latest
engram upgrade --self
engram upgrade --memory-only
engram upgrade --global-skillsets-only
engram upgrade --target codex
```

Utilisez `engram upgrade` après l’installation d’un paquet Engram plus récent. La commande compare les racines de mémoire initialisées depuis la v0.0.8 au schéma de la version courante et actualise le `HELP.md` généré, les index de mémoire, les fichiers de graphe, les fichiers annexes vectoriels éligibles, les skillsets générés de l’espace de travail, l’ossature de la mémoire globale et les skillsets d’agent globaux enregistrés, tout en préservant les fichiers rédigés par un humain.

Les commandes normales exécutent aussi silencieusement la même réconciliation des racines une fois par version du paquet, sauf si `--no-auto-upgrade` ou `ENGRAM_NO_AUTO_UPGRADE=1` est défini.

Utilisez `engram upgrade --latest` lorsque la sortie du nouveau paquet doit écraser les artefacts d’agent liés et gérés par Engram. Ce chemin réapplique les fichiers d’instructions, les règles, la configuration MCP/plugin et les hooks gérés des espaces de travail liés, et actualise également les installations d’agent globales enregistrées avec les derniers fichiers générés.

N’utilisez `--force` que pour remplacer délibérément des fichiers d’adaptateur Engram générés.

## take-control

```bash
engram take-control --plan
engram take-control --all
engram take-control --file AGENTS.md
engram take-control --dir docs
engram take-control --include "docs/**/*.md" --exclude "docs/private/**"
engram take-control --max-sources 5 --max-chars 900
engram take-control --all --metacognize --force
engram take-control --plan --json --kind code
engram take-control --kind code --objective "add billing export"
engram take-control --refresh
engram take-control --from claude-auto-memory --plan
engram take-control --from codex-memories --plan
```

`take-control` est le flux de reprise assistée par un agent pour les consignes existantes d’un espace de travail. Il construit un lot de sources compact à partir de fichiers tels que `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, les règles Cursor, les notes de memory-bank et les dossiers de premier niveau `rules/`, `skills/`, `workflows/`, `knowledge/` ou `notes/`, y compris les notes `.txt`.

Les mémoires take-control enregistrées conservent `source_files` et `source_hashes`, de sorte que les sources inchangées sont ignorées par la suite.

### Résumés de code et de configuration {#code-and-config-digests}

`--kind docs|code|config|all` (les listes séparées par des virgules sont acceptées ; `docs` par défaut, ce qui conserve le comportement décrit plus haut) ajoute des extracteurs qui produisent un court résumé par source au lieu du texte brut :

- **code** : signatures exportées, première ligne des commentaires de documentation et imports, jamais les corps de fonction. Les consignes les présentent sous forme de carte du dépôt par répertoire, avec les noms de symboles et une ligne d’imports. Les analyses de code utilisent `--max-sources 40` par défaut.
- **config** et manifestes de build : les clés, avec les valeurs uniquement pour les clés autorisées (`scripts`, noms de dépendances, `TargetFramework`, `engines`, `name`) et les informations sur la pile technique.

Chaque résumé est expurgé. Les fichiers `.env*` et les fichiers d’identifiants sont toujours ignorés comme `secret file`, les fichiers découverts de plus de 256 Ko ou d’apparence binaire sont ignorés avec une raison, et les analyses de code et de configuration ignorent les répertoires de sortie de build (`bin`, `obj`, `build`, `out`, `target`, `venv` et similaires) à toute profondeur. `--budget-tokens` (6000 par défaut pour les analyses de code et de configuration ; les analyses de documents n’en ont aucun sauf demande), `--max-sources` et `--max-chars` bornent le lot. `--plan --json` affiche le plan, fichiers ignorés et raisons compris, au format JSON ; son `budgetTokens` vaut `null` pour l’analyse de documents par défaut.

### Candidats orientés objectif {#objective-aware-candidates}

`--objective "<text>"` nomme l’objectif courant. Les consignes demandent alors deux types de candidats : des candidats `OBJECTIVE: task` utiles pour l’objectif, et des candidats `OBJECTIVE: durable` qui méritent d’être conservés ensuite. La grammaire des candidats accepte aussi `SCOPE: workspace|global`, `APPLIES_TO: <globs>` (jusqu’à 8 globs relatifs) et `DIRECTIVE: <line>` (jusqu’à 160 caractères) ; voir [save-session](save-session.md#candidate-fields). Les candidats `OBJECTIVE: task` approuvés vont dans le [niveau de travail](save-session.md#working-memory-promote-and-prune).

### Fraîcheur {#freshness}

Les mémoires de code, de configuration et de manifeste enregistrent le hachage de leur résumé (`source_hash_mode: digest`) : les modifications d’espaces uniquement ou du corps seul ne les rendent donc pas obsolètes ; les mémoires de documents enregistrent le hachage du fichier brut. `engram verify --sources` consigne les sources modifiées ou manquantes dans `stale.json`, ignoré par Git, et `engram take-control --refresh` ne re-résume que ces sources et propose un candidat `UPDATE: <id>` par mémoire obsolète via la porte d’approbation habituelle. Voir [verify](verify-repair-quality.md#verify).

### Mémoires d’hôte {#host-memories}

`--from claude-auto-memory|codex-memories` importe pour relecture un magasin de mémoire local à l’hôte, au lieu d’analyser l’espace de travail. La mémoire automatique de Claude est lue dans `~/.claude/projects/<project>/memory/` (ou dans `autoMemoryDirectory` des paramètres Claude utilisateur ou locaux ; `CLAUDE_CONFIG_DIR` remplace `~/.claude`), les mémoires de Codex dans `~/.codex/memories/` ; `--dir <path>` remplace le magasin lorsqu’il ne peut pas être trouvé sans ambiguïté. `type: feedback` propose une règle, `project` et `reference` proposent des connaissances, et `type: user`, les fichiers sans type et l’index `MEMORY.md` sont ignorés. `--from` ne peut pas être combiné avec `--file`, `--include`, `--exclude`, `--kind`, `--all`, `--budget-tokens` ni `--refresh`.

Engram n’écrit jamais dans un magasin d’hôte. Les imports sont expurgés et filtrés contre les injections, passent par la porte d’approbation habituelle et enregistrent `source: host-memory` avec des `source_files` relatifs au préréglage (par exemple `claude-auto-memory/feedback_testing.md`, jamais un chemin du répertoire personnel). `engram verify --sources` ne vérifie la dérive que sur la machine qui détient le magasin (ailleurs, il signale `host memory store not on this machine`). Il n’existe pas de préréglage Gemini.

## metacognize

```bash
engram metacognize --workspace
engram metacognize --global --dry-run
engram metacognize --all --force
```

Utilisez `metacognize` lorsque vous voulez qu’un agent IA relise un dossier de mémoire Engram existant et propose une structure plus sûre via le même flux d’approbation que save-session. Les agents doivent utiliser `UPDATE: memory-id` pour la consolidation ou le nettoyage de formulation, et `DEPENDS_ON: memory-id` pour les mémoires en couches.


## Migration des anciennes mémoires vers le schema v3 {#legacy-memory-migration-to-schema-v3}

`engram upgrade --latest` migre aussi les fichiers de mémoire actifs v1/v2 de l’espace de travail et des racines globales configurées vers le schema v3. Engram préserve exactement chaque corps Markdown, écrit `backups/schema-v3/<memory-file>.pre-v3.bak` (un dossier ignoré par Git ; `engram repair --move-backups` déplace les anciennes sauvegardes laissées à côté des mémoires), ne renseigne que des métadonnées déterministes, actualise les hachages d’intégrité et reconstruit l’index, le graphe et les fichiers annexes vectoriels éligibles. Il n’invente jamais `evidence_refs` ; une mémoire sans liens de trace vérifiés est marquée `evidence_status: unverified`. Les mémoires invalides sont signalées et ignorées, les mémoires archivées ne sont pas réécrites, et une seconde exécution est idempotente.

Prévisualiser tous les changements sans rien écrire :

```bash
engram upgrade --latest --plan
```

Exécuter uniquement la migration des mémoires, sans écraser les artefacts d’agent liés :

```bash
engram upgrade --migrate-memories
```

Ignorer la migration des mémoires pendant une mise à niveau vers la dernière version :

```bash
engram upgrade --latest --no-migrate-memories
```

## Étapes suivantes {#next-steps}

- [profiles / workspaces / config](profiles-workspaces-config.md)
- [Vue d’ensemble des intégrations d’agents](../integrations/overview.md)


<!-- configuration-upgrade-inventory -->
## Inventaire des mises à niveau de configuration {#configuration-upgrade-inventory}

Après une mise à jour du paquet, exécutez `engram upgrade --latest --plan` avant `engram upgrade --latest`. L’inventaire partagé analyse les mémoires, instructions, skillsets, configurations, hooks et plugins gérés par Engram, dans l’espace de travail et au niveau global. Les octets rédigés par l’utilisateur sont préservés ; les fichiers mixtes ambigus sont signalés comme conflits. Voir [Mises à niveau de configuration](../operations/configuration-upgrades.md).
