---
title: Processus de version et de mise à niveau
sidebar_position: 2
description: Mettre à niveau les paquets Engram et réconcilier les racines de mémoire en toute sécurité.
---

# Processus de version et de mise à niveau {#release-and-upgrade-process}

## Résumé localisé de la sécurité des mises à niveau

Diff affiche les suppressions en rouge et les ajouts en vert. **Force upgrade** permet de forcer uniquement un **bloc Engram** ou un **fichier généré** dont la propriété est prouvée ; le lot ne force jamais les changements et la vérification de convergence évite les faux succès.

## Après une mise à jour du paquet npm {#after-an-npm-package-update}

La prochaine commande Engram normale réconcilie silencieusement, une fois pour la nouvelle version, les racines workspace/globales déjà initialisées. Cela couvre les changements de schéma de mémoire d’une version à l’autre depuis la v0.0.8, en actualisant l’aide générée, les index de mémoire, les fichiers de graphe et les fichiers annexes vectoriels éligibles lorsque des métadonnées plus anciennes sont détectées.

La vérification au démarrage est volontairement peu coûteuse après la première exécution : elle ne lit que de petits marqueurs de configuration lorsque la version courante est déjà enregistrée. Elle ne s’exécute pas depuis le postinstall de npm, ne crée pas de nouvelles racines de mémoire et ne remplace pas les fichiers rédigés par un humain. Utilisez `--no-auto-upgrade` ou `ENGRAM_NO_AUTO_UPGRADE=1` pour l’ignorer pour une commande.

## Mise à niveau explicite {#explicit-upgrade}

```bash
engram upgrade
engram upgrade --plan
engram upgrade --latest
```

`engram upgrade` actualise l’aide générée du workspace, les index de mémoire, les fichiers de graphe, les fichiers annexes vectoriels éligibles, les fichiers de skillset de workspace déjà générés par Engram et les skillsets globaux enregistrés, tout en préservant les fichiers rédigés par un humain.

`engram upgrade --latest` est plus fort : il écrase les artefacts d’agent liés et gérés par Engram pour les agents de workspace déjà liés et les installations globales enregistrées, y compris les fichiers d’instructions, les règles, la configuration MCP/plugin et les hooks gérés, de sorte que les hôtes liés récupèrent immédiatement la sortie du nouveau paquet.

N’utilisez `--force` que pour remplacer délibérément des fichiers d’adaptateur Engram générés.

## Réconciliation de configuration tenant compte de la propriété {#ownership-aware-configuration-reconciliation}

L’inventaire de mise à niveau vers la dernière version déduplique les intégrations enregistrées par fichier physique. Si plusieurs hôtes partagent le même guide Engram, Engram rend et écrit ce fichier une seule fois au lieu de laisser des lignes spécifiques à chaque hôte se réécrire mutuellement.

Lorsque des modifications manuelles rendent un artefact Engram connu impropre au remplacement normal, Entry peut proposer **Force upgrade** uniquement lorsque la propriété est prouvable. Pour un bloc Engram balisé, le forçage ne remplace que ce bloc et préserve le texte utilisateur environnant. Pour un fichier Engram enregistré/généré, le forçage peut remplacer tout le fichier généré. Une propriété inconnue n’est jamais forcable, et la confirmation par lot n’effectue jamais d’actions de forçage.

Une application réussie est vérifiée par un nouvel examen après écriture. Les transactions annulées ou échouées et les artefacts censés être mis à jour mais qui ne convergent pas vers `current` sont signalés comme erreurs ; Entry n’affiche pas de toast de succès de mise à niveau dans ces cas.

## Profils de rendu des skillsets {#skillset-render-profiles}

Pour les hôtes capables d’exécution, Engram installe de petites instructions d’amorçage au lieu du protocole complet. Les hooks fournissent le contexte de tâche routé, les outils MCP assurent le comportement de chargement/recherche/proposition, et un guide compagnon porte le flux détaillé, les adaptateurs slash et les Agent Skills n’en étant que de courts pointeurs. Les cibles de repli sans injection fiable de contexte à l’exécution reçoivent toujours des instructions manuelles compactes.

## Repli de la base de configuration SQLite {#sqlite-config-db-fallback}

La base de configuration SQLite d’Engram est une optimisation pour la gestion des workspaces/profils. Si la base ne peut pas être ouverte ou initialisée, les commandes normales de lecture/écriture se rabattent sur des instantanés de configuration JSON. Les commandes propres à la base signalent SQLite comme indisponible au lieu de bloquer l’usage normal de la mémoire.


## Ce qui change dans la version native pour hôtes {#what-changes-in-the-host-native-release}

Après `engram upgrade --latest` (ou `engram link <host>`) sur une installation existante :

- **Hooks** : Claude et Codex gagnent `SubagentStart`, Gemini gagne `AfterTool`, et les nouvelles entrées de hook respectent le plafond de charge utile de chaque hôte. Claude abandonne l’entrée gérée `PreToolUse` et gagne `InstructionsLoaded` ainsi que des fichiers de règles `.claude/rules/engram/` générés ; exécutez d’abord `engram config set hooks.path_rules hook && engram link claude` pour conserver l’ancien comportement. Un simple `engram upgrade` n’actualise pas les configurations de hooks.
- **Instructions** : `link claude` écrit le bloc géré dans `AGENTS.md` et ne crée plus `CLAUDE.md` ; un bloc `CLAUDE.md` existant est conservé. Les fichiers `SKILL.md` générés suivent désormais la spécification Agent Skills.
- **MCP** : le serveur parle MCP 2026-07-28 et la poignée de main héritée, et `engram_commit` exige une confirmation à chaque appel dans Claude Code et Codex (`engram upgrade` réécrit le bloc Codex géré).
- **Fichiers de mémoire** : les nouvelles mémoires omettent `author_email` (exécutez `engram author migrate-memories --strip-email --confirm` pour nettoyer les anciennes), les règles ne stockent que leur Content, et les sauvegardes de migration se trouvent dans le dossier `backups/`, ignoré par Git (`engram repair --move-backups` déplace les plus anciennes).
- **Configuration** : `vector.enabled` vaut `false` par défaut pour les nouvelles configurations ; une configuration qui stocke déjà `true` reste activée. `cursorrules` est un alias obsolète du format d’export `cursor-rules` pendant une version.

Consultez la section Unreleased du [journal des modifications](changelog.md) pour la liste complète et pour ce qui n’est pas encore fait.

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
- [CLI : inject / link / upgrade](../cli/inject-link-upgrade.md)


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

Lisez le [guide complet des paramètres de l’auteur Git](git-author-settings.md).


<!-- configuration-upgrade-inventory -->

La relecture des conflits utilise le même plan partagé dans la CLI et dans Entry. Exécutez `engram upgrade --latest --review` pour accepter la dernière proposition adaptée au type, la modifier via `$VISUAL`/`$EDITOR`, ou confirmer **Keep current**. Entry propose les vues **Current**, **Proposed** et **Diff** ; **Diff** s’ouvre par défaut en mode **Inline** et peut passer en **Parallel**, le contenu supprimé étant surligné en rouge et le contenu ajouté en vert. L’application finale est bloquée tant que `pendingReviewCount` est non nul, et `engram upgrade --latest --yes` refuse les décisions non résolues ou périmées. Chaque décision est vérifiée par rapport à son hachage de source avant l’écriture.

## Inventaire des mises à niveau de configuration {#configuration-upgrade-inventory}

Après une mise à jour du paquet, exécutez `engram upgrade --latest --plan` avant `engram upgrade --latest`. L’inventaire partagé analyse les mémoires, instructions, skillsets, configurations, hooks et plugins gérés par Engram, dans l’espace de travail et au niveau global. Les octets rédigés par l’utilisateur sont préservés ; les fichiers mixtes ambigus sont signalés comme conflits exigeant une relecture explicite avant application. Voir [Mises à niveau de configuration](configuration-upgrades.md).
