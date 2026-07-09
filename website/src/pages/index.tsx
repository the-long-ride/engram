import React, { type ReactNode } from 'react';
import ThemedImage from '@theme/ThemedImage';
import useBaseUrl from '@docusaurus/useBaseUrl';

import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Heading from '@theme/Heading';
import styles from './index.module.css';
import { translations } from '../data/translations';

// SVG Icons for visual excellence
const ShieldIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const GitIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="18" r="3"/>
    <circle cx="6" cy="6" r="3"/>
    <circle cx="6" cy="18" r="3"/>
    <path d="M18 15V9a4 4 0 0 0-4-4H9"/>
    <line x1="6" y1="9" x2="6" y2="15"/>
  </svg>
);

const FileTextIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);

const UserCheckIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="8.5" cy="7" r="4"/>
    <polyline points="17 11 19 13 23 9"/>
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

function HeroSection() {
  const { i18n: { currentLocale } } = useDocusaurusContext();
  const t = translations[currentLocale] || translations.en;

  return (
    <header className={styles.heroSection}>
      <div className={styles.heroGlow} />
      <div className="container">
        <div className={styles.badgeRow}>
          <span className={styles.heroBadge}><span className={styles.badgeDotSuccess} /> {t.hero.badgeLocalFirst}</span>
          <span className={styles.heroBadge}><span className={styles.badgeDotInfo} /> {t.hero.badgeMarkdownTruth}</span>
          <span className={styles.heroBadge}><span className={styles.badgeDotWarning} /> {t.hero.badgeHumanApproved}</span>
          <span className={styles.heroBadge}><span className={styles.badgeDotPurple} /> {t.hero.badgeCrossAgent}</span>
          <span className={styles.heroBadge}><span className={styles.badgeDotCyan} /> {t.hero.badgeMcpReady}</span>
        </div>
        <Heading as="h1" className={styles.heroTitle}>
          {t.hero.title.split('\n').map((line, idx) => (
            <React.Fragment key={idx}>
              {line}
              {idx < t.hero.title.split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </Heading>
        <p className={styles.heroSubtitle}>
          {t.hero.subtitle}
        </p>
        <div className={styles.heroButtons}>
          <Link className="button button--primary button--lg" to="/docs/quickstart">
            {t.hero.btnGetStarted}
            <span style={{ marginLeft: '8px', display: 'inline-flex', alignItems: 'center' }}>
              <ArrowRightIcon />
            </span>
          </Link>
          <Link className="button button--outline button--lg" to="https://github.com/the-long-ride/engram">
            {t.hero.btnViewGitHub}
          </Link>
        </div>
      </div>
    </header>
  );
}

function ProblemSection() {
  const { i18n: { currentLocale } } = useDocusaurusContext();
  const t = translations[currentLocale] || translations.en;

  return (
    <section className={styles.sectionDark} style={{ borderBottom: '1px solid var(--geist-gray-alpha-200)' }}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>{t.problems.tag}</span>
          <Heading as="h2" className={styles.sectionHeading}>
            {t.problems.heading.split('\n').map((line, idx) => (
              <React.Fragment key={idx}>
                {line}
                {idx < t.problems.heading.split('\n').length - 1 && <br />}
              </React.Fragment>
            ))}
          </Heading>
        </div>
        <div className={styles.problemGrid}>
          {t.problems.items.map((prob, i) => (
            <div key={i} className={styles.problemCard}>
              <div className={styles.cardHeader}>
                <span className={styles.problemBadge}>{t.problems.pain} {i + 1}</span>
              </div>
              <Heading as="h3" className={styles.cardTitle}>{prob.title}</Heading>
              <p className={styles.cardDesc}>{prob.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SolutionSection() {
  const { i18n: { currentLocale } } = useDocusaurusContext();
  const t = translations[currentLocale] || translations.en;

  const icons = [<UserCheckIcon />, <FileTextIcon />, <ShieldIcon />, <GitIcon />];

  return (
    <section className={styles.sectionLight} style={{ borderBottom: '1px solid var(--geist-gray-alpha-200)' }}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag} style={{ color: 'var(--geist-success)' }}>{t.solutions.tag}</span>
          <Heading as="h2" className={styles.sectionHeading}>
            {t.solutions.heading}
          </Heading>
          <p className={styles.sectionSubheading}>
            {t.solutions.subheading}
          </p>
        </div>
        <div className={styles.featureGrid}>
          {t.solutions.items.map((feat, i) => (
            <div key={i} className={styles.featureCard}>
              <div className={styles.featureIconContainer}>{icons[i]}</div>
              <Heading as="h3" className={styles.cardTitle}>{feat.title}</Heading>
              <p className={styles.cardDesc}>{feat.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WorkflowDemo() {
  const { i18n: { currentLocale } } = useDocusaurusContext();
  const t = translations[currentLocale] || translations.en;

  return (
    <section className={styles.sectionDark} style={{ borderBottom: '1px solid var(--geist-gray-alpha-200)' }}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>{t.workflow.tag}</span>
          <Heading as="h2" className={styles.sectionHeading}>{t.workflow.heading}</Heading>
        </div>
        <div className={styles.workflowContainer}>
          <div className={styles.workflowSteps}>
            {t.workflow.steps.map((step, i) => (
              <div key={i} className={styles.workflowStep}>
                <div className={styles.stepNumber}>{i + 1}</div>
                <div className={styles.stepContent}>
                  <Heading as="h4">{step.title}</Heading>
                  <p>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className={styles.terminalMockup}>
            <div className={styles.terminalHeader}>
              <span className={styles.terminalDotClose} />
              <span className={styles.terminalDotMinimize} />
              <span className={styles.terminalDotMaximize} />
            </div>
            <div className={styles.terminalBody}>
              <div className={styles.terminalLine}>
                <span className={styles.terminalPrompt}>$</span> npm install -g @the-long-ride/engram
              </div>
              <div className={styles.terminalLine}>
                <span className={styles.terminalPrompt}>$</span> engram entry
              </div>
              <div className={styles.terminalLine}>
                <span className={styles.terminalPrompt}>$</span> engram inject
              </div>
              <div className={styles.terminalOutput} style={{ marginTop: '16px', color: 'var(--geist-gray-700)' }}>
                {t.workflow.mockOutput}
              </div>
              <div className={styles.terminalLine} style={{ color: 'var(--ifm-color-primary)' }}>
                "{t.workflow.mockPrompt}"
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function EntryUIPreview() {
  const { i18n: { currentLocale } } = useDocusaurusContext();
  const t = translations[currentLocale] || translations.en;

  const mocks = [
    (
      <div className={styles.uiMock}>
        <div className={styles.mockItem}><span>Cline Integration</span><span className={styles.statusOn}>{t.entryUi.connected}</span></div>
        <div className={styles.mockItem}><span>Gemini Antigravity</span><span className={styles.statusOn}>{t.entryUi.connected}</span></div>
        <div className={styles.mockItem}><span>Cursor Hook</span><span className={styles.statusOn}>{t.entryUi.active}</span></div>
      </div>
    ),
    (
      <div className={styles.uiMock}>
        <div className={styles.mockSliderRow}>
          <span>{t.entryUi.threshold}</span>
          <div className={styles.mockSlider}><div className={styles.mockSliderFill} style={{ width: '70%' }} /></div>
        </div>
        <div className={styles.mockToggleRow}>
          <span>{t.entryUi.gitAutoCommit}</span>
          <div className={`${styles.mockToggle} ${styles.mockToggleOn}`} />
        </div>
      </div>
    ),
    (
      <div className={styles.uiMock}>
        <div className={styles.mockAlertBox}>
          <span style={{ color: 'var(--geist-amber-700)' }}>{t.entryUi.duplicateDetected}</span>
          <p style={{ margin: 0, fontSize: '10px' }}>{t.entryUi.duplicateDesc}</p>
        </div>
      </div>
    ),
    (
      <div className={styles.uiMock}>
        <div className={styles.mockTagList}>
          <span className={styles.mockTag}>#git</span>
          <span className={styles.mockTag}>#release</span>
          <span className={styles.mockTag}>#env-vars</span>
          <span className={styles.mockTag}>#typescript</span>
        </div>
      </div>
    )
  ];

  return (
    <section className={styles.sectionLight} style={{ borderBottom: '1px solid var(--geist-gray-alpha-200)' }}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>{t.entryUi.tag}</span>
          <Heading as="h2" className={styles.sectionHeading}>{t.entryUi.heading}</Heading>
          <p className={styles.sectionSubheading}>
            {t.entryUi.subheading}
          </p>
        </div>
        <div className={styles.entryGrid}>
          {t.entryUi.items.map((area, i) => (
            <div key={i} className={styles.entryCard}>
              <div className={styles.entryCardContent}>
                <Heading as="h3" className={styles.cardTitle}>{area.title}</Heading>
                <p className={styles.cardDesc} style={{ marginBottom: '16px' }}>{area.desc}</p>
              </div>
              {mocks[i]}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AgentGrid() {
  const { i18n: { currentLocale } } = useDocusaurusContext();
  const t = translations[currentLocale] || translations.en;

  return (
    <section className={styles.sectionDark} style={{ borderBottom: '1px solid var(--geist-gray-alpha-200)' }}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>{t.integrations.tag}</span>
          <Heading as="h2" className={styles.sectionHeading}>{t.integrations.heading}</Heading>
          <p className={styles.sectionSubheading}>
            {t.integrations.subheading}
          </p>
        </div>
        <div className={styles.agentGrid}>
          {t.integrations.items.map((agent, i) => (
            <div key={i} className={styles.agentCard}>
              <Heading as="h4" style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>{agent.name}</Heading>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--geist-gray-700)' }}>{agent.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ComparisonSection() {
  const { i18n: { currentLocale } } = useDocusaurusContext();
  const t = translations[currentLocale] || translations.en;

  const rowIcons = [
    { col1: 'x', col2: 'check', col3: 'check' },
    { col1: 'check', col2: 'x', col3: 'check' },
    { col1: 'x', col2: 'check', col3: 'check' },
    { col1: 'x', col2: 'x', col3: 'check' },
    { col1: 'x', col2: 'x', col3: 'check' }
  ];

  return (
    <section className={styles.sectionLight} style={{ borderBottom: '1px solid var(--geist-gray-alpha-200)' }}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>{t.comparison.tag}</span>
          <Heading as="h2" className={styles.sectionHeading}>{t.comparison.heading}</Heading>
        </div>
        <div style={{ overflowX: 'auto', width: '100%', borderRadius: '12px', border: '1px solid var(--geist-gray-alpha-200)' }}>
          <table className={styles.comparisonTable}>
            <thead>
              <tr>
                {t.comparison.headers.map((header, i) => (
                  <th key={i} className={i === 3 ? styles.highlightCol : undefined}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.comparison.features.map((feat, i) => (
                <tr key={i}>
                  <td className={styles.tableFeature}>{feat.title}</td>
                  <td>
                    {rowIcons[i].col1 === 'check' ? (
                      <CheckIcon className={styles.iconGreen} />
                    ) : (
                      <XIcon className={styles.iconRed} />
                    )}
                    {' '}{feat.col1}
                  </td>
                  <td>
                    {rowIcons[i].col2 === 'check' ? (
                      <CheckIcon className={styles.iconGreen} />
                    ) : (
                      <XIcon className={styles.iconRed} />
                    )}
                    {' '}{feat.col2}
                  </td>
                  <td className={styles.highlightCol}>
                    <CheckIcon className={styles.iconGreen} />
                    {' '}{feat.col3}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function TrustSection() {
  const { i18n: { currentLocale } } = useDocusaurusContext();
  const t = translations[currentLocale] || translations.en;

  return (
    <section className={styles.sectionDark} style={{ borderBottom: '1px solid var(--geist-gray-alpha-200)' }}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>{t.trust.tag}</span>
          <Heading as="h2" className={styles.sectionHeading}>{t.trust.heading}</Heading>
        </div>
        <div className={styles.trustGrid}>
          {t.trust.items.map((point, i) => (
            <div key={i} className={styles.trustCard}>
              <Heading as="h3" style={{ fontSize: '1.2rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={styles.bulletSuccess} />
                {point.title}
              </Heading>
              <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--geist-gray-700)' }}>{point.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ArchitectureSection() {
  const { i18n: { currentLocale } } = useDocusaurusContext();
  const t = translations[currentLocale] || translations.en;

  const sources = {
    light: useBaseUrl('/img/demo/engram-interaction-diagram-light.png'),
    dark: useBaseUrl('/img/demo/engram-interaction-diagram-dark.png'),
  };

  return (
    <section className={styles.sectionLight} style={{ borderBottom: '1px solid var(--geist-gray-alpha-200)' }}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>{t.architecture.tag}</span>
          <Heading as="h2" className={styles.sectionHeading}>{t.architecture.heading}</Heading>
        </div>
        <div className={styles.architectureWrapper} style={{ display: 'flex', justifyContent: 'center' }}>
          <ThemedImage
            sources={sources}
            alt="The Engram Lifecycle Architecture Diagram"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        </div>
      </div>
    </section>
  );
}

function FooterCta() {
  const { i18n: { currentLocale } } = useDocusaurusContext();
  const t = translations[currentLocale] || translations.en;

  return (
    <section className={styles.sectionDark} style={{ padding: '6rem 0', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <div className={styles.heroGlow} style={{ bottom: '-150px', top: 'auto', opacity: 0.15 }} />
      <div className="container">
        <Heading as="h2" style={{ fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.03em' }}>{t.cta.heading}</Heading>
        <p style={{ color: 'var(--geist-gray-700)', maxWidth: '600px', margin: '12px auto 24px auto', fontSize: '1.1rem' }}>
          {t.cta.subheading}
        </p>
        <div className={styles.heroButtons} style={{ justifyContent: 'center' }}>
          <Link className="button button--primary button--lg" to="/docs/quickstart">
            {t.cta.btnStart}
          </Link>
          <Link className="button button--outline button--lg" to="https://github.com/the-long-ride/engram">
            {t.cta.btnView}
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <main>
        <HeroSection />
        <ProblemSection />
        <SolutionSection />
        <WorkflowDemo />
        <EntryUIPreview />
        <AgentGrid />
        <ComparisonSection />
        <TrustSection />
        <ArchitectureSection />
        <FooterCta />
      </main>
    </Layout>
  );
}
