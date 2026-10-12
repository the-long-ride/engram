---
title: FAQ
sidebar_position: 4
description: Questions fréquentes sur Engram.
---

# FAQ

## Engram est-il une base de données vectorielle ? {#is-engram-a-vector-database}

Non. La recherche par défaut d’Engram est une recherche lexicale déterministe. `engram search --semantic` ajoute une similarité locale déterministe, et non une recherche sémantique fondée sur des embeddings. Les vecteurs du graphe sont des vecteurs de mots hachés locaux, pas des embeddings sémantiques. sqlite-vec local, facultatif, est une couche d’accélération expérimentale (désactivée par défaut ; à activer avec `vector.enabled: true`), pas la source de vérité.

## Engram écrit-il la mémoire automatiquement ? {#does-engram-write-memory-automatically}

Non. Les agents proposent des candidats ; les humains approuvent. La CLI directe dans un terminal utilise A/B/C. Le chat d’un agent IA utilise `yes`/`audit`/`cancel`. Seules les demandes de forçage explicites (`ss -f`) enregistrent chaque candidat, et les agents ne doivent pas ajouter `--force` sauf si l’humain l’a demandé.

## Où vit la mémoire ? {#where-does-memory-live}

- Mémoire du workspace : `<project>/.agents/.engram/`
- Mémoire globale : là où vous la configurez (vide par défaut tant qu’elle n’est pas configurée)

La mémoire du workspace l’emporte. La mémoire globale sert de repli pour les préférences réutilisables et le contexte d’équipe.

## Quels agents sont pris en charge ? {#which-agents-are-supported}

Codex, Claude, Gemini (et les surfaces Antigravity compatibles Gemini), Cursor, Windsurf/Cascade, OpenCode, Copilot, Cline, les hôtes génériques compatibles AGENTS.md, les hôtes compatibles MCP et les hôtes à commandes slash. Voir [Vue d’ensemble des intégrations d’agents](../integrations/overview.md).

## Le chiffrement est-il implémenté ? {#is-encryption-implemented}

La configuration du chiffrement existe, mais le stockage chiffré n’est pas encore implémenté. Documentez clairement les limites actuelles.

## Puis-je utiliser Engram sans Git ? {#can-i-use-engram-without-git}

Oui. Git est facultatif mais recommandé pour l’historique d’audit, la portabilité et la relecture en équipe.

## Comment archiver une mémoire erronée ? {#how-do-i-archive-wrong-memory}

```bash
engram archive --reason "<why>" <id-or-file>
```

Le fichier ne quitte le routage actif qu’après approbation et reste conservé sous `archive/`. Utilisez archive, et non la suppression, pour la traçabilité.

## Comment déplacer la mémoire globale ? {#how-do-i-move-global-memory}

```bash
engram update-global-folder <new-path>
engram ugf <new-path>
engram move global folder from <old-path> to <new-path>
```

Ajoutez `--move-from-path <old-path>` lorsqu’ils veulent aussi qu’Engram déplace toute l’ancienne racine globale vers le nouvel emplacement.


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

- [Dépannage](troubleshooting.md)
- [Comparaison et feuille de route](../comparison/overview.md)


<!-- configuration-upgrade-inventory -->
## Inventaire des mises à niveau de configuration {#configuration-upgrade-inventory}

Après une mise à jour du paquet, exécutez `engram upgrade --latest --plan` avant `engram upgrade --latest`. L’inventaire partagé analyse les mémoires, instructions, skillsets, configurations, hooks et plugins gérés par Engram, dans l’espace de travail et au niveau global. Les octets rédigés par l’utilisateur sont préservés ; les fichiers mixtes ambigus sont signalés comme conflits. Voir [Mises à niveau de configuration](configuration-upgrades.md).
