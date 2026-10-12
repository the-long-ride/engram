---
title: Hooks et lignes de preuve
sidebar_position: 12
description: Les hooks d’agent Engram injectent la mémoire routée au démarrage de la session et aux tours d’invite. Les lignes de preuve rendent l’injection visible.
---

# Hooks et lignes de preuve {#hooks-and-proof-lines}

Les hooks d’agent sont des hooks d’hôte optionnels qui injectent le contexte Engram routé au démarrage de la session puis aux tours de changement de tâche, lorsque l’hôte expose un canal de contexte sûr au moment de l’invite.

## Installer les hooks {#install-hooks}

```bash
engram link codex
engram link claude
engram link gemini
engram link cursor
engram link windsurf
engram link --global opencode
engram set-proof compact
```

Utilisez `--global` pour la configuration au niveau utilisateur et `engram unlink` pour ne supprimer que les entrées de hook gérées par Engram.

## Mode de lecture {#read-mode}

`engram set-read startup|auto|always|manual|off` contrôle le comportement à l’exécution :

- `auto` charge au démarrage de la session et aux tours d’invite suivants, en n’injectant que les corps de mémoire qui n’ont pas déjà été livrés dans la session.
- `startup` ne charge qu’au démarrage de la session.
- `always` réinjecte à chaque tour éligible.
- `manual` et `off` réduisent l’automatisation.

Le cache des hooks stocke des hachages, des identifiants de session, l’hôte, le cwd et les clés de mémoire déjà livrées par session — jamais le texte brut des invites.

## Injection par delta {#delta-injection}

Pour chaque (hôte, cwd, session), le hook enregistre les clés qu’il a livrées. Un tour d’invite n’injecte que les corps pas encore livrés et se termine par une ligne `already loaded: <ids>` pour les autres ; un tour sans nouveauté n’injecte que cette ligne (avec la ligne de preuve, lorsque la preuve est activée), et un tour qui ne route rien n’injecte aucune mémoire. `SessionStart` et `PreCompact` réinitialisent l’ensemble ; la mémoire est donc livrée à nouveau après une nouvelle session ou un compactage de contexte. Les enregistrements de plus de 7 jours sont purgés et 200 au maximum sont conservés. OpenCode ne dispose que d’un seul emplacement de prompt système ; son plugin remplace ou conserve donc l’emplacement courant au lieu d’envoyer un delta strict.

## Plafonds de charge utile {#payload-caps}

Les hôtes tronquent les sorties de hook trop volumineuses ; le hook mesure donc l’`additionalContext` rendu dans l’unité propre à chaque hôte : au plus 2 400 tokens sur Codex (octets UTF-8 / 4 ; Codex limite un message à environ 2 500 tokens), au plus 9 500 caractères sur Claude (limite de 10 000), et `load.max_tokens` ailleurs. Lorsque le texte dépasse le plafond, le hook replanifie avec un budget plus petit : les corps sont rétrogradés en cartes d’une ligne et les cartes les moins bien classées sont omises ; un corps n’est jamais coupé en plein texte. Le même plafond couvre `SubagentStart` et la sortie des déclencheurs de chemin, et seuls les corps réellement envoyés sont enregistrés comme livrés. Les identifiants `already loaded:` sont triés et le `sig` de la preuve hache les clés routées triées, de sorte qu’un même ensemble routé imprime toujours les mêmes octets.

## Déclencheurs par chemin {#path-scoped-triggers}

Les installations de hooks Claude, Codex et Gemini enregistrent aussi un déclencheur par chemin. Codex utilise toujours `PreToolUse` et Gemini utilise `AfterTool`. Claude utilise `InstructionsLoaded` avec `hooks.path_rules native` (par défaut) et `PreToolUse` avec `hooks.path_rules hook` :

- Claude `InstructionsLoaded` (matcher `path_glob_match`, asynchrone, sortie ignorée) se déclenche lorsque Claude charge un fichier `.claude/rules/engram/<id>.md` généré, et consigne cette mémoire dans l’ensemble des mémoires livrées et dans `usage.json`. Le fichier de règle porte lui-même le corps, donc rien n’est injecté deux fois.
- Claude `PreToolUse` (mode hook) cible `Read`, `Edit`, `Write` et `MultiEdit` et utilise `tool_input.file_path`.
- Codex n’a ni outil de lecture ni outil de modification multiple, et `PreToolUse` ne se déclenche pas sur les lectures ; seuls les fichiers modifiés via `apply_patch` déclenchent donc.
- Gemini `AfterTool` (matcher `read_file|write_file|replace`, délai en millisecondes) lit le chemin touché dans l’entrée de l’outil et ajoute les mémoires au résultat de l’outil, de sorte qu’elles arrivent une étape après la lecture. Le matcher de Gemini est une expression régulière non ancrée ; le hook démarre donc aussi pour des outils dont le nom contient simplement `replace` ; il se termine alors avec `{}`. Il partage l’ensemble des mémoires livrées avec `BeforeAgent`.

Lorsque le chemin touché (relatif au répertoire de travail) correspond aux globs `applies_to` d’une mémoire non encore livrée, le hook injecte jusqu’à 3 corps par événement en tant que `additionalContext`. Il ne renvoie jamais de décision d’autorisation ; il ne peut donc pas bloquer un appel d’outil, et les chemins hors du répertoire de travail sont ignorés. Un texte d’invite qui nomme un vrai chemin de fichier compte aussi comme ancre pour les mémoires `applies_to`.

Exécutez une fois `engram upgrade --latest` (ou `engram link <host>` à nouveau) pour ajouter le déclencheur par chemin (`InstructionsLoaded` ou `PreToolUse`) et `PreCompact` (Gemini : `PreCompress`) à une ancienne installation ; une installation Claude existante passe de `PreToolUse` à `InstructionsLoaded` lors de cette actualisation, exécutez donc d’abord `engram config set hooks.path_rules hook` pour conserver `PreToolUse` ; un simple `engram upgrade` n’actualise pas les configurations de hooks. Claude, Codex et Cursor lisent le `timeout` du hook en secondes ; les entrées gérées écrivent `10`.

## Sous-agents {#subagents}

Les installations de hooks Claude et Codex enregistrent aussi `SubagentStart` (matcher `*`, tous les types d’agent). Il injecte le contexte `current session` routé dans le sous-agent en tant que contexte supplémentaire et ne renvoie jamais de décision. Les hooks de sous-agent portent le `session_id` du parent ; l’ensemble des mémoires livrées du sous-agent a donc pour clé `<session_id>#agent:<agent_id>` et l’ensemble du parent n’est jamais touché ; 100 enregistrements de sous-agent au maximum sont conservés afin qu’ils ne puissent pas évincer les sessions parentes. La sortie `SubagentStart` de Codex omet `suppressOutput`, que Codex ne liste pas pour cet événement. Le même plafond de charge utile s’applique. Lacune connue : Codex ne documente pas `agent_id` sur `PreToolUse` ; un déclencheur par chemin dans un sous-agent Codex peut donc être enregistré dans l’ensemble des mémoires livrées du parent.

## File des transcriptions de session (optionnelle) {#session-transcript-queue-opt-in}

`engram link claude --session-end` et `engram link codex --session-end` enregistrent aussi un hook de commande `SessionEnd` (délai de 5 secondes pour Claude, 3 secondes pour Codex). C’est un simple hook de commande : il n’injecte rien, répond `{}`, échoue en mode ouvert et se contente d’ajouter `{ transcript_path, host, session, at }` à `session-queue.json`, ignoré par Git, dans le dossier de mémoire du workspace. Les entrées sont écrites sous un verrou de fichier, dédupliquées sur l’hôte et la session, et plafonnées aux 50 plus récentes. L’option est désactivée par défaut, `engram upgrade` ne l’ajoute jamais (une entrée existante est conservée), `engram unlink` la supprime et Gemini n’est pas enregistré. Le chemin stocké est absolu et nomme votre utilisateur du système, ce qui explique pourquoi le fichier ne quitte jamais votre machine.

Videz la file avec `engram observe --queue` (`--dry-run` se contente d’inspecter, `--limit n` plafonne les entrées par exécution). Chaque transcription doit exister, être un fichier régulier (ni lien symbolique ni lien physique) et peser au plus 5 Mio. Elle est expurgée, débarrassée des lignes ressemblant à des injections, et stockée sous forme de trace plus une enveloppe de boîte de réception qui ne nomme jamais le chemin absolu. Les entrées ignorées ou stockées quittent la file ; celles qui atteignent le quota de la boîte de réception (`max_files` dans le fichier facultatif `.agents/engram.transcripts.json`) y restent. Aucune mémoire n’est écrite : promouvez un fichier de la boîte de réception avec `engram save-session --file <inbox file>` et la porte d’approbation habituelle. Lancez `observe --queue` vous-même ou depuis un simple hook de commande, pas depuis un hook Codex asynchrone.

## Mode preuve {#proof-mode}

`engram set-proof off|compact` contrôle si les hooks pris en charge ajoutent aussi une ligne compacte `Engram proof:` à chaque tour éligible. La visibilité de la preuve est distincte de `set-read` : `compact` peut signaler des tours chargés, réutilisés ou ignorés sans changer le moment où la mémoire Engram complète est injectée.

## Matrice des capacités des hooks {#hook-capability-matrix}

| Hôte | Chemin de configuration | Événements |
| --- | --- | --- |
| `codex` | `.codex/hooks.json` ; global `~/.codex/hooks.json` | `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PreCompact`, `SubagentStart` (`SessionEnd` optionnel) |
| `claude` | `.claude/settings.json` ; global `~/.claude/settings.json` | `SessionStart`, `UserPromptSubmit`, `InstructionsLoaded` (`PreToolUse` lorsque `hooks.path_rules hook`), `PreCompact`, `SubagentStart` (`SessionEnd` optionnel) |
| `gemini` | `.gemini/settings.json` ; global `~/.gemini/settings.json` | `SessionStart`, `BeforeAgent`, `AfterTool`, `PreCompress` |
| `cursor` | `.cursor/hooks.json` ; plugin global `hooks/hooks.json` | `sessionStart` |
| `windsurf` / `cascade` | `.windsurf/hooks.json` ; global `~/.codeium/windsurf/hooks.json` | `pre_user_prompt` |
| `opencode` | `~/.config/opencode/plugins/engram.js` | `chat.message`, `experimental.chat.system.transform` |
| `copilot` | Aucun écrit | N/A |
| `cline` | Aucun écrit | N/A |

## Étapes suivantes {#next-steps}

- [Vue d’ensemble des intégrations d’agents](overview.md)
- [CLI : inject / link / upgrade](../cli/inject-link-upgrade.md)
