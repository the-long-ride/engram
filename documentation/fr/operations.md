# Guide D'Opérations

## Commandes

| Besoin | Commande |
| --- | --- |
| Charger la mémoire | `engram load "<task>"` |
| Chercher | `engram search "<topic>"` |
| Sauver une mémoire | `engram save [rule|workflow|knowledge] "<text>"` |
| Sauver une session | `engram save-session` ou `engram ss` |
| Tout accepter | `engram ss -a` |
| Capturer une note brute | `engram observe --file session.md` |
| Importer docs/guidance | `engram take-control --all` |
| Prévisualiser takeover | `engram take-control --plan` |
| Inspecter le graphe | `engram graph "<topic>"` |
| Vérifier hashes | `engram verify` |
| Trouver fichiers invalides | `engram repair` |
| Archiver mémoire fausse | `engram archive --reason "<why>" <id-or-file>` |
| Régler la force des règles | `engram set-rule-variant strict|balanced|light|off` |

Utilisez `save-session` pour les propositions de memoire de longue session. Forme courte : `ss`.

## Save Session

```text
TYPE: rule | TEXT: Always run tests before release.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

Sans `--accept-all`, Engram demande quels candidats garder. Avec `ss -a`, tout est sauvé car l'humain l'a explicitement approuvé.

## Take Control

```bash
engram take-control --plan
engram take-control --all
engram take-control --file AGENTS.md
engram take-control --dir docs
engram take-control --include "docs/**/*.md" --exclude "docs/private/**"
engram take-control --max-sources 5 --max-chars 900
```

Les mémoires gardent `source_files` et `source_hashes`.

## Observe

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<note>.md
```

Les notes `inbox/` ne sont pas actives avant conversion.

## Repair Et Revue

```bash
engram repair
engram rebuild-index
engram verify
engram graph "package manager"
engram quality-check
engram archive --reason "Repo migrated to npm." rules/use-pnpm.md
```

Suite: [Comparaison](comparison.md).
