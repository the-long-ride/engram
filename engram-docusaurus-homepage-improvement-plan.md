# Engram Docusaurus Homepage Improvement Plan

> Target repo: `https://github.com/the-long-ride/engram`  
> Current homepage: `https://the-long-ride.github.io/engram/`  
> Goal: turn the homepage into a clearer product landing page while keeping documentation deep, technical, and versionable.

---

## 1. Executive Recommendation

Build a dedicated Docusaurus `website/` app inside the existing repo and make `/` a polished product homepage.

Do **not** turn the homepage into another README. The README is already technical and detailed. The homepage should help a new visitor understand Engram in 10 seconds:

```txt
Engram is a local-first, file-first memory layer for AI coding agents.
It lets agents remember project knowledge without owning the memory.
Humans approve writes, Markdown stores the truth, Git tracks history.
```

Recommended homepage role:

| Page | Purpose |
|---|---|
| `/` | Product landing page: value, trust, quick demo, CTA |
| `/docs/quickstart` | First real setup path |
| `/docs/concepts` | Mental model and protocol |
| `/docs/agents` | Codex, Claude, Gemini, Cursor, Windsurf, OpenCode, Copilot, Cline |
| `/docs/security` | Local-first, approval, ignore rules, secret scanning |
| `/docs/reference` | Full CLI / MCP / config reference |

---

## 2. Current State Observations

### What is already good

The current homepage already has strong raw material:

- Clear product name: **Engram**
- Short tagline: **Human-owned memory for AI agents**
- Clear problem statements:
  - agents forget
  - built-in memory is siloed
  - silent writes are unsafe
- Strong solution statement:
  - memory lives as reviewed Markdown files
  - humans own it
  - Git tracks it
  - any agent can read it
- Quick install command is visible
- Supported agents are listed
- Architecture diagram exists
- CTA exists: **Start with the Quickstart**

### Main problem

The homepage currently feels more like a compact documentation/README page than a product landing page.

It explains the system, but it does not yet create enough immediate desire or confidence for a first-time visitor.

### Repo-specific note

The root `package.json` currently contains the CLI package metadata and build scripts for Engram. It includes `build`, `typecheck`, `test`, `lint`, `publish`, and related package scripts, plus React dependencies. It does not appear to include Docusaurus dependencies in the root package. Therefore, add Docusaurus as a separate `website/` workspace/app instead of mixing it into the CLI package root.

Recommended:

```txt
engram/
├─ src/                  # current Engram CLI / app source
├─ docs/                 # current technical docs / integrations
├─ documentation/        # current multilingual docs source
├─ website/              # new Docusaurus site
│  ├─ docs/
│  ├─ src/
│  ├─ static/
│  ├─ docusaurus.config.ts
│  └─ package.json
└─ package.json          # keep existing package scripts safe
```

---

## 3. New Homepage Strategy

### Homepage goal

The homepage should answer these questions in this order:

1. What is Engram?
2. Why should I care?
3. Why is it safer than built-in agent memory?
4. How does it work?
5. How do I try it now?
6. Can I trust it with my projects?

### Recommended positioning

Use this as the main product positioning:

```txt
File-first memory for AI coding agents.
```

Use this as the supporting sentence:

```txt
Engram stores durable agent memory as reviewed Markdown, routes only the relevant context, and keeps humans in control of every write.
```

Use this as a stronger trust line:

```txt
Local-first. Git-native. Human-approved. Cross-agent.
```

---

## 4. Recommended Homepage Sections

### Section 1 — Hero

Current hero is good but too short. Make it more specific.

Recommended hero:

```txt
Engram
File-first memory for AI coding agents.

Give Codex, Claude, Gemini, Cursor, Windsurf, OpenCode, Copilot, and Cline durable project memory without handing ownership of memory to the agent.

Reviewed Markdown is the source of truth. Git tracks history. Humans approve every write.
```

Primary CTA:

```txt
Get Started
```

Secondary CTA:

```txt
View GitHub
```

Third optional CTA:

```txt
See How It Works
```

Hero badges:

```txt
Local-first
Markdown source of truth
Human approval gate
Git-native
MCP-ready
```

---

### Section 2 — Problem / Pain

Keep this close to the top. The current homepage already has this, but make it more visual and outcome-focused.

Recommended cards:

| Problem | Better homepage wording |
|---|---|
| Agents forget | Agents repeat decisions, setup rules, and project constraints. |
| Built-in memory is siloed | Memory gets trapped inside one vendor, model, app, or machine. |
| Silent writes are unsafe | Bad memory can poison future work if agents write without review. |
| Rule files bloat context | Big `AGENTS.md` / rule files get sent too often and create context drift. |

---

### Section 3 — Engram Fixes It

Make this section the emotional center of the page.

Recommended copy:

```txt
Engram turns memory into reviewed files.

Agents can propose rules, workflows, and knowledge.
Humans approve what becomes durable.
Engram stores it as Markdown, indexes it, routes only what matters, and keeps it portable through Git.
```

Use 4 feature cards:

| Feature | Message |
|---|---|
| Human-approved writes | Agents propose. Humans approve, edit, reject, or archive. |
| File-first memory | Markdown is the durable source of truth. No hidden memory database. |
| Context-optimized loading | Route a compact memory pack instead of sending everything. |
| Cross-agent routing | One memory source can support multiple AI coding tools. |

---

### Section 4 — Show the Workflow

The homepage needs one concrete demo. This is more important than a large architecture diagram.

Recommended 3-step visual:

```txt
1. Load relevant memory
   /engram load --for-agents "release workflow"

2. Work with your agent
   The agent receives only the compact memory pack needed for this task.

3. Approve durable memory
   The agent proposes TYPE/TEXT candidates. You approve, audit, or cancel.
```

Recommended code demo block:

```bash
npm install -g @the-long-ride/engram
engram entry
engram inject
```

Then show the agent-first usage:

```text
Use Engram for this task. Load memory for: refactor the release workflow.
```

Why this matters:

- Visitors see the product in action immediately.
- The homepage becomes easier to understand than the README.
- It creates confidence before sending users to docs.

---

### Section 5 — Entry Web UI Preview

The README mentions a premium web interface with tabs like **Connections**, **Construct**, **Core**, and **Memories**. The homepage should visually show this.

Recommended homepage subsection:

```txt
Configure memory without digging through config files.
```

Cards:

| Entry UI area | Homepage explanation |
|---|---|
| Connections | Link Engram to local AI agents and managed hooks. |
| Construct | Configure load limits, rule variants, profiles, and sync behavior. |
| Core | Review duplicate candidates and memory quality. |
| Memories | Explore active memories, tags, and dependency edges. |

Add a screenshot strip:

```txt
static/img/homepage/entry-connections.png
static/img/homepage/entry-construct.png
static/img/homepage/entry-core.png
static/img/homepage/entry-memories.png
```

If screenshots are not ready, use styled placeholder panels first.

---

### Section 6 — Supported Agents

Current homepage lists agents, but it can be more useful.

Recommended table:

| Agent / Host | Best integration message |
|---|---|
| Codex | Load memory and propose durable rules during coding sessions. |
| Claude | Use memory packs, MCP, and approval flows. |
| Gemini / Antigravity | Route workspace memory for Google/Gemini-style agent surfaces. |
| Cursor | Use generated rules and available hook surfaces. |
| Windsurf / Cascade | Use rules and MCP where hook injection is limited. |
| OpenCode | Use plugin, skills, MCP config, and global/workspace linking. |
| GitHub Copilot | Use instruction files and skills where supported. |
| Cline | Use generated agent instructions and memory protocol. |
| MCP | Expose Engram load/search/proposal tools to compatible hosts. |

Add one line under the table:

```txt
Engram treats adapters as convenience. Markdown remains the authority.
```

---

### Section 7 — Comparison

Add a simple comparison near the middle or lower part of the homepage.

| Approach | Problem | Engram advantage |
|---|---|---|
| Built-in agent memory | Locked to one vendor/app | Portable Markdown + Git |
| Huge rule files | Context bloat and drift | Routed compact memory pack |
| Manual notes | Not agent-routable | Indexed and searchable memory |
| Auto-write memory | Unsafe silent updates | Human approval gate |
| Hidden local DB | Hard to audit | Files are the source of truth |

This section will help people understand the category quickly.

---

### Section 8 — Security / Trust

Engram’s trust model is one of the strongest product points. It should be highly visible.

Recommended section title:

```txt
Built for memory you can audit.
```

Recommended bullets:

- Local-first by default
- Markdown source of truth
- Human approval before durable writes
- PII / secret scanning before writes
- Ignore rules for private context
- Git history for review and rollback
- Profiles to isolate personal, client, and company memory

Add CTA:

```txt
Read the Security Model
```

---

### Section 9 — Architecture

The current homepage has an architecture diagram. Keep architecture, but simplify it.

Homepage version:

```txt
Agent request
  ↓
Engram routes relevant Markdown memory
  ↓
Agent works with compact context
  ↓
Agent proposes durable memory
  ↓
Human approves
  ↓
Markdown + Git become source of truth
```

Move the detailed Mermaid architecture to:

```txt
/docs/architecture
```

Reason:

- Large diagrams are good for technical docs.
- They are too dense for first-time homepage readers.
- Homepage should sell clarity first, depth second.

---

### Section 10 — Final CTA

Recommended final CTA:

```txt
Ready to own your agent's memory?
```

Subtext:

```txt
Install Engram, connect your agent, and start routing reviewed Markdown memory in your next coding session.
```

Buttons:

```txt
Start Quickstart
View on GitHub
Read the Protocol
```

---

## 5. Recommended Navbar

Current nav is minimal. Improve it for product discovery.

Recommended homepage navbar:

```txt
Engram
Product
Docs
Quickstart
Agents
Security
GitHub
```

For Docusaurus docs pages, keep version and language dropdowns. On the homepage, reduce visual noise from version/language controls if possible.

Recommended behavior:

| Area | Navigation behavior |
|---|---|
| Homepage | Simple marketing/product nav |
| Docs pages | Full docs sidebar + version dropdown + language dropdown |
| Footer | GitHub, Issues, License, Changelog, npm, Security |

---

## 6. Recommended Docusaurus Architecture

Add Docusaurus under `website/`.

```txt
website/
├─ docs/
│  ├─ intro.md
│  ├─ quickstart.md
│  ├─ concepts/
│  │  ├─ memory-model.md
│  │  ├─ approval-gate.md
│  │  ├─ routing.md
│  │  └─ profiles.md
│  ├─ agents/
│  │  ├─ codex.md
│  │  ├─ claude.md
│  │  ├─ gemini.md
│  │  ├─ cursor.md
│  │  ├─ windsurf.md
│  │  ├─ opencode.md
│  │  ├─ copilot.md
│  │  └─ cline.md
│  ├─ security/
│  │  ├─ local-first.md
│  │  ├─ approval.md
│  │  ├─ secrets-and-pii.md
│  │  └─ git-audit.md
│  ├─ reference/
│  │  ├─ cli.md
│  │  ├─ mcp.md
│  │  ├─ config.md
│  │  └─ file-format.md
│  └─ roadmap.md
├─ src/
│  ├─ pages/
│  │  └─ index.tsx
│  ├─ components/
│  │  ├─ HomepageHero/
│  │  ├─ ProblemGrid/
│  │  ├─ WorkflowDemo/
│  │  ├─ EntryUIPreview/
│  │  ├─ AgentGrid/
│  │  ├─ TrustSection/
│  │  └─ CTASection/
│  └─ css/
│     └─ custom.css
├─ static/
│  └─ img/
│     ├─ logo.svg
│     ├─ og-image.png
│     └─ homepage/
├─ docusaurus.config.ts
├─ sidebars.ts
└─ package.json
```

Why `src/pages/index.tsx`:

- The homepage needs a custom product layout.
- Docusaurus standalone pages are designed for custom one-off pages.
- Docs pages are better for sidebars and deep reference content.

---

## 7. Homepage Component Plan

### `HomepageHero`

Purpose:

- State category clearly.
- Add trust badges.
- Provide primary CTA.

Content:

```txt
File-first memory for AI coding agents.
```

CTA:

```txt
Get Started
View GitHub
```

---

### `ProblemGrid`

Purpose:

- Show pain points quickly.

Cards:

```txt
Agents forget
Memory is siloed
Silent writes are unsafe
Rule files bloat context
```

---

### `WorkflowDemo`

Purpose:

- Explain how Engram works using commands and natural language.

Layout:

```txt
Left: 3-step workflow
Right: terminal/code card
```

---

### `EntryUIPreview`

Purpose:

- Promote `engram entry` visually.

Use screenshots or styled placeholders:

```txt
Connections
Construct
Core
Memories
```

---

### `AgentGrid`

Purpose:

- Show that Engram is cross-agent.

Supported names:

```txt
Codex, Claude, Gemini, Cursor, Windsurf, OpenCode, Copilot, Cline, MCP
```

---

### `TrustSection`

Purpose:

- Make safety and ownership a major product advantage.

Cards:

```txt
Local-first
Human-approved
Git-native
Secret-aware
Profile-isolated
Markdown-owned
```

---

### `CTASection`

Purpose:

- Convert visitors to quickstart/GitHub.

Copy:

```txt
Own your agent's memory.
Start with one workspace and one agent.
```

---

## 8. Suggested Copy for the New Homepage

### Hero

```md
# File-first memory for AI coding agents

Engram gives Codex, Claude, Gemini, Cursor, Windsurf, OpenCode, Copilot, and Cline durable project memory without giving agents ownership of memory.

Reviewed Markdown is the source of truth. Git tracks history. Humans approve every write.

[Get Started] [View GitHub]
```

### Problem

```md
## Agents should remember. They should not silently own memory.

AI coding agents forget decisions, repeat setup questions, and mix stale context with new instructions. Built-in memory is often trapped inside one vendor, one app, or one machine. Big rule files create context bloat. Silent memory writes can poison future work.
```

### Solution

```md
## Engram turns memory into reviewed files

Agents propose durable rules, workflows, and knowledge. Humans approve what becomes memory. Engram stores it as Markdown, indexes it, routes only the relevant context, and keeps it portable through Git.
```

### Workflow

```md
## How it works

1. Load memory for the task.
2. Work with your agent using a compact context pack.
3. Approve useful new memory before it becomes durable.
```

### Trust

```md
## Built for memory you can audit

Engram is local-first, Git-native, and human-approved. Markdown is the source of truth. Indexes, graphs, hashes, and optional vector sidecars are acceleration layers, not hidden authority.
```

---

## 9. Visual Design Direction

Recommended style:

```txt
Developer-trust landing page
Clean dark/light mode
Slightly premium UI
Code-first demo
Simple diagrams
Minimal animation
```

Avoid:

```txt
Too many gradients
Huge hero illustration without product proof
Generic AI buzzwords
Architecture overload above the fold
Too much README content on homepage
```

Recommended color feel:

| Token | Direction |
|---|---|
| Primary | Cyan / blue technical trust |
| Accent | Green for local/safe/approved states |
| Background | Dark navy + clean light mode |
| Cards | Slight border, subtle shadow, high contrast |
| Code blocks | Terminal-style, readable, copyable |

---

## 10. SEO and Metadata Improvements

Add strong metadata in `docusaurus.config.ts`.

Recommended title:

```txt
Engram — File-first memory for AI coding agents
```

Recommended description:

```txt
Engram is a local-first, human-approved memory layer for AI agents. Store durable project knowledge as Markdown, route relevant context, and sync memory through Git.
```

Recommended keywords:

```txt
AI agent memory, coding agent memory, local-first AI, Markdown memory, MCP memory, Codex memory, Claude memory, Cursor rules, OpenCode plugin, agent memory protocol
```

Recommended Open Graph image:

```txt
static/img/og-image.png
```

OG image should contain:

```txt
Engram
File-first memory for AI coding agents
Local-first • Human-approved • Git-native
```

---

## 11. Migration Plan

### Phase 1 — Safe Docusaurus setup

Goal: create Docusaurus without touching current package behavior.

Tasks:

1. Create `website/` using Docusaurus classic TypeScript template.
2. Configure GitHub Pages path:
   - `url: 'https://the-long-ride.github.io'`
   - `baseUrl: '/engram/'`
   - `organizationName: 'the-long-ride'`
   - `projectName: 'engram'`
3. Keep existing root `npm run build` behavior untouched.
4. Add separate scripts:

```json
{
  "docs:dev": "npm --prefix website start",
  "docs:build": "npm --prefix website build",
  "docs:serve": "npm --prefix website serve"
}
```

Acceptance criteria:

- Existing Engram build still passes.
- `website/` can build independently.
- Homepage loads at `/engram/` locally with correct base URL.

---

### Phase 2 — Homepage landing page

Goal: replace current README-like homepage with a stronger product page.

Tasks:

1. Create `website/src/pages/index.tsx`.
2. Add homepage components:
   - `HomepageHero`
   - `ProblemGrid`
   - `WorkflowDemo`
   - `EntryUIPreview`
   - `AgentGrid`
   - `TrustSection`
   - `CTASection`
3. Add homepage CSS modules.
4. Add screenshots/placeholders.
5. Add final CTA.

Acceptance criteria:

- Visitor understands product in 10 seconds.
- CTA points to Quickstart and GitHub.
- Homepage is not overloaded with reference docs.
- Mobile layout is readable.

---

### Phase 3 — Docs restructuring

Goal: make docs easier to navigate.

Tasks:

1. Keep current multilingual content as source material.
2. Create English docs first.
3. Split dense README sections into docs:
   - Concepts
   - Quickstart
   - Agent integrations
   - Security
   - CLI reference
   - Architecture
   - Comparison
4. Add sidebar categories.
5. Add versioning only after first Docusaurus docs are stable.

Acceptance criteria:

- Quickstart is under 5 minutes.
- Concepts explain the memory model clearly.
- CLI reference is complete but not mixed into the homepage.
- Agent pages are separated by host.

---

### Phase 4 — i18n and versioning

Goal: restore/improve language and version support.

Tasks:

1. Add Docusaurus i18n config.
2. Start with existing languages:
   - English
   - Vietnamese
   - Spanish
   - French
   - Chinese
   - Korean
   - Japanese
   - Russian
3. Keep English as canonical first.
4. Add versioning for stable releases only.

Acceptance criteria:

- Language selector works.
- Version selector works in docs area.
- Homepage copy is translated only after English positioning is stable.

---

## 12. Suggested Docs Sidebar

```ts
const sidebars = {
  docs: [
    'intro',
    'quickstart',
    {
      type: 'category',
      label: 'Concepts',
      items: [
        'concepts/memory-model',
        'concepts/approval-gate',
        'concepts/routing',
        'concepts/profiles',
      ],
    },
    {
      type: 'category',
      label: 'Agents',
      items: [
        'agents/codex',
        'agents/claude',
        'agents/gemini',
        'agents/cursor',
        'agents/windsurf',
        'agents/opencode',
        'agents/copilot',
        'agents/cline',
        'agents/mcp',
      ],
    },
    {
      type: 'category',
      label: 'Security & Privacy',
      items: [
        'security/local-first',
        'security/approval',
        'security/secrets-and-pii',
        'security/git-audit',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      items: [
        'reference/cli',
        'reference/mcp',
        'reference/config',
        'reference/file-format',
      ],
    },
    'architecture',
    'comparison',
    'roadmap',
  ],
};

export default sidebars;
```

---

## 13. Recommended Priority Order

| Priority | Improvement | Why |
|---|---|---|
| P0 | Stronger hero message | First-time users need instant clarity. |
| P0 | Add concrete workflow demo | Product becomes understandable fast. |
| P0 | Move detailed architecture lower/docs | Reduce homepage cognitive load. |
| P1 | Add Entry UI preview | Makes product feel real and usable. |
| P1 | Add comparison table | Clarifies category and differentiation. |
| P1 | Add Security/Trust section | Engram's strongest advantage is ownership/safety. |
| P2 | Add agent-specific pages | Improves SEO and support clarity. |
| P2 | Add OG image and metadata | Better sharing on GitHub/social. |
| P3 | Full i18n homepage polish | Valuable after English homepage is stable. |
| P3 | Versioned docs | Useful after docs structure settles. |

---

## 14. Concrete Homepage Wireframe

```txt
[Navbar]
Engram | Product | Docs | Quickstart | Agents | Security | GitHub

[Hero]
File-first memory for AI coding agents.
Subtext: local-first, human-approved, Markdown source of truth.
Buttons: Get Started / View GitHub
Badges: Local-first / Git-native / MCP-ready / Cross-agent

[Problem]
Agents forget | Memory is siloed | Silent writes are unsafe | Rule files bloat context

[Solution]
Engram turns memory into reviewed files.
4 cards: Approval / Markdown / Routing / Cross-agent

[Workflow Demo]
1. Load memory
2. Work with compact context
3. Approve durable memory
Code block with install + agent-first usage

[Entry UI Preview]
Connections | Construct | Core | Memories
Screenshots or styled mock panels

[Supported Agents]
Codex / Claude / Gemini / Cursor / Windsurf / OpenCode / Copilot / Cline / MCP

[Comparison]
Built-in memory vs AGENTS.md vs manual notes vs Engram

[Trust]
Local-first / secret scanning / ignore rules / profile isolation / Git audit

[Final CTA]
Ready to own your agent's memory?
Start Quickstart / GitHub / Protocol

[Footer]
Docs / GitHub / Issues / License / npm / Changelog
```

---

## 15. Homepage Acceptance Criteria

The new homepage is successful when:

- A new user understands Engram in under 10 seconds.
- The hero clearly says what category Engram belongs to.
- The page shows one concrete usage flow.
- Trust/safety is visible before the bottom of the page.
- The architecture diagram does not overwhelm the first screen.
- Users can reach Quickstart in one click.
- Users can reach GitHub in one click.
- Mobile layout remains clean.
- Homepage and docs have different jobs.
- Existing CLI package build remains unaffected.

---

## 16. References Used

- Current homepage: `https://the-long-ride.github.io/engram/`
- Repository: `https://github.com/the-long-ride/engram`
- Docusaurus creating pages: `https://docusaurus.io/docs/creating-pages`
- Docusaurus styling/layout: `https://docusaurus.io/docs/styling-layout`
- Docusaurus versioning: `https://docusaurus.io/docs/versioning`
- Docusaurus config: `https://docusaurus.io/docs/api/docusaurus-config`
