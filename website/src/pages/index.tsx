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
        <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1.5rem'}}>
          <Link className="button button--secondary button--lg" to="/docs/quickstart">
            Get started
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
    {title: 'Agents forget', desc: 'Agents forget project decisions, repeat setup questions, and mix old context with new instructions.'},
    {title: 'Built-in memory is siloed', desc: 'Built-in memory is often private to one vendor, one app, or one machine.'},
    {title: 'Silent writes are unsafe', desc: 'Without a human gate, agents can write wrong or harmful memory that poisons future work.'},
    {title: 'Engram fixes it', desc: 'Memory lives as reviewed Markdown files. You own it, Git tracks it, and any agent can read it.'},
  ];
  return (
    <section className="container" style={{padding: '4rem 0'}}>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem'}}>
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
    {title: 'Human-approved writes', desc: 'Agents propose memory. Humans approve, reject, edit, or archive. No silent writes.'},
    {title: 'File-first / Git-native', desc: 'Memory is Markdown. Git gives audit history, portability, and team review.'},
    {title: 'Cross-agent routing', desc: 'Codex, Claude, Gemini, Cursor, Windsurf, OpenCode, Copilot, Cline — one memory source, many agents.'},
  ];
  return (
    <section className="container" style={{padding: '4rem 0'}}>
      <Heading as="h2" style={{textAlign: 'center'}}>How Engram works</Heading>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', marginTop: '2rem'}}>
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
      <Heading as="h2" style={{textAlign: 'center'}}>Install</Heading>
      <pre style={{margin: '1.5rem 0', borderRadius: '8px', padding: '1.25rem', background: 'var(--ifm-code-background)'}}>
        <code>{`npm install -g @the-long-ride/engram\nengram entry\nengram inject`}</code>
      </pre>
      <p style={{textAlign: 'center'}}>
        Node.js &gt;=20 required. <Link to="/docs/install">Full install guide</Link>.
      </p>
    </section>
  );
}

function AgentGrid() {
  const agents = ['Codex', 'Claude', 'Gemini', 'Cursor', 'Windsurf', 'OpenCode', 'Copilot', 'Cline', 'MCP'];
  return (
    <section className="container" style={{padding: '3rem 0'}}>
      <Heading as="h2" style={{textAlign: 'center'}}>Supported agents</Heading>
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
      <Heading as="h2" style={{textAlign: 'center'}}>Architecture</Heading>
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
      <Heading as="h2">Ready to own your agent's memory?</Heading>
      <Link className="button button--primary button--lg" to="/docs/quickstart" style={{marginTop: '1rem'}}>
        Start with the AI-agent quickstart
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