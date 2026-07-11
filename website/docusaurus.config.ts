import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const baseUrl = '/engram/';
const docsCopy = {
  currentVersionPath: 'future',
  publishedVersionLabel: '0.0.25',
  publishedVersionName: 'version-0.0.25',
} as const;

const config: Config = {
  title: 'Engram',
  tagline: 'Human-owned memory for AI agents.',

  headTags: [
    {
      tagName: 'link',
      attributes: {
        rel: 'icon',
        type: 'image/svg+xml',
        href: `${baseUrl}img/favicon-light.svg`,
        media: '(prefers-color-scheme: light)',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'icon',
        type: 'image/svg+xml',
        href: `${baseUrl}img/favicon-dark.svg`,
        media: '(prefers-color-scheme: dark)',
      },
    },
  ],

  url: 'https://the-long-ride.github.io',
  baseUrl,
  trailingSlash: false,
  staticDirectories: ['static', 'docs', 'versioned_docs'],

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
          lastVersion: docsCopy.publishedVersionLabel,
          includeCurrentVersion: true,
          onlyIncludeVersions: ['current', docsCopy.publishedVersionLabel],
          versions: {
            current: {
              label: 'Future',
              path: docsCopy.currentVersionPath,
              banner: 'unreleased',
              badge: true,
            },
            [docsCopy.publishedVersionLabel]: {
              label: docsCopy.publishedVersionLabel,
              path: '/',
              banner: 'none',
              badge: false,
            },
            },
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  customFields: {
    docsCopy,
  },

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
        href: 'https://the-long-ride.github.io/engram/',
        target: '_self',
      },
      items: [
        {type: 'docSidebar', sidebarId: 'docs', position: 'left', label: 'Docs'},
        {to: '/docs/quickstart', label: 'Quickstart', position: 'left'},
        {type: 'docsVersionDropdown', position: 'right'},
        {type: 'localeDropdown', position: 'right'},
      ],
    },
    footer: {
      style: 'dark',
      copyright: `Copyright © ${new Date().getFullYear()} the-long-ride — <a href="https://github.com/the-long-ride/engram/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">GPL-3.0 License</a> — <a href="https://github.com/the-long-ride/engram" target="_blank" rel="noopener noreferrer">GitHub</a> — <a href="https://github.com/the-long-ride/engram/issues" target="_blank" rel="noopener noreferrer">Issues</a>`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.vsDark,
      additionalLanguages: ['bash', 'json', 'yaml', 'markdown', 'diff', 'typescript', 'python'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
