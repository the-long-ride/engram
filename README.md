# Engram

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-orange)](LICENSE) [![GitHub](https://img.shields.io/badge/GitHub-Repository-orange?logo=github)](https://github.com/the-long-ride/engram) [![npm version](https://img.shields.io/npm/v/@the-long-ride/engram?color=orange&logo=npm)](https://www.npmjs.com/package/@the-long-ride/engram) [![npm](https://img.shields.io/badge/npm-Package-orange?logo=npm)](https://www.npmjs.com/package/@the-long-ride/engram)

![Engram cover](https://raw.githubusercontent.com/the-long-ride/engram/main/media/cover/engram-cover.png)

[English](README.md) | [Tiếng Việt](documentation/vi/README.md) | [Español](documentation/es/README.md) | [Français](documentation/fr/README.md) | [中文](documentation/zh/README.md) | [한국어](documentation/ko/README.md) | [日本語](documentation/ja/README.md) | [Русский](documentation/ru/README.md)

**Engram is a human-owned, file-first memory protocol for AI agents. Grow with you & your teams.**

It gives agents memory without giving agents ownership of memory. Durable rules, workflows, and project knowledge live as plain Markdown, reviewed by humans, portable through Git, and usable by any agent.

---

## Key Highlights

- **Human in the Loop**: AI proposes memory candidates; humans review and approve (A/B/C gate, automatable via rules).
- **Context-Optimized**: Routes and refines task-matching memories into a compact pack (default: 8 files) to avoid context bloat.
- **Git-Native & Portable**: Plain Markdown files stored in `.agents/.engram/` synced via Git—completely vendor-agnostic and offline-first.
- **Privacy & Security Control**: Runs 100% locally and scans for PII/secrets before writing.
- **Prerequisite Graphs**: Declares dependencies (`depends_on`) so agents load foundational rules before advanced tasks automatically.

---

### High-Level System Flow

```mermaid
graph TD
    %% Styling
    classDef default fill:#111,stroke:#333,stroke-width:1px,color:#fff;
    classDef human fill:#1a3a5f,stroke:#3182ce,stroke-width:2px,color:#fff;
    classDef agent fill:#2d3748,stroke:#4a5568,stroke-width:2px,color:#fff;
    classDef storage fill:#234e52,stroke:#319795,stroke-width:2px,color:#fff;
    classDef action fill:#2c5282,stroke:#4299e1,stroke-width:1px,color:#fff;

    User["👤 You (The User)"]:::human
    AI["🤖 AI Assistant (ChatGPT, Claude, Agents)"]:::agent

    subgraph Engram ["Engram Memory System"]
        Load["Recall Memory (engram load)"]:::action
        Propose["Suggest Memory (engram save)"]:::action
        Review["Approval Gate (You review & approve)"]:::action
    end

    subgraph Storage ["Durable Memory Storage (Plain Markdown Files)"]
        LocalStore["📁 Local Project Memory (.agents/.engram/)"]:::storage
        GlobalStore["🌐 Personal Global Memory ($ENGRAM_GLOBAL_DIR)"]:::storage
        SyncStore["☁️ Cloud / Git Sync (GitHub, Google Drive, OneDrive, etc.)"]:::storage
    end

    %% Interactions
    User <-->|Chat & Collaborate| AI
    AI -->|1. Load Context| Load
    Load -->|Read memories| LocalStore
    Load -->|Read preferences| GlobalStore
    LocalStore & GlobalStore -->|Provide memory context| AI

    AI -->|2. Suggest new memories| Propose
    Propose -->|Create draft memory| Review
    User -->|3. Approve or Reject| Review
    Review -->|4. Save as markdown| LocalStore
    Review -->|Optional save| GlobalStore
    LocalStore -->|5. Cloud backup & sync| SyncStore
    GlobalStore -->|5. Cloud backup & sync| SyncStore
```

---

## What It Is (The Contract)

- **Markdown is durable memory** — no hidden binary or proprietary formats.
- **JSON index, graph, and optional sqlite-vec sidecars** act as acceleration layers.
- **Approval is the trust boundary** — the core principle is that agents suggest, humans approve.
- **Hashes check integrity** and **Ignore rules handle privacy**.
- **Profiles isolate memory contexts** (personal, client, and corporate).
- **Git provides portability and audit history** — share rules across the team.
- **Agent adapters are convenience, not authority**.
- **Strict rules govern agent output** to prevent context drift and hallucinations.

---

## Why Engram Exists (Tactical Solutions)

Standard rule files get sent with every single message, bloating context, causing drift, leaking secrets, or locking you to cloud vendors. Engram moves memory into files to solve these problems:

| Tactical Challenge | Engram Answer |
| --- | --- |
| **Too many rules bloating context** | Routes and refines task-matching memory into a compact context pack, defaulting to 8 memories. |
| **Silent writes & secret leakage** | Requires human A/B/C approval and scans for secrets/injections. |
| **Vendor lock-in** | Uses plain, readable Markdown files portable across any agent or model. |
| **No offline access** | Runs locally as a lightweight file-based protocol—no server or internet required. |
| **Context drift in team projects** | Synchronizes rules and guidelines team-wide via Git. |
| **Broken or outdated memory** | Provides validation and cleanup utilities (`engram repair`, `engram quality-check`). |

---

## Example Use Cases

- **Personal & Professional**: Writing styles, personal preferences, checklists, vocabulary, templates, life principles.
- **Software Development**: Coding rules, architectural guidelines, debug scripts, troubleshooting, team onboarding.
- **Enterprise**: Security guardrails, compliance guidelines, brand tone, Git-based audit trails.

---

## Installation & Setup

### 1. Install Engram CLI
```bash
npm install -g @the-long-ride/engram
```

### 2. Link Engram to Your Agent
Instruct your AI assistant on how to interact with Engram (read, write, maintain):
```bash
# List supported agents
engram is list

# Link Engram globally to your agent (installs skillset + MCP)
engram is --global <your-agent>
```
*(Replace `<your-agent>` with your assistant name; use `agents-md` for unsupported agents that read `AGENTS.md`.)*

For Gemini / Antigravity surfaces:
```bash
engram link gemini
```

### 3. Initialize Workspace
Run this in the root of any project:
```bash
engram init
```
*Notice: creates local `.agents/.engram/`, prompts for global memory folder path, and allows optional submodules (`--submodule`) and cloud/remote sync config.*

---

## AI-Agent Quickstart

You can instruct your agent to use the following slash commands in chat:

- **Start of a task**: `/engram load "design pricing table component"`
- **Save key decisions/facts**: `/engram save knowledge "Webhook secret is process.env.STRIPE_WEBHOOK"`
- **Summarize & save session**: `/engram save-session` (or `--query-level 3`, or `ss -a last 50 sessions` to auto-approve)

---

## CLI Command vs. AI Agent Cheat Sheet

| Task | CLI Command | AI Agent Suggestion |
| --- | --- | --- |
| **Load Memory** | `engram load "<task>"` | `/engram load "<task>"` |
| **Dry Run Load** | `engram load --dry-run "<task>"` | `/engram load --dry-run "<task>"` |
| **Save Single Memory** | `engram save <type> "<text>"` | `/engram save <type> "<text>"` |
| **Propose Memories** | `engram save-session` | `/engram ss` |
| **Mine Recent Sessions** | `engram save-session --query-level <n>` | `/engram save-session --query-level <n>` |
| **Auto-Approve Saves** | `engram save-session --accept-all` | `/engram ss -a` |
| **Import Files / Docs** | `engram take-control --all` | `/engram take-control --all` |
| **Import & Metacognize** | `engram take-control --all --metacognize --accept-all` | `/engram take control accept all metacognize` |
| **Restructure Memory** | `engram metacognize --workspace` | `/engram restructure workspace memory accept all` |
| **Resolve Conflicts** | `engram resolve-conflicts --metacognize` | `/engram resolve conflicts and metacognize` |
| **Check Config / Paths** | `engram entry` | `/engram entry` |
| **Manage Profiles** | `engram profile status` / `create` / `use` | `/engram profile status` |
| **Configure Save Target** | `engram set-save-target <workspace/global/both>` | `/engram set-save-target <target>` |
| **Configure Load Limit** | `engram set-load-limit <1..32>` | `/engram set-load-limit <count>` |
| **Update Global Path** | `engram update-global-folder <new-path>` | `/engram set global memory path to <new-path>` |
| **Clone Memory** | `engram clone-memory <src> <dest>` | `/engram clone workspace memory to global` |
| **Set Active Roles** | `engram set-role <roles>` | `/engram set-role <roles>` |
| **Set Rule Strictness** | `engram set-rule-variant <variant>` | `/engram set-rule-variant <variant>` |
| **Verify & Repair** | `engram verify` / `engram repair` | `/engram verify` / `/engram repair` |
| **Scan Contradictions** | `engram quality-check` | `/engram quality-check` |
| **Sync Memories** | `engram sync` | `/engram sync` |

---

## Comparisons

### Compared With Agentmemory
[rohitg00/agentmemory](https://github.com/rohitg00/agentmemory) is an automatic, background-running server-style memory engine. Engram differs by focusing on file-based local Markdown, human review, and no background daemon overhead.

| Dimension | Engram | agentmemory |
| --- | --- | --- |
| Source of truth | Human-approved Markdown | Memory server/store |
| Trust boundary | A/B/C approval before writes | Automatic capture |
| Default shape | File protocol (no daemon) | Running service recommended |
| Review model | Git diff and Markdown review | Viewer/API/session history |
| Best for | Human-owned team memory | Automatic recall and replay |
| Main risk | Requires save discipline | Invisible state |

### Compared With Tolaria
[refactoringhq/tolaria](https://github.com/refactoringhq/tolaria) is a Markdown-first desktop app. Engram sits lower in the stack, providing a CLI, agent skillsets, and Git-native rules governance instead of a full GUI workspace.

| Dimension | Engram | Tolaria |
| --- | --- | --- |
| Source of truth | Memories in `.agents/.engram/` | Markdown vault notes |
| Primary interface | CLI, slash adapters, agent skill | Desktop app |
| Write model | Agents propose; humans approve | Humans directly manage Markdown |
| Best for | Auditable memory governance | Browsing and managing vaults |

### Compared With Obsidian
[Obsidian](https://obsidian.md/) is a rich personal note-taking desktop/mobile app. Engram is an agent memory protocol: much smaller in scope, strict about human approval, and designed to track agent instructions like code.

| Dimension | Engram | Obsidian |
| --- | --- | --- |
| Source of truth | Memories in `.agents/.engram/` | Local Markdown notes |
| Write model | Agents propose; humans approve | Directly edit notes |
| Best for | Auditable cross-agent memory | Note-taking and second brains |

### Compared With Hermes Agent
Hermes Agent uses an autonomous, always-on memory structure with hard caps, whereas Engram is human-owned by default (automatable via rules) with tag/graph-based on-demand routing.

| | Engram | Hermes Agent |
|---|---|---|
| **Philosophy** | Human-owned, file-first protocol (automation optional) | Autonomous, always-active memory |
| **Storage** | Typed Markdown files in `.agents/.engram/` | `MEMORY.md` + `USER.md` (hard char caps) |
| **Write model** | Human-approved by default (A/B/C gate; automatable via rules) | Agent writes autonomously |
| **Recall** | On-demand: `engram load "<task>"` injects relevant files | Always-on: core files frozen into system prompt each session |
| **Vector search** | Optional local sqlite-vec | Via external provider (agentmemory) |
| **Overhead** | No daemon, requires save discipline (unless automated) | Server process + viewer UI, REST API, MCP server |

### Compared With Built-In Agent Memory
Built-in memory (ChatGPT, Claude Projects, Cursor rules) is siloed and invisible. Engram treats local files as the source of truth, offering team sharing via Git, scanning for secrets, and multi-agent portability.

| Dimension | Engram | Built-In Agent Memory |
| --- | --- | --- |
| **Portability** | Plain Markdown readable by any agent | Locked to a single platform |
| **Human Control** | Explicit A/B/C approval before writes | Silent background updates |
| **Collaboration** | Git-friendly team sharing | Single-user only |
| **Security** | Local-first, scans for PII/secrets | Cloud-first, high risk of secret leakage |

---

## Documentation

Full documentation lives in `documentation/`:
- [English](documentation/en/index.md) | [Tiếng Việt](documentation/vi/index.md) | [Español](documentation/es/index.md) | [Français](documentation/fr/index.md) | [中文](documentation/zh/index.md) | [한국어](documentation/ko/index.md) | [日本語](documentation/ja/index.md) | [Русский](documentation/ru/index.md)

## Roadmap & Companion Project
We are working on **Documentation site**, **AI Web Chat Integration** and **Improving Natural Language Command Mapping**. 
For visual Markdown vault navigation, use [Markdown Explorer](https://the-long-ride.github.io/markdown-explorer/).

## License & Changelog
Licensed under [GPL-3.0](LICENSE). See [Changelog](https://github.com/the-long-ride/engram/blob/main/CHANGELOG.md).
