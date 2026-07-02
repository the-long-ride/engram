# Guide des Opérations

## Approbation en Chat IA

Dans le chat avec un agent IA, l'approbation Engram est conversationnelle. L'agent montre d'abord des candidats affines `TYPE: ... | TEXT: ...`, y compris les variantes Light/Balanced/Strict pour les regles. Repondez `yes` pour enregistrer exactement ces candidats, `audit` pour les reviser, ou `cancel` pour arreter. Apres `yes`, l'agent utilise `engram save-session --accept-all` avec les candidats approuves. Les enregistrements directs en CLI continuent d'utiliser A/B/C sauf si une commande accept-all a ete invoquee explicitement.


Cette page contient l'utilisation détaillée afin que le README puisse rester court.

## Surface des Commandes

| Besoin | Commande |
| --- | --- |
| Charger la mémoire de tâche | `engram load "<tâche>"` |
| Charger la mémoire compacte pour l'agent | `engram load --for-agents "<tâche>"` |
| Imprimer le guide de l'agent IA | `engram llm` |
| Aperçu des fichiers routés | `engram load --dry-run "<tâche>"` |
| Rechercher dans la mémoire | `engram search "<sujet>"` |
| Sauvegarder une mémoire | `engram save [rule\|workflow\|knowledge] "<texte>"` |
| Sauvegarder les mémoires de session | `engram save-session` ou `engram ss` |
| Extraire les sessions récentes accessibles | `engram save-session --query-level 3` |
| Accepter tous les candidats | `engram ss -a` |
| Extraire et accepter les sessions récentes | `engram ss -a last 50 sessions` |
| Capturer une note brute | `engram observe --file session.md` |
| Convertir les documents existants | `engram take-control --all` |
| Aperçu de l'importation | `engram take-control --plan` |
| Importer et intégrer la documentation | `engram take-control --all --metacognize --accept-all` |
| Restructurer le dossier de mémoire | `engram metacognize --workspace\|--global\|--all` |
| Résoudre les conflits et intégrer | `engram resolve-conflicts --metacognize` |
| Inspecter le routage du graphe | `engram graph "<sujet>"` |
| Vérifier les hashes | `engram verify` |
| Trouver des fichiers mal formés | `engram repair` |
| Archiver une mémoire incorrecte | `engram archive --reason "<pourquoi>" <id-ou-fichier>` |
| Ajuster la force des règles | `engram set-rule-variant strict\|balanced\|light\|off` |
| Configurer la cible de sauvegarde | `engram set-save-target workspace\|global\|both\|status` |
| Configurer la limite de charge | `engram set-load-limit 1..32\|status\|reset` |
| Configurer les lectures automatiques | `engram set-read startup\|auto\|always\|manual\|off\|status` |
| Configurer la preuve des hooks | `engram set-proof off\|compact\|status` |
| Installer les hooks de l'agent | `engram link codex\|claude\|gemini\|opencode\|cursor\|windsurf` |
| Gérer les profils globaux | `engram profile status\|create\|use\|merge` |
| Cloner la mémoire workspace/global | `engram clone-memory workspace global [--metacognize]` |

Utilisez `save-session` pour les propositions de mémoire lors de sessions longues. Forme courte : `ss`.
Utilisez `--query-level <n>` lorsque l'humain souhaite que l'agent extraie jusqu'à n sessions récentes accessibles entre l'humain et l'agent, au lieu de seulement la session en cours. Une formulation naturelle comme `engram ss -a last 50 sessions` se normalise en `engram save-session --query-level 50 --accept-all`.

Utilisez `load --dry-run` lorsque vous souhaitez inspecter quels fichiers de mémoire seraient routés sans afficher leur contenu.
Utilisez `load --for-agents` pour le contexte d'agent IA : il ne garde que `id`, `type`, `tags` et `confidence` dans le frontmatter, rend une variante de règle sélectionnée et l'étiquette comme `## Rule variants (1/3 based on current: <active>)`.
`load` conserve par défaut la même route compacte pour les hôtes orientés agents. La méthode MCP `engram_load` utilise `--for-agents` par défaut, donc les hôtes d'agents reçoivent la forme compacte sans répéter l'option. Les hooks SessionStart appellent cette route routée au démarrage, puis réutilisent ou sautent les routes lorsque la signature routée n'a pas changé.
`load` commence par ancrer le routage sur des termes de requête significatifs, en ignorant les mots de mémoire génériques comme `rule`, `knowledge` et les stopwords courants. Il affine ensuite le pool de candidats plus large en un pack de contexte compact. Le chargement normal signale les nombres sélectionnés et totaux associés, comme `loaded 8 memory files / 14 total related memories`. `load --dry-run` affiche les nombres de candidats, les tags d'affinement et les raisons de correspondance ; `load --all` renvoie chaque correspondance routée visible au lieu d'appliquer la limite compacte.
`workflow` et `workflows` s'orientent toujours vers des mémoires de compétences, mais les mots de type générique ne créent pas de correspondance large par eux-mêmes.

## Couches de Dépendances (Dependency Layers)

Utilisez le frontmatter `depends_on` lorsqu'une mémoire doit s'appuyer sur une autre au lieu de la répéter :

```yaml
depends_on: [release-foundation]
level: advanced
```

Exécutez `engram graph --rebuild` après des modifications manuelles. Le graphe signale les couches de dépendances, et `engram load` extrait les prérequis routés dans le même pack de contexte compact avant les mémoires plus profondes. Les arêtes associées au graphe et les hits vectoriels ne peuvent pas charger de mémoires non liées par eux-mêmes ; ils aident seulement à reclasser ou à étendre les mémoires qui correspondent déjà à des termes de requête significatifs. Les prérequis explicites `depends_on` peuvent toujours être chargés sans leur propre correspondance de mots-clés.

## Réconciliation des Mises à Jour (Upgrade Reconciliation)

Utilisez `engram upgrade` après avoir installé un pack Engram plus récent. La commande compare les racines de mémoire initialisées depuis la version v0.0.8 et ultérieures avec le schéma de la version actuelle et met à jour les fichiers HELP.md générés, les index de mémoire, les fichiers de graphe, les sidecars vectoriels éligibles, les ensembles de compétences du workspace générés, la structure de la mémoire globale et les ensembles de compétences des agents globaux enregistrés tout en préservant les fichiers créés par l'humain. Les commandes normales exécutent également la même réconciliation de manière silencieuse une fois par version de package, à moins que `--no-auto-upgrade` ou `ENGRAM_NO_AUTO_UPGRADE=1` ne soit défini.
Lorsque `engram save` trouve des mémoires actives associées, l'aperçu de validation signale celles-ci avec un `depends_on` suggéré ou un avertissement de doublon potentiel. Accepter enregistre l'aperçu tel quel ; rejetez d'abord si vous souhaitez restructurer les dépendances ou archiver les doublons avant d'enregistrer.
Pour `save-session --accept-all`, Engram s'arrête avant d'écrire lorsque ces suggestions de mémoire associée apparaissent. L'agent doit utiliser la réponse pour proposer une nouvelle exécution structurée : ajouter `DEPENDS_ON: memory-id` pour les dépendances, `LEVEL: advanced` lorsqu'une mémoire est plus profonde que son prérequis, ou `UPDATE: memory-id` lorsqu'un candidat doit fusionner dans un doublon potentiel.

## Profils, Cibles de Sauvegarde et Clonage

Utilisez `set-save-target` pour choisir où vont les sauvegardes normales :

```bash
engram set-save-target status
engram set-save-target workspace
engram set-save-target global
engram set-save-target both
```

Utilisez `profile` lorsque la mémoire globale personnelle, de l'entreprise ou de l'équipe doit rester isolée :

```bash
engram profile create personal --global-path ~/Documents/engram-personal --use
engram profile use company --workspace
engram profile merge personal company --dry-run
```

Utilisez `clone-memory` pour copier le Markdown actif de `rules/`, `skills/` et `knowledge/` entre les étendues de workspace et global :

```bash
engram clone-memory workspace global
engram clone-memory global workspace --force
```

Ajoutez `--metacognize` lorsque vous souhaitez que les mémoires clonées soient proposées via le flux d'approbation save-session au lieu d'être copiées textuellement.

## Restructurer la Mémoire (Metacognize Memory)

Utilisez `metacognize` lorsque vous souhaitez qu'un agent IA examine un dossier de mémoire Engram existant et propose une structure plus sûre via le même flux d'approbation de save-session :

```bash
engram metacognize --workspace
engram metacognize --global --dry-run
engram metacognize --all --accept-all
```

La commande vérifie les mémoires actives `rules/`, `skills/` et `knowledge/` dans l'étendue sélectionnée, renvoie un pack d'origine compact lorsque aucun candidat n'est fourni, puis écrit uniquement les lignes `TYPE: ... | TEXT: ...` générées après approbation. Les agents doivent utiliser `UPDATE: memory-id` pour la consolidation ou le nettoyage de la formulation et `DEPENDS_ON: memory-id` pour les mémoires en couches. Une formulation naturelle comme `engram restructure workspace memory accept all` se normalise en `engram metacognize --workspace --accept-all`.

## Sauvegarder la Session (Save Session)

Utilisez `save-session` lorsqu'une interaction longue a produit de multiples candidats :

```text
TYPE: rule | TEXT: Always run tests before release. | CONTEXT: Created from release planning so future agents preserve the test gate.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

`CONTEXT: ...` est facultatif. Ajoutez-le uniquement lorsqu'il explique pourquoi la mémoire existe, la situation d'origine, l'utilisation prévue ou la limite. Les mémoires de faits simples peuvent l'ignorer et utiliser le contexte d'approbation par défaut d'Engram.

Sans `--accept-all`, Engram demande quels candidats enregistrer. Avec `ss -a`, chaque candidat généré est enregistré car l'humain a approuvé explicitement ce raccourci.
Lorsqu'une exécution de accept-all signale des mémoires associées avant d'écrire, aucun fichier n'a été enregistré. L'agent doit réexécuter avec des candidats structurés comme :

```text
TYPE: rule | TEXT: OAuth rotation follows release foundations. | DEPENDS_ON: release-foundation | LEVEL: advanced
TYPE: knowledge | TEXT: Invoice retries use exponential backoff. | UPDATE: invoice-retry-baseline
```

`--query-level` doit être un entier positif. Les agents doivent inclure uniquement les discussions auxquelles ils peuvent réellement accéder et ne doivent pas inventer d'historique non disponible. `engram ss -a last 50 sessions` utilise `50` comme niveau de requête et `-a` comme approbation explicite de l'utilisateur.

## Prendre le Contrôle (Take Control)

`take-control` aide à adopter Engram dans des dépôts existants. Il scanne le guide de l'agent, les notes, documents et fichiers sélectionnés, puis demande à l'agent des candidats concis.

Sélecteurs utiles :

```bash
engram take-control --plan
engram take-control --all
engram take-control --file AGENTS.md
engram take-control --dir docs
engram take-control --include "docs/**/*.md" --exclude "docs/private/**"
engram take-control --max-sources 5 --max-chars 900
engram take-control --all --metacognize --accept-all
```

Les mémoires de take-control sauvegardées enregistrent `source_files` and `source_hashes`, de sorte que les sources sans modification soient ignorées plus tard.
Utilisez `--metacognize` avec accept-all lorsque les suggestions de mémoire associée doivent suspendre l'écriture et permettre à l'agent de réexécuter avec `UPDATE` ou `DEPENDS_ON`.

## Résoudre les Conflits avec Restructuration (Resolve Conflicts With Metacognition)

Utilisez `resolve-conflicts` pour prévisualiser ou résoudre uniquement les conflits de mémoire de workspace appartenant à Engram. Ajoutez `--metacognize` lorsque l'agent doit examiner le dossier de mémoire après la gestion des conflits :

```bash
engram resolve-conflicts --dry-run --metacognize
engram resolve-conflicts --metacognize
engram resolve conflicts and metacognize
```

La commande maintient la gestion déterministe des conflits dans `.agents/.engram/`, puis ajoute le pack d'origine metacognize de workspace pour des candidats `TYPE/TEXT` concis.

## Observer (Observe)

`observe` stocke des notes brutes et nettoyées dans `inbox/`. Les notes d'inbox ne sont pas de la mémoire active.

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<note>.md
```

Utilisez ceci lorsque vous souhaitez préserver des notes provisoires avant de décider ce qui doit devenir de la mémoire durable.

## Réparation et Révision

Utilisez `repair` après des modifications manuelles ou des importations :

```bash
engram repair
engram rebuild-index
engram verify
```

Utilisez des graphes et des contrôles de qualité avant d'archiver :

```bash
engram graph "package manager"
engram quality-check
engram archive --reason "Repo migrated to npm." rules/use-pnpm.md
```

Suivant : [Comparaison et feuille de route](comparison.md).
