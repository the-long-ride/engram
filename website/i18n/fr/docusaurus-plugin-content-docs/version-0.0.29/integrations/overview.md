---
title: Vue d’ensemble des intégrations d’agents
sidebar_position: 1
description: Engram prend en charge les fichiers de skill, les adaptateurs slash, les outils MCP et les hooks d’agent sur de nombreux hôtes IA.
---

# Vue d’ensemble des intégrations d’agents {#agent-integrations-overview}

Engram prend en charge deux couches d’intégration :

- **Fichiers de skill** — instructions générées pour les agents qui lisent le contexte du projet.
- **Adaptateurs slash** — invites de commande `/engram` générées pour les agents qui prennent en charge les commandes slash de projet ou les Agent Skills.
- **Outils de type MCP** — un wrapper JSON-lines pour les agents qui peuvent enregistrer des processus d’outils externes.
- **Hooks d’agent** — hooks d’hôte optionnels qui injectent le contexte Engram routé au démarrage de la session puis aux tours de changement de tâche.

## Démarrage rapide {#quick-start}

```bash
engram inject
engram link all
```

`engram link all` installe l’ensemble des cibles publiques et signale des raisons `SKIPPED` déterministes pour les hôtes partiels, dans une seule installation unifiée couvrant les fichiers d’instructions du skillset, la configuration MCP, les adaptateurs slash et les hooks d’agent.

## Catégories de cibles {#target-categories}

| Catégorie | Cibles | Comportement |
| --- | --- | --- |
| Orientée exécution | `codex`, `claude`, `cursor`, `gemini` | Courtes instructions d’amorçage, un guide compagnon avec le flux complet, de courts pointeurs Agent Skill et la configuration MCP |
| Compatible hooks | `codex`, `claude`, `gemini`, `opencode`, `cursor`, `windsurf`/`cascade` | Hooks d’agent avec des schémas d’événements propres à chaque hôte |
| Repli compact/manuel | `agents-md`, `copilot`, `cline` | Protocole compact complet ; pas d’injection fiable de contexte à l’exécution en v1 |

## Cibles prises en charge {#supported-targets}

| Cible | Fichier | Usage principal |
| --- | --- | --- |
| `codex` | `AGENTS.md`, `.agents/skills/engram/SKILL.md` | Instructions de projet OpenAI Codex et Agent Skill |
| `agents-md` | `AGENTS.md` | Repli générique pour les agents compatibles AGENTS.md non listés |
| `copilot` | `.github/copilot-instructions.md` ; global : `~/.copilot/copilot-instructions.md` | Instructions de dépôt et d’utilisateur de GitHub Copilot |
| `claude` | `AGENTS.md`, `.claude/engram.md`, `.agents/engram.md`, plus un bloc `CLAUDE.md` uniquement lorsque ce fichier existe déjà, et des règles de chemin `.claude/rules/engram/<id>.md` | Consignes de projet Claude Code et règles de chemin natives |
| `cursor` | `.cursor/rules/engram.mdc`, règles de chemin `.cursor/rules/engram/<id>.mdc` ; global : `~/.cursor/plugins/local/engram/` | Règles de projet Cursor, règles de chemin natives et plugin local |
| `gemini` | `GEMINI.md` ; global : `~/.gemini/GEMINI.md`, `~/.gemini/skills/engram/SKILL.md` | Contexte Gemini CLI, y compris les surfaces Antigravity compatibles Gemini |
| `cline` | `.clinerules` | Règles de workspace de style Cline |
| `windsurf` | `.windsurf/rules/engram.md` ; global : `~/.codeium/windsurf/memories/global_rules.md` | Règles de workspace Windsurf et règles/MCP globaux |
| `opencode` | `AGENTS.md`, `.opencode/engram.md`, `.opencode/skills/engram/SKILL.md`, `opencode.json` | Règles OpenCode, Agent Skill, outils MCP, commandes personnalisées, hooks de plugin |
| `mcp` | `.mcp.json` ; global : `~/.gemini/settings.json`, `~/.codex/config.toml` et une indication `claude mcp add` | Enregistrement du wrapper JSON-lines de type MCP |
| `slash` | `.claude/commands/engram.md`, `.cursor/commands/engram.md`, `.gemini/commands/engram.toml`, `.opencode/commands/engram.md` | Adaptateurs slash natifs `/engram` |

Alias : `codex` installe l’adaptateur `agents-md` plus le fichier Agent Skill générique, `open-code` correspond à `opencode` et `cascade` correspond à `windsurf`. Les anciennes cibles `antigravity` et `antigravity-cli` sont, pour l’instant, des alias de compatibilité masqués.

## Matrice des capacités des hooks {#hook-capability-matrix}

| Hôte | Installation de hook en v1 | Événements |
| --- | --- | --- |
| `codex` | Oui | `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PreCompact`, `SubagentStart` (`SessionEnd` optionnel) |
| `claude` | Oui | `SessionStart`, `UserPromptSubmit`, `InstructionsLoaded` (`PreToolUse` avec `hooks.path_rules hook`), `PreCompact`, `SubagentStart` (`SessionEnd` optionnel) |
| `gemini` | Oui | `SessionStart`, `BeforeAgent`, `AfterTool`, `PreCompress` |
| `cursor` | Oui | `sessionStart` |
| `windsurf` / `cascade` | Oui | `pre_user_prompt` |
| `opencode` | Pris en charge via un plugin local | `chat.message`, `experimental.chat.system.transform` |
| `copilot` | Ignoré | N/A |
| `cline` | Ignoré | N/A |

## Étapes suivantes {#next-steps}

- [Codex](codex.md)
- [Claude](claude.md)
- [Gemini](gemini.md)
- [Cursor](cursor.md)
- [Windsurf / Cascade](windsurf.md)
- [OpenCode](opencode.md)
- [Copilot](copilot.md)
- [Cline](cline.md)
- [Adaptateurs slash](slash.md)
- [Outils MCP](mcp.md)
- [Hooks et lignes de preuve](hooks.md)
