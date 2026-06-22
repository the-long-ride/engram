# Engram

Engram est un protocole de mémoire sous le contrôle de l'utilisateur pour les agents d'IA. Il conserve les connaissances durables du projet, de l'équipe et des préférences personnelles dans des fichiers que les humains peuvent inspecter, réviser, synchroniser et réparer.

Engram n'est pas un cerveau caché de l'agent. L'agent peut proposer une mémoire, mais la source de vérité est le Markdown approuvé situé sous `.agents/.engram/` ou dans un dossier de mémoire globale facultatif.

## Quel Problème Il Résout

Les agents d'IA oublient les décisions du projet, répètent les questions de configuration et mélangent l'ancien contexte avec les nouvelles instructions. La mémoire intégrée est souvent privée et propre à un fournisseur, une application ou une machine.

Engram offre à la mémoire un contrat stable :

- Les faits, règles et flux de travail approuvés vivent sous forme de fichiers Markdown.
- Les index et les graphes accélèrent le routage.
- Les écritures nécessitent une approbation humaine.
- Les hashes révèlent les modifications non sécurisées.
- Les règles d'exclusion (ignore rules) protègent le contexte privé.
- Les profils isolent la mémoire d'entreprise, de client et personnelle afin que les API externes ou les agents fournis par l'entreprise ne fassent pas fuiter le contexte entre projets.
- Git fournit l'historique, la portabilité et la révision par l'équipe.

## Modèle Mental

Considérez Engram comme un centre de mémoire de connaissances :

| Couche | Rôle |
| --- | --- |
| Markdown | Source de vérité durable |
| JSON index | Couche de recherche rapide |
| JSON graph | Couche de routage par sujet et relation |
| Approval gate | Limite de confiance avant les écritures |
| Hashes | Vérifications d'intégrité avant les lectures |
| Ignore rules | Contrôles de confidentialité |
| Git | Historique d'audit et synchronisation |
| Agent adapters | Commodité, pas autorité |

## Priorité des Portées (Scopes)

Engram résout la mémoire dans cet ordre :

1. Mémoire de l'espace de travail (workspace) : `<projet>/.agents/.engram/`
2. Mémoire globale : `$ENGRAM_GLOBAL_DIR` ou `engram inject --global-path <chemin>`

La mémoire de l'espace de travail l'emporte. La mémoire globale sert de secours (fallback) pour les préférences réutilisables et le contexte d'équipe sur plusieurs projets.

## État Actuel

Engram comprend :

- `save` pour une seule mémoire approuvée.
- `save-session` / `ss` pour plusieurs mémoires issues d'une session, avec `--query-level <n>` facultatif pour exploiter jusqu'à n conversations récentes accessibles ; `/engram ss -a last 50 sessions` se normalise en `engram save-session --query-level 50 --accept-all`.
- `observe` pour les notes brutes qui ne sont pas encore de la mémoire active.
- `take-control` pour importer les directives et documentations existantes de l'agent.
- `graph` et `quality-check` pour les signaux de révision.
- `archive` pour les mémoires incorrectes ou obsolètes.
- `repair` pour les fichiers de mémoire mal formés ignorés par la reconstruction de l'index.
- `benchmark` pour les vérifications de régression lors de la récupération.
- Les ensembles de compétences de l'agent (skillsets), les adaptateurs slash et les outils de proposition de style MCP.

Avant d'utiliser les commandes, lisez la page conceptuelle : [Comprendre Engram](understanding.md).

Suivant : [Démarrage rapide pour agent d'IA](quickstart.md).
