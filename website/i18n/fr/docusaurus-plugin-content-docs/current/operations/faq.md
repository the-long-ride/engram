---
title: FAQ
sidebar_position: 4
description: Questions fréquemment posées sur Engram.
---

# FAQ

## Engram est-il une base de données vectorielle ?

Non. La recherche par défaut d'Engram est une recherche lexicale déterministe. `engram search --semantic` ajoute une similarité locale déterministe, et non une recherche sémantique basée sur des plongements (embeddings). Les vecteurs du graphe sont des vecteurs de mots hachés locaux, pas des plongements sémantiques. Le module local sqlite-vec optionnel sert de couche d'accélération, il n'est pas la source unique de vérité.

## Engram écrit-il la mémoire de manière automatique ?

Non. Les agents proposent des candidats ; les humains les valident. L'interface CLI directe en terminal utilise A/B/C. Le chat de l'agent d'IA utilise `yes`/`audit`/`cancel`. Seules les requêtes explicites d'acceptation globale (`ss -f`) enregistrent chaque candidat, et les agents ne doivent pas ajouter le paramètre `--force` sans demande expresse de l'utilisateur.

## Où réside la mémoire ?

- Mémoire de l'espace de travail : `<project>/.agents/.engram/`
- Mémoire globale : à l'emplacement configuré (vide par défaut avant configuration)

La mémoire de l'espace de travail l'emporte. La mémoire globale sert de repli pour les préférences réutilisables et le contexte d'équipe.

## Quels agents sont pris en charge ?

Codex, Claude, Gemini (ainsi que les interfaces compatibles Gemini d'Antigravity), Cursor, Windsurf/Cascade, OpenCode, Copilot, Cline, les hôtes génériques compatibles avec le fichier AGENTS.md, les hôtes compatibles avec le protocole MCP et les hôtes acceptant les commandes slash. Voir la [Présentation des intégrations d'agents](../integrations/overview.md).

## Le chiffrement est-il implémenté ?

La configuration pour le chiffrement existe, mais le stockage chiffré n'est pas encore implémenté. Documentez clairement les limitations actuelles.

## Puis-je utiliser Engram sans Git ?

Oui. Git est facultatif mais fortement recommandé pour l'historique d'audit, la portabilité et la révision en équipe.

## Comment archiver une mémoire erronée ?

```bash
engram archive --reason "<pourquoi>" <id-ou-fichier>
```

Le fichier quitte le routage actif uniquement après approbation et reste préservé dans le dossier `archive/`. Privilégiez l'archivage à la suppression pour assurer l'auditabilité.

## Comment déplacer la mémoire globale ?

```bash
engram update-global-folder <nouveau-chemin>
engram ugf <nouveau-chemin>
engram move global folder from <ancien-chemin> to <nouveau-chemin>
```

Ajoutez `--move-from-path <ancien-chemin>` si vous souhaitez qu'Engram déplace également l'intégralité de l'ancienne racine globale vers le nouvel emplacement.

## Étapes suivantes

- [Résolution des problèmes](troubleshooting.md)
- [Comparatif et feuille de route](../comparison/overview.md)

