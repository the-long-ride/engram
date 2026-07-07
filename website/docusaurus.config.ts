import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Engram',
  tagline: 'Human-owned memory for AI agents.',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://the-long-ride.github.io',
  baseUrl: '/engram/',
  trailingSlash: false,

  organizationName: 'the-long-ride',
  projectName: 'engram',

  // onBrokenLinks is set to 'warn' to support relative .md links in fallback files
  // when translating only a subset of files in non-default locales (known Docusaurus v3 limitation).
  // This preserves file-level relative link compatibility in GitHub and editors.
  onBrokenLinks: 'warn',
  onBrokenAnchors: 'warn',

  markdown: {
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'vi', 'es', 'fr', 'zh', 'ko', 'ja', 'ru'],
    localeConfigs: {
      en: {label: 'English'},
      vi: {label: 'Tiếng Việt'},
      es: {label: 'Español'},
      fr: {label: 'Français'},
      zh: {label: '中文'},
      ko: {label: '한국어'},
      ja: {label: '日本語'},
      ru: {label: 'Русский'},
    },
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          lastVersion: '0.0.25',
          includeCurrentVersion: true,
          onlyIncludeVersions: ['current', '0.0.25'],
          versions: {
            current: {
              label: 'Future',
              path: 'future',
              banner: 'unreleased',
              badge: true,
            },
            '0.0.25': {
              label: '0.0.25',
              path: '/',
              banner: 'none',
              badge: false,
            },
          },
          editUrl: 'https://github.com/the-long-ride/engram/tree/main/website/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        language: ['en'],
        indexDocs: true,
        indexBlog: false,
        docsRouteBasePath: '/docs',
      },
    ],
  ],

  themeConfig: {
    image: 'img/engram-cover.png',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Engram',
      logo: {
        alt: 'Engram logo',
        src: 'img/logo.svg',
        srcDark: 'img/logo-light.svg',
      },
      items: [
        {type: 'docSidebar', sidebarId: 'docs', position: 'left', label: 'Docs'},
        {to: '/docs/quickstart', label: 'Quickstart', position: 'left'},
        {type: 'docsVersionDropdown', position: 'right'},
        {type: 'localeDropdown', position: 'right'},
        {
          href: 'https://github.com/the-long-ride/engram',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {label: 'Quickstart', to: '/docs/quickstart'},
            {label: 'Protocol', to: '/docs/concepts/protocol'},
            {label: 'CLI Reference', to: '/docs/cli/overview'},
            {label: 'Entry Web UI', to: '/docs/entry'},
          ],
        },
        {
          title: 'Community',
          items: [
            {label: 'GitHub', href: 'https://github.com/the-long-ride/engram'},
            {label: 'Issues', href: 'https://github.com/the-long-ride/engram/issues'},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} The Long Ride. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
