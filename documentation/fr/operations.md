# Guide des Opérations

Cette page fournit des détails d'utilisation afin que le README puisse rester court.

## Interface des Commandes

| Besoin | Commande |
| --- | --- |
| Charger la mémoire d'une tâche | `engram load "<tâche>"` |
| Rechercher dans la mémoire | `engram search "<sujet>"` |
| Enregistrer une mémoire | `engram save [rule\|workflow\|knowledge] "<texte>"` |
| Enregistrer plusieurs mémoires de session | `engram save-session` ou `engram ss` |
| Accepter tous les candidats de session | `engram ss -a` |
| Capturer une note brute | `engram observe --file session.md` |
| Convertir les documents/directives existants | `engram take-control --all` |
| Aperçu de la prise de contrôle | `engram take-control --plan` |
| Inspecter le routage du graphe | `engram graph "<sujet>"` |
| Vérifier les hashes | `engram verify` |
| Trouver les fichiers de mémoire mal formés | `engram repair` |
| Archiver une mémoire erronée | `engram archive --reason "<pourquoi>" <id-ou-fichier>` |
| Ajuster la force des règles | `engram set-rule-variant strict\|balanced\|light\|off` |

Utilisez `save-session` pour les propositions de mémoire lors de longues sessions. Forme abrégée : `ss`.

## Enregistrer Session (Save Session)

Utilisez `save-session` lorsqu'une longue interaction a produit plusieurs candidats :

```text
TYPE: rule | TEXT: Always run tests before release.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

Sans `--accept-all`, Engram demande quels candidats enregistrer. Avec `ss -a`, chaque candidat généré est enregistré car l'humain a explicitement approuvé ce raccourci.

## Prise de Contrôle (Take Control)

`take-control` aide à adopter Engram dans les dépôts existants. Il scanne les consignes de l'agent, les notes, les documents et les fichiers sélectionnés, puis demande à l'agent des candidats concis.

Sélecteurs utiles :

```bash
engram take-control --plan
engram take-control --all
engram take-control --file AGENTS.md
engram take-control --dir docs
engram take-control --include "docs/**/*.md" --exclude "docs/private/**"
engram take-control --max-sources 5 --max-chars 900
```

Les mémoires enregistrées par take-control stockent les `source_files` et les `source_hashes`, de sorte que les sources inchangées soient ignorées par la suite.

## Observer (Observe)

`observe` stocke des notes brutes aseptisées dans `inbox/`. Les notes de la boîte de réception ne sont pas de la mémoire active.

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<note>.md
```

Utilisez cette option lorsque vous souhaitez conserver des notes brutes avant de décider ce qui doit devenir de la mémoire durable.

## Réparation et Révision

Utilisez `repair` après des modifications manuelles ou des importations :

```bash
engram repair
engram rebuild-index
engram verify
```

Utilisez le graphe et les contrôles de qualité avant d'archiver :

```bash
engram graph "package manager"
engram quality-check
engram archive --reason "Repo migrated to npm." rules/use-pnpm.md
```

Suivant : [Comparaison et feuille de route](comparison.md).
