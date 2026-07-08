---
title: Outils MCP
sidebar_position: 11
description: Le serveur Engram MCP expose des outils de chargement, de recherche et de proposition uniquement aux hôtes compatibles MCP.
---

# Outils MCP

Engram fournit un binaire de serveur MCP `engram-mcp` qui expose des outils aux hôtes compatibles MCP.

## Enregistrement

`engram link <target>` installe également par défaut l'enregistrement MCP connu pour cette cible.

| Portée | Chemin |
| --- | --- |
| Espace de travail (la plupart des hôtes) | `.mcp.json` |
| Espace de travail de Cursor | `.cursor/mcp.json` |
| Espace de travail de OpenCode | champ `mcp` dans `opencode.json` / `opencode.jsonc` |
| Claude global | `~/.claude/mcp.json` |
| Gemini / Antigravity global | Fichier de configuration Gemini MCP |
| OpenCode global | champ `mcp` dans `~/.config/opencode/opencode.jsonc` / `opencode.json` |
| Cursor global | Intégré dans le plugin local |
| Windsurf global | `~/.codeium/windsurf/mcp_config.json` |

L'espace de travail MCP de Windsurf est ignoré car les documents officiels ne décrivent que la configuration MCP au niveau de l'utilisateur.

## Outils

Les hôtes MCP doivent traiter `engram_save` et `engram_autosave` comme des outils de **proposition uniquement** ; ils doivent toujours acheminer les écritures finales via le flux d'approbation CLI visible par l'homme. `engram_load` utilise par défaut `--for-agents` (désactivation via `forAgents : false`).

## Règle tout accepter

Les requêtes explicites `/engram save-session --accept-all`, y compris le raccourci `/engram ss -a`, doivent utiliser le chemin d'écriture CLI car la sauvegarde automatique MCP reste sur proposition uniquement. Le raccourci compté `/engram ss -a last 50 sessions` doit utiliser `engram save-session --query-level 50 --accept-all`.

## Entrée MCP OpenCode

```json
"engram": {
  "type": "local",
  "command": ["engram-mcp"],
  "args": [],
  "enabled": true
}
```

Le serveur MCP implémente la liaison JSON-RPC standard (`initialize`, `notifications/initialized`, `tools/list` et `tools/call`).

## Étapes suivantes

- [Présentation des intégrations d'agents](overview.md)
- [Hooks et lignes de preuve](hooks.md)
