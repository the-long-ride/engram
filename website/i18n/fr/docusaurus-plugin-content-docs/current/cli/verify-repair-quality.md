---
title: verify / repair / quality-check
sidebar_position: 6
description: Commandes de maintenance — vérifier les hachages, réparer les fichiers invalides, contrôler la qualité et résoudre les conflits.
---

# verify / repair / quality-check

Les commandes de maintenance gardent la mémoire en bonne santé.

## status

```bash
engram status
engram stat
engram status --json
```

Affiche sur un seul écran une vue d’ensemble des racines de mémoire workspace et globale, du profil actif, des hôtes liés, des reçus en attente de relecture, des compteurs du niveau de travail et de l’état d’intégrité/fraîcheur. `engram stat` est un alias court et `--json` produit l’instantané structuré pour les scripts.

## verify

```bash
engram verify
engram verify --sources
engram verify --sources --json
```

Vérifie l’intégrité par les hachages. À exécuter après des modifications manuelles ou des imports.

`--sources` re-hache aussi les `source_files` des mémoires take-control et les compare à leurs `source_hashes`, puis consigne celles qui ont changé ou manquent dans `.agents/.engram/stale.json`, un fichier local ignoré par Git. Des sources obsolètes ne font jamais échouer `verify` : `load` classe plus bas les mémoires obsolètes et termine leurs cartes par ` (stale)`, et `engram take-control --refresh` propose des mises à jour pour elles. Les chemins de source doivent rester dans l’espace de travail ; les chemins absolus, `..`, les liens symboliques et physiques, les fichiers secrets, `.git` et les données Engram sont signalés comme non vérifiés et jamais lus. Dans `--json`, `skipped` liste des objets `{key, reason}`. Une mémoire take-control globale enregistre l’espace de travail dont elle provient et n’est vérifiée que là.

## stats

```bash
engram stats
engram stats --usage
engram stats --backfill [--git <range>] [--limit <n>]
```

`--usage` lit le fichier local `.agents/.engram/usage.json`, ignoré par Git, et affiche les compteurs de récupération (`engram load --id`), les compteurs de résultats en boucle fermée (`applied`, `corrected` et `noisy` / injections sans utilité) et les mémoires injectées mais jamais récupérées en 30 jours. `--backfill` reconstitue la télémétrie historique d’usage dans `usage.json` à partir de l’historique des commits Git (commits récents sans fusion via `backfillUsageFromGit`, avec `[--git <range>] [--limit <n>]` facultatifs).

## repair

```bash
engram repair
engram rebuild-index
```

Utilisez `repair` après des modifications manuelles ou des imports pour trouver les fichiers de mémoire malformés ignorés par la reconstruction de l’index.

```bash
engram repair --move-backups
engram repair workspace --move-backups --confirm
```

`--move-backups` planifie le déplacement des sauvegardes de migration `*.bak` égarées dans `rules`, `skills` et `knowledge` vers le dossier `backups/<kind>-<label>/`, ignoré par Git (par exemple `backups/schema-v3/rules/x.md.pre-v3.bak`). Ajoutez `--confirm` pour les déplacer ; un fichier différent déjà présent à la destination est signalé comme conflit et laissé en place. `engram doctor` signale ces fichiers sous `memory.stray_backups`.

## quality-check

```bash
engram quality-check
```

Signale de façon compacte les candidats à une contradiction. La détection des contradictions est heuristique et consultative.

## graph

```bash
engram graph "package manager"
engram graph --rebuild
engram graph link <parent-id> <child-id...>
```

Inspectez le routage par graphe avant d’archiver, liez des prérequis `depends_on` explicites avec `engram graph link <parent-id> <child-id...>`, ou exécutez `engram graph --rebuild` après des modifications manuelles.

## archive

```bash
engram archive --reason "Repo migrated to npm." rules/use-pnpm.md
```

Archivez les mémoires erronées ou remplacées. Utilisez archive, et non la suppression, pour la traçabilité. Le fichier ne quitte le routage actif qu’après approbation et reste conservé sous `archive/`.

## resolve-conflicts

```bash
engram resolve-conflicts --dry-run --metacognize
engram resolve-conflicts --metacognize
```

Prévisualise ou résout uniquement les conflits de mémoire de l’espace de travail appartenant à Engram. Ajoutez `--metacognize` lorsqu’un agent doit relire le dossier de mémoire après le traitement des conflits. La commande limite le traitement déterministe des conflits à `.agents/.engram/`, puis ajoute le lot de sources metacognize de l’espace de travail pour obtenir des candidats `TYPE/TEXT` concis.

## benchmark

```bash
engram benchmark <cases.json> --json
engram benchmark <cases.json> --baseline <baseline.json> --fail-on forbidden,recall
engram benchmark <cases.json> --write-report <report.json>
engram benchmark --from-git [--out <path>]
```

Exécute des suites versionnées de régression de récupération, dont `freshness-ordering` (bonus de fraîcheur et ordre des corps sensible à l’attention), `multi-turn-session` (économies de tokens des hooks sur plusieurs tours) et `telemetry-loop` (télémétrie des résultats en boucle fermée `real-stacks-v1` et décroissance du bruit). Utilisez `--from-git [--out <path>]` pour synthétiser des cas de benchmark locaux au dépôt depuis l’historique Git récent, `--baseline` pour comparer aux métriques enregistrées, `--write-report` pour écrire un rapport JSON contenant uniquement les identifiants, et `--fail-on` pour faire échouer la CI sur des régressions précises.

## Étapes suivantes {#next-steps}

- [sync / archive](sync-archive.md)
- [Dépannage des opérations](../operations/troubleshooting.md)
