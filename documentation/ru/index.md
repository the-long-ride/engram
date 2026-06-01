# Engram

Engram - это протокол памяти для AI agents, которым владеет человек. Он хранит долговечные знания проекта, команды и личных предпочтений в файлах, которые можно читать, ревьюить, синхронизировать и чинить.

Engram не является скрытым мозгом agent. Agent может предлагать memory, но source of truth - это одобренный Markdown в `.agents/.engram/` или в опциональной global memory.

## Какую Проблему Он Решает

AI agents забывают решения проекта, повторяют вопросы о настройке и смешивают старый контекст с новыми инструкциями. Встроенная память часто привязана к одному провайдеру, приложению или устройству.

Engram дает стабильный контракт:

- approved facts, rules, workflows живут в Markdown
- index и graph ускоряют routing
- любые записи требуют human approval
- hashes проверяют целостность
- ignore rules управляют приватностью
- Git дает историю, переносимость и team review

## Mental Model

| Layer | Role |
| --- | --- |
| Markdown | durable source of truth |
| JSON index | fast lookup |
| JSON graph | topic/relationship routing |
| Approval gate | trust boundary |
| Hashes | integrity checks |
| Ignore rules | privacy controls |
| Git | audit history and sync |
| Agent adapters | convenience, not authority |

## Priority Scope

1. Workspace memory: `<project>/.agents/.engram/`
2. Global memory: `$ENGRAM_GLOBAL_DIR` или `engram init --global-path <path>`

Workspace имеет приоритет. Global - fallback для переиспользуемых предпочтений и командного контекста.

## Что Есть Сейчас

- `save` для одной одобренной memory
- `save-session` / `ss` для нескольких memories из session
- `observe` для raw notes, которые еще не active memory
- `take-control` для импорта guidance/docs
- `graph` и `quality-check` для review signals
- `archive` для wrong/stale memory
- `repair` для invalid memory files, пропущенных rebuild
- `benchmark` для retrieval regression checks
- agent skillsets, slash adapters, MCP-style proposal tools

Перед командами прочитайте concept page: [Понять Engram](understanding.md).

Далее: [AI-agent quickstart](quickstart.md).
