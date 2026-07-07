import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    {
      type: 'category',
      label: 'Get Started',
      collapsed: false,
      items: ['intro', 'quickstart', 'install', 'daily-workflow'],
    },
    {
      type: 'category',
      label: 'Core Concepts',
      collapsed: false,
      items: [
        'concepts/protocol',
        'concepts/memory-types',
        'concepts/scopes',
        'concepts/profiles',
        'concepts/read-path',
        'concepts/write-path',
        'concepts/safety',
      ],
    },
    {
      type: 'category',
      label: 'Entry Web UI',
      collapsed: false,
      items: [
        'entry/index',
        'entry/launch',
        'entry/connections',
        'entry/construct',
        'entry/profiles',
        'entry/workspaces',
        'entry/core',
        'entry/memories',
        'entry/runtime',
        'entry/field-reference',
        'entry/field-authoring-guidelines',
      ],
    },
    {
      type: 'category',
      label: 'Agent Integrations',
      collapsed: false,
      items: [
        'integrations/overview',
        'integrations/codex',
        'integrations/claude',
        'integrations/gemini',
        'integrations/cursor',
        'integrations/windsurf',
        'integrations/opencode',
        'integrations/copilot',
        'integrations/cline',
        'integrations/slash',
        'integrations/mcp',
        'integrations/hooks',
      ],
    },
    {
      type: 'category',
      label: 'CLI Reference',
      collapsed: true,
      items: [
        'cli/overview',
        'cli/load-search-graph',
        'cli/save-session',
        'cli/inject-link-upgrade',
        'cli/profiles-workspaces-config',
        'cli/verify-repair-quality',
        'cli/sync-archive',
      ],
    },
    {
      type: 'category',
      label: 'Operations',
      collapsed: true,
      items: [
        'operations/team-git-workflow',
        'operations/release-upgrade',
        'operations/troubleshooting',
        'operations/faq',
        'operations/changelog',
      ],
    },
    {
      type: 'category',
      label: 'Compare',
      collapsed: true,
      items: [
        'comparison/overview',
        'comparison/built-in-memory',
        'comparison/agentmemory',
        'comparison/obsidian',
        'comparison/tolaria',
        'comparison/hermes-agent',
      ],
    },
  ],
};

export default sidebars;
