import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Heading from '@theme/Heading';
import styles from './index.module.css';

function HeroSection() {
  return (
    <header className="hero hero--primary">
      <div className="container">
        <Heading as="h1" className="hero__title">
          Engram
        </Heading>
        <p className="hero__subtitle">Human-owned memory for AI agents.</p>
        <div className={styles.heroButtons}>
          <Link className="button button--primary button--lg" to="/docs/quickstart">
            Get Started
          </Link>
          <Link className="button button--outline button--lg" to="https://github.com/the-long-ride/engram">
            View on GitHub
          </Link>
        </div>
      </div>
    </header>
  );
}

function ProblemCards() {
  const items = [
    {title: 'Agents Forget', desc: 'Agents forget project decisions, repeat setup questions, and mix old context with new instructions.'},
    {title: 'Built-in Memory Is Siloed', desc: 'Built-in memory is often private to one vendor, one app, or one machine.'},
    {title: 'Silent Writes Are Unsafe', desc: 'Without a human gate, agents can write wrong or harmful memory that poisons future work.'},
    {title: 'Engram Fixes It', desc: 'Memory lives as reviewed Markdown files. You own it, Git tracks it, and any agent can read it.'},
  ];
  return (
    <section className="container" style={{padding: '4rem 0'}}>
      <div className={styles.cardGrid}>
        {items.map((item) => (
          <div key={item.title} className="homepage-card">
            <Heading as="h3">{item.title}</Heading>
            <p>{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Pillars() {
  const items = [
    {title: 'Human-Approved Writes', desc: 'Agents propose memory. Humans approve, reject, edit, or archive. No silent writes.'},
    {title: 'File-First / Git-Native', desc: 'Memory is Markdown. Git gives audit history, portability, and team review.'},
    {title: 'Cross-Agent Routing', desc: 'Codex, Claude, Gemini, Cursor, Windsurf, OpenCode, Copilot, Cline — one memory source, many agents.'},
  ];
  return (
    <section className="container" style={{padding: '4rem 0'}}>
      <Heading as="h2" className={styles.sectionHeading}>How Engram Works</Heading>
      <div className={styles.cardGrid}>
        {items.map((item) => (
          <div key={item.title} className="homepage-card">
            <Heading as="h3">{item.title}</Heading>
            <p>{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function InstallBlock() {
  return (
    <section className="container" style={{padding: '3rem 0', maxWidth: '700px'}}>
      <Heading as="h2" className={styles.sectionHeading}>Install</Heading>
      <pre className={styles.installPre}>
        <code>{`npm install -g @the-long-ride/engram\nengram entry\nengram inject`}</code>
      </pre>
      <p className={styles.installNote}>
        Node.js &gt;=20 required. <Link to="/docs/install">Full install guide</Link>.
      </p>
    </section>
  );
}

function AgentGrid() {
  const agents = ['Codex', 'Claude', 'Gemini', 'Cursor', 'Windsurf', 'OpenCode', 'Copilot', 'Cline', 'MCP'];
  return (
    <section className="container" style={{padding: '3rem 0'}}>
      <Heading as="h2" className={styles.sectionHeading}>Supported Agents</Heading>
      <div className="agent-grid" style={{marginTop: '1.5rem'}}>
        {agents.map((a) => (
          <div key={a} className="agent-badge">{a}</div>
        ))}
      </div>
    </section>
  );
}

function ArchitectureDiagram() {
  return (
    <section className="container" style={{padding: '3rem 0', maxWidth: '800px'}}>
      <Heading as="h2" className={styles.sectionHeading}>Architecture</Heading>
      <pre className="mermaid" style={{marginTop: '1.5rem'}}>
{`flowchart LR
  User -->|request| AI[AI Host]
  AI -->|engram load| Load[Load/Search]
  Load -->|read| MD[Markdown Memory]
  MD -->|approve| Approve[Approval Gate]
  Approve -->|write| Write[Write]
  Write -->|refresh| Index[Index/Graph/Hashes]
  Index -->|sync| Git[Git Sync]
  Git -->|portable| User`}
      </pre>
    </section>
  );
}

function FooterCta() {
  return (
    <section className="container" style={{padding: '4rem 0', textAlign: 'center'}}>
      <Heading as="h2">Ready to Own Your Agent's Memory?</Heading>
      <Link className="button button--primary button--lg" to="/docs/quickstart" style={{marginTop: '1rem'}}>
        Start with the Quickstart
      </Link>
    </section>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <main>
        <HeroSection />
        <ProblemCards />
        <Pillars />
        <InstallBlock />
        <AgentGrid />
        <ArchitectureDiagram />
        <FooterCta />
      </main>
    </Layout>
  );
}
