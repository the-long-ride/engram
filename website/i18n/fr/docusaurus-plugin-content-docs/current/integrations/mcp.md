---
title: Outils MCP
sidebar_position: 11
description: Le serveur MCP d’Engram expose des outils de chargement, de recherche et de proposition seule aux hôtes compatibles MCP.
---

# Outils MCP {#mcp-tools}

Engram fournit un binaire de serveur MCP, `engram-mcp`, qui expose des outils aux hôtes compatibles MCP.

## Enregistrement {#registration}

`engram link <target>` installe aussi par défaut l’enregistrement MCP connu pour cette cible.

| Portée | Chemin |
| --- | --- |
| Claude Code en workspace et autres hôtes qui lisent `.mcp.json` (pas Codex, qui ne lit que `~/.codex/config.toml` ; voir Codex global) | `.mcp.json` |
| Gemini en workspace | `mcpServers.engram` dans `.gemini/settings.json` |
| Cursor en workspace | `.cursor/mcp.json` |
| OpenCode en workspace | champ `mcp` de `opencode.json` / `opencode.jsonc` |
| Claude global | Pas un fichier : Engram affiche `claude mcp add --scope user engram -- engram-mcp` (Claude Code conserve les serveurs MCP utilisateur dans `~/.claude.json`) |
| Gemini global | `mcpServers.engram` fusionné dans `~/.gemini/settings.json` |
| Codex global | Bloc géré `[mcp_servers.engram]` dans `~/.codex/config.toml` |
| Antigravity global | Fichier de configuration MCP de Gemini |
| OpenCode global | champ `mcp` de `~/.config/opencode/opencode.jsonc` / `opencode.json` |
| Cursor global | Intégré au plugin local |
| Windsurf global | `~/.codeium/windsurf/mcp_config.json` |

Le MCP de workspace pour Windsurf est ignoré, car le contrat officiel ne documente qu’une configuration MCP au niveau utilisateur.

La commande du serveur est `engram-mcp` lorsqu’elle se trouve dans le `PATH`, sinon la forme `npx` épinglée sur la version installée (`npx -y --package @the-long-ride/engram@<version> engram-mcp`) ; `engram upgrade` et `engram link <host>` réépinglent les entrées existantes. Unlink ne supprime que l’entrée ou le bloc géré d’Engram et laisse intacts les autres serveurs et clés.

## Versions du protocole {#protocol-versions}

Un seul processus `engram-mcp` sert deux époques du protocole :

- **Héritée** : `initialize` renvoie le `protocolVersion` du client lorsqu’il vaut `2024-11-05`, `2025-03-26`, `2025-06-18` ou `2025-11-25`, et `2025-11-25` sinon. Une chaîne de version inconnue n’est jamais renvoyée telle quelle.
- **MCP 2026-07-28** : une requête dont `params._meta` porte `io.modelcontextprotocol/protocolVersion` est servie sans état (`server/discover`, `tools/list`, `tools/call`, `resources/*`, `prompts/*`). Elle doit aussi porter `io.modelcontextprotocol/clientCapabilities` (`-32602` si absent). Les résultats portent `resultType: "complete"`, et les méthodes de liste ajoutent `ttlMs` et `cacheScope`. Une version moderne non prise en charge renvoie `-32022` avec `data.supported` et `data.requested` ; `ping`, `initialize` et les méthodes d’outil nues renvoient `-32601` dans cette époque.

La sortie standard ne porte que du JSON-RPC, un message par ligne.

## Instructions du serveur et recherche d’outils {#server-instructions-and-tool-search}

Le résultat `initialize` hérité comme le résultat `server/discover` de MCP 2026-07-28 portent la même chaîne `instructions` (512 caractères au plus, autonome). Elle indique à l’hôte quand utiliser les outils Engram (rappeler les règles et décisions du projet, enregistrer les connaissances du projet) et que `engram_commit` nécessite l’humain. Codex lit les 512 premiers caractères ; Claude Code ne charge d’emblée que les noms d’outils plus `instructions` et diffère les définitions d’outils derrière la recherche d’outils.

`engram-mcp --always-load` marque `engram_load` avec `_meta["anthropic/alwaysLoad"]: true`, de sorte que Claude Code charge cet outil d’emblée. Les hooks Claude d’Engram injectent déjà du contexte ; `engram link` n’ajoute donc l’option que lorsqu’aucun hook Claude d’Engram n’est installé ou en cours d’installation, et uniquement aux configurations que Claude Code lit : `.mcp.json` et la commande `claude mcp add --scope user` affichée. Les configurations Codex, Cursor, Gemini et Windsurf ne la reçoivent jamais. Une entrée `engram` existante dans `.mcp.json` ne change qu’avec `--force`, `engram upgrade` ou une actualisation. `engram-mcp --no-elicitation` conserve le flux `approval_token` par chat même pour les clients qui prennent en charge la boîte de dialogue d’approbation (voir ci-dessous). Une option `engram-mcp` inconnue est ignorée avec une note sur stderr.

## Outils {#tools}

| Outil | Rôle | Écrit |
| --- | --- | --- |
| `engram_load` | Router et renvoyer la mémoire pour une tâche (`query`, `id`, `budget_tokens`, `disclosure`, `full`, `explain`) | Non |
| `engram_route` | Classer une tâche et lister les mémoires vers lesquelles elle est routée | Non |
| `engram_search` | Rechercher dans la mémoire par requête | Non |
| `engram_verify`, `engram_status` | Vérifier les hachages ; rapporter l’état de santé et les compteurs | Non |
| `engram_save`, `engram_save_session` | Renvoyer une proposition numérotée et un `approval_token` | Non |
| `engram_commit` | Écrire une proposition approuvée | Oui, après approbation humaine |
| `engram_set_role`, `engram_set_rule_variant` | Mettre à jour les rôles ou le mode de variante de règle | Oui |
| `engram_note` | Enregistrer une note de tâche expurgée dans le niveau de travail (`text`, `objective`, `type`, `scope`) ; renvoie `{id, file, valid_until}` | Oui, après une approbation oui/annuler |

`engram_load` produit par défaut la sortie hiérarchisée décrite dans [Chemin de lecture et routage](../concepts/read-path.md) ; passez `full: true` pour une sortie héritée plus large. `budget_tokens` n’a aucun effet avec `id`.

## Résultats structurés {#structured-results}

Le texte destiné aux humains se trouve dans `content[0].text`. `structuredContent` est l’enveloppe `{contract_version, ok, data, diagnostics}`, où `data` porte :

- `engram_load` : `selected_keys`, `body_keys`, `card_ids`, `omitted_ids` (identifiants écartés par le budget de tokens, récupérables via `id`) et `tokens`.
- `engram_search` et `engram_route` : `entries` avec `id`, `type`, `scope` et `score`. Les entrées de route sont dans l’ordre de chargement, non triées par score.

## Approbation et commit {#approval-and-commit}

`engram_save` et `engram_save_session` sont **en proposition seule** : ils renvoient l’aperçu et un `approval_token`. Une fois que l’humain a approuvé dans le chat les candidats exacts, appelez `engram_commit` avec `approval_token` et `approve: "all"` ou une liste de numéros de candidats à partir de 1. Il écrit par le même chemin que `save-session --force` ; les candidats apparentés ou en doublon sont donc différés comme d’habitude.

- Les tokens sont aléatoires, liés au workspace, à usage unique et expirent après 30 minutes.
- Seul un hachage du token est stocké, dans `pending-approvals.json`, ignoré par Git ; modifier un candidat en attente fait échouer le contrôle d’intégrité.
- N’appelez jamais `engram_commit` avant que l’humain ait approuvé les candidats affichés.
- `engram_commit` porte `_meta["anthropic/requiresUserInteraction"]: true` dans `tools/list`, ce qui fait que Claude Code demande confirmation à chaque appel, même dans les modes de contournement. Le bloc Codex géré ajoute `[mcp_servers.engram.tools.engram_commit]` avec `approval_mode = "approve"`, et `engram doctor` avertit (`host.gemini_trust`) lorsqu’une entrée Gemini `mcpServers.engram` définit `trust: true`, ce qui ignorerait la confirmation.
- Chaque candidat porte une ligne `Verdict:` déterministe (`ADD`, `UPDATE <id>`, `SUPERSEDE <id>`, `NOOP duplicate of <id>`). Le token fige les verdicts, et `engram_commit` n’applique un `SUPERSEDE` que tant que le verdict recalculé correspond encore.
- L’`approval_token` est renvoyé à l’agent. Il prouve qu’une proposition existe, pas qu’un humain l’a approuvée. La porte humaine est l’invite d’autorisation par outil de l’hôte pour `engram_commit` ; n’ajoutez donc pas `mcp__engram__engram_commit` (ou l’équivalent de votre hôte) à une liste d’autorisations et ne l’approuvez pas automatiquement.

### Boîte de dialogue d’approbation (elicitation) {#approval-dialog-elicitation}

Lorsque le client déclare l’elicitation par formulaire, `engram_save` et `engram_save_session` interrogent l’humain dans la boîte de dialogue propre à l’hôte au lieu de renvoyer un token :

- Le formulaire liste les numéros de candidats avec `ADD`/`UPDATE` et des titres d’identifiant (jamais le texte des mémoires) ainsi qu’une portée d’enregistrement ; `both` peut être restreint à une seule portée, jamais élargi.
- `accept` écrit exactement les candidats sélectionnés par le même chemin que `engram_commit`. Aucun `approval_token` n’est renvoyé.
- `decline` révoque la proposition : un `engram_commit` ultérieur avec son token échoue avec `approval was declined in the approval dialog`. Une réponse invalide la révoque aussi.
- `cancel`, un délai de 60 secondes ou une erreur du client retombent sur le texte du token ci-dessus, préfixé par `nothing was saved`, de sorte que les hôtes qui déclarent l’elicitation mais ferment la boîte de dialogue continuent de fonctionner. Un hôte qui refuse automatiquement a besoin de `engram-mcp --no-elicitation`.
- Les clients hérités reçoivent une requête `elicitation/create` du serveur vers le client. Les clients MCP 2026-07-28 reçoivent un résultat `input_required` dont le `requestState` est une enveloppe expirante scellée par HMAC, liée à l’outil, au workspace et aux arguments ; ils réessaient `tools/call` avec `inputResponses` et ce `requestState`. Un état forgé, expiré ou non concordant renvoie `-32602` et n’écrit rien. Un redémarrage du serveur invalide les états ouverts ; l’agent propose donc à nouveau.
- Les appels sans cette capacité et `--no-elicitation` utilisent le flux par token inchangé.

### Notes du niveau de travail {#working-tier-notes}

`engram_note` enregistre une courte note de tâche dans le niveau `working/`, ignoré par Git (`source: note`, `tier: working`, `valid_until` = aujourd’hui + `load.working_ttl_days`). Le texte est expurgé et les lignes ressemblant à des instructions sont refusées avant l’aperçu. L’humain répond à une seule invite oui/annuler via la même boîte de dialogue, la nouvelle tentative `input_required` ou le flux `approval_token` décrits plus haut ; `decline`, `cancel` et un délai dépassé n’écrivent rien. Une note ne met jamais à jour une mémoire durable portant le même identifiant, et `engram promote` est le seul moyen de la rendre durable. SessionStart omet une note sauf si `ENGRAM_SESSION_OBJECTIVE` correspond à l’objectif de la note ; sinon elle apparaît sous forme de carte d’une ligne. L’outil porte `readOnlyHint: false` et aucun `destructiveHint`.

## Règle de forçage {#force-rule}

Les demandes explicites `/engram save-session --force`, y compris le raccourci `/engram ss -f`, doivent utiliser le chemin d’écriture de la CLI. Le raccourci compté `/engram ss -f last 50 sessions` doit utiliser `engram save-session --query-level 50 --force`. Les hôtes MCP seul valident via `engram_commit`.

## Entrée MCP d’OpenCode {#opencode-mcp-entry}

```json
"engram": {
  "type": "local",
  "command": ["engram-mcp"],
  "args": [],
  "enabled": true
}
```

Le serveur MCP implémente la poignée de main JSON-RPC standard (`initialize`, `notifications/initialized`, `tools/list` et `tools/call`) et répond à `ping`. Les mémoires sont aussi exposées comme ressources MCP (`engram://index` liste des cartes d’une ligne, `engram://memory/{id}` lit le même corps que `engram load --id` et compte comme une récupération), et un prompt, `propose`, renvoie le protocole de proposition de mémoire. `resources/list` renvoie l’index plus les `mcp.resource_limit` mémoires les plus utilisées (configuration JSON, 20 par défaut, 0 à 200). Les outils de lecture portent `annotations.readOnlyHint: true`. Une ligne JSON malformée reçoit une réponse d’erreur `-32700` et le serveur continue de fonctionner. Les requêtes sans `id` sont des notifications et ne reçoivent aucune réponse, et un appel de méthode nu qui n’est pas `tools/call` renvoie du texte brut.

## Étapes suivantes {#next-steps}

- [Vue d’ensemble des intégrations d’agents](overview.md)
- [Hooks et lignes de preuve](hooks.md)
