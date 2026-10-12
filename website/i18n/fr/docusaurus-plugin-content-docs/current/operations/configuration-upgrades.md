---
title: Mises à niveau de configuration
sidebar_position: 3
description: Prévisualiser, relire et mettre à niveau en toute sécurité les mémoires gérées par Engram et la configuration des agents connectés.
---

# Mises à niveau de configuration {#configuration-upgrades}

## Résumé localisé de la page Updates

La page Updates utilise une **bannière d’état** avec `Workspace · Global · Conflicts`, un **tableau des artefacts** et un seul **défilement horizontal**. Chaque **case à cocher** distingue ses états et la **notification** toast affiche un succès vert et une erreur rouge ; Diff utilise rouge pour les suppressions et vert pour les ajouts. **Force upgrade** permet de forcer uniquement un **bloc Engram** ou un **fichier généré** dont la propriété est prouvée ; le lot ne force jamais les changements et la vérification de convergence détecte les échecs.

Engram utilise un seul moteur d’inventaire de mise à niveau pour la CLI et l’interface web Entry. Il analyse les portées **workspace** et **global** configurées, classe les artefacts gérés par Engram, construit un plan déterministe et utilise des hachages/empreintes pour empêcher les écritures périmées.

```bash
engram upgrade --latest --plan
engram upgrade --latest --review
engram upgrade --latest
engram upgrade --latest --yes
engram upgrade --help
```

`--plan` est en lecture seule. La sortie lisible est groupée par type d’artefact dans cet ordre : Config, Instructions, Memories, Skillsets, Hooks, Plugins. `--plan --json` expose le même plan groupé, son empreinte, les états de relecture et `pendingReviewCount`. Les onglets de type de l’interface utilisent exactement les libellés `All`, `Config`, `Instructions`, `Memories`, `Skillsets`, `Hooks`, `Plugins`.

## Ce qu’Engram détecte {#what-engram-detects}

L’inventaire couvre les artefacts `memory`, `instruction`, `skillset`, `config`, `hook` et `plugin` situés dans des emplacements Engram connus ou dans des installations d’agents connectés enregistrées. Les racines workspace et globales sont analysées séparément ; Engram ne parcourt pas récursivement des arborescences arbitraires du répertoire personnel.

Engram fait d’abord confiance aux métadonnées explicites de schéma/version et aux métadonnées d’installation enregistrées. Les fichiers hérités sans marqueurs se rabattent sur la structure gérée connue et le contenu attendu. Chaque élément est classé `current`, `outdated`, `conflict` ou `invalid`.

## Remplacement et fusion adaptés au type {#type-aware-replacement-and-merge}

Un conflit signifie **relecture requise**, et non blocage définitif. Engram préserve les modifications de l’utilisateur jusqu’à ce que celui-ci confirme une décision de remplacement/fusion.

- **Instructions :** Engram propose le dernier bloc géré tout en préservant le texte de l’utilisateur en dehors des marqueurs Engram. Un fichier d’instructions entièrement géré par Engram peut être remplacé.
- **Skillsets :** Engram propose le dernier contenu géré par Engram. Les sections explicitement réservées à l’utilisateur sont préservées lorsque le format le permet.
- **Config :** Engram analyse la configuration et propose une migration fusionnée : les clés Engram connues sont mises à niveau, de nouvelles valeurs par défaut sont ajoutées lorsque nécessaire, et les clés/valeurs sans rapport de l’utilisateur sont préservées.
- **Memories :** Engram effectue une migration de schéma plutôt qu’un remplacement de modèle.
- **Hooks/plugins :** les artefacts générés ne sont remplacés que lorsque la propriété est prouvable. Le code utilisateur ambigu reste en relecture seule et peut être confirmé comme **Keep current**.

## Relecture des conflits dans l’interface web Entry {#entry-web-ui-conflict-review}

La page Updates utilise désormais un tableau de bord compact : une **bannière d’état** indique si la configuration est à jour, nécessite une mise à jour ou exige une relecture de conflits ; les cartes récapitulatives **Workspace**, **Global** et **Conflicts** montrent d’un coup d’œil les nombres importants. Après l’aperçu, chaque élément actionnable apparaît dans un seul **tableau des artefacts actionnables** avec les colonnes Artifact, Scope, Agent(s), Status, Review et Actions. Le tableau garde sa structure sur les écrans étroits et utilise un seul conteneur de **défilement horizontal** partagé au lieu de barres de défilement par ligne.

Ouvrez `engram entry`, puis **Settings → Updates**. L’action **copy command** de la barre latérale copie `engram upgrade --latest --plan` sans quitter la page. L’aperçu comporte `All` plus uniquement les onglets de type actionnables : `Config`, `Instructions`, `Memories`, `Skillsets`, `Hooks` et `Plugins`.

Chaque conflit a une action **Review**. La fenêtre modale propose les vues **Current**, **Proposed** et **Diff**. **Current** est en lecture seule. **Proposed** est modifiable pour les éléments Config/Instruction/Skillset remplaçables et part du résultat fusionné/de remplacement adapté au type d’Engram. **Diff** s’ouvre par défaut en mode **Inline** et peut passer en **Parallel**. Inline marque les lignes supprimées par `-` sur fond rouge et les lignes ajoutées par `+` sur fond vert ; Parallel aligne les lignes **Current** et **Proposed** avec le même surlignage rouge/vert. Utilisez **Use latest**, **Reset proposed**, **Keep current** ou — lorsqu’Engram peut prouver la propriété — **Force upgrade**, puis **Confirm change**.

**Open in editor** ouvre l’artefact courant exact résolu par le serveur, en utilisant `$VISUAL`, puis `$EDITOR`, puis le repli de la plateforme. Le navigateur ne fournit jamais de chemin du système de fichiers. Pour **Instructions**, **Proposed** ne contient que le bloc géré `<!-- engram:start -->` ; le skillset global complet reste dans le guide compagnon `.agents/engram.md`. Si la modification externe change le fichier, le hachage d’aperçu/de source devient périmé et la relecture doit être actualisée avant confirmation.

Les conflits remplaçables en attente et éligibles ont des cases de sélection. **Select all visible** sélectionne les lignes éligibles de l’onglet de type actif ; la sélection persiste lors du changement d’onglet. **Confirm selected changes** accepte **Use latest** pour les lignes cochées, tandis que **Confirm all changes** accepte **Use latest** pour tous les conflits en attente éligibles de l’aperçu complet. Les lignes non remplaçables, périmées et déjà relues ne peuvent pas être sélectionnées. Le serveur valide le lot complet par rapport à l’empreinte de l’aperçu, aux hachages de source courants, aux états de relecture et aux propositions générées avant une écriture atomique dans le magasin de relecture. Si un élément sélectionné échoue à la validation, aucune décision du lot n’est enregistrée.

Entry utilise le même traitement de case à cocher personnalisée dans toute la relecture des mises à niveau : les états coché, focus clavier et désactivé sont visiblement distincts. Le retour par notification toast utilise une bordure/lueur verte pour un succès et rouge pour une erreur.

La page affiche la progression de la relecture. L’action finale Upgrade reste désactivée tant que chaque conflit n’est pas explicitement résolu comme dernière version acceptée, proposition modifiée, **Force upgrade** ou **Keep current**. Une confirmation finale résume les mises à jour automatiques, les propositions acceptées, les propositions modifiées, les remplacements forcés, les fichiers conservés tels quels et les sauvegardes.

## Mise à niveau forcée tenant compte de la propriété {#ownership-aware-force-upgrade}

Engram canonicalise l’inventaire de mise à niveau des agents connectés par **fichier physique** ; un guide partagé comme `.agents/engram.md` est donc représenté une seule fois, même lorsque Codex, Claude, Gemini ou un autre hôte enregistré pointe vers lui. La liste des hôtes reste visible comme métadonnée, mais un fichier physique reçoit une seule sortie de rendu canonique et une seule transaction d’écriture.

**Force upgrade** est volontairement plus restreint que **Use latest**. Il n’apparaît que lorsqu’Engram peut prouver une frontière de propriété :

- **Région gérée :** Engram ne remplace que le bloc Engram balisé et préserve tous les octets rédigés par l’utilisateur en dehors, y compris le style de saut de ligne CRLF/LF du fichier.
- **Fichier généré :** Engram peut remplacer tout le fichier Engram enregistré/généré, y compris les modifications manuelles faites dans ce fichier appartenant à Engram.
- **Propriété inconnue :** aucune action Force upgrade n’est proposée ; utilisez **Keep current** ou levez d’abord l’ambiguïté de propriété.

Les contrôles en lot ne forcent jamais. **Confirm selected changes** et **Confirm all changes** restent limités aux décisions sûres **Use latest**. Les décisions de forçage sont relues élément par élément et sont rejetées si le hachage de source, la preuve de propriété ou le mode de forçage a changé après l’aperçu.

Une fois les écritures terminées, Engram réexamine les artefacts physiques mis à niveau. Les éléments censés être mis à jour doivent converger vers `current` ; une transaction échouée ou annulée, ou un élément qui reste `outdated`/`conflict`, fait que l’application entière signale une erreur au lieu d’afficher un toast de succès. Les éléments explicitement **Keep current** sont exclus de cette exigence de convergence.

## Relecture des conflits en CLI {#cli-conflict-review}

Exécutez :

```bash
engram upgrade --latest --review
```

Le relecteur interactif traite les conflits non résolus un par un :

```text
[V] View diff
[E] Edit proposed content
[L] Accept latest proposal
[K] Keep current
[Q] Save and quit
```

`E` ouvre un fichier proposé temporaire en utilisant `$VISUAL`, puis `$EDITOR`, puis un repli de la plateforme. Engram valide la proposition modifiée avant de l’accepter. Les décisions sont conservées dans l’état d’Engram selon l’empreinte du plan ; `Q` peut donc interrompre la session et un `--review` ultérieur reprend les décisions enregistrées.

Pour l’automatisation :

```bash
engram upgrade --latest --yes
```

`--yes` n’invente jamais de décisions de conflit. Si un conflit reste en attente ou périmé, Engram se termine avec un code non nul et vous demande d’exécuter `engram upgrade --latest --review`.

## Protection contre les relectures périmées {#stale-review-protection}

Chaque élément relu enregistre son hachage de source (source hash). Avant l’application, Engram compare le hachage de source courant au hachage de source relu. Si le fichier a changé après la relecture, cette décision devient périmée/en attente et doit être relue. Une empreinte du plan empêche aussi d’appliquer un inventaire différent de celui qui a été relu.

## Groupes de transactions, sauvegarde et retour arrière {#transaction-groups-backup-and-rollback}

Les remplacements et fusions acceptés utilisent le même chemin transactionnel que les mises à niveau automatiques sûres. Engram capture les octets et permissions d’origine, crée des sauvegardes lorsque nécessaire, valide le contenu proposé, écrit via un fichier temporaire et le renomme atomiquement à sa place. Une transformation durable échouée annule son groupe de transactions. **Keep current** n’effectue aucune écriture.

## L’index vectoriel échoue en mode ouvert {#vector-index-is-fail-open}

La recherche vectorielle est une couche d’accélération facultative. Engram lie les clés primaires de `memory_vectors` de `sqlite-vec` avec des valeurs `BigInt` compatibles avec les entiers. Si la reconstruction vectorielle échoue, Engram supprime le fichier annexe vectoriel/WAL/SHM incomplet, signale un avertissement de mode dégradé (degraded) et poursuit la mise à niveau durable lexicale/graphe. Un échec purement vectoriel ne peut pas faire avorter une mise à niveau de configuration par ailleurs valide.

## Version du paquet et état de la configuration {#package-version-vs-configuration-state}

Un nouveau paquet npm et une configuration locale obsolète sont des signaux distincts. Flux de version recommandé :

```bash
npm install -g @the-long-ride/engram@latest
engram upgrade --latest --plan
engram upgrade --latest --review
engram upgrade --latest
```

Relancer la mise à niveau est idempotent pour les artefacts à jour. Les fichiers `Keep current` relus restent intacts, sauf si leur état change et exige une nouvelle relecture.
