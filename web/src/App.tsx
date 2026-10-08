import React from 'react';
import { Radio, ShieldCheck, Layers, Cpu, Server, CheckCircle2 } from 'lucide-react';

export const App: React.FC = () => {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation Header */}
      <header
        style={{
          borderBottom: '1px solid var(--bg-card-border)',
          background: 'rgba(11, 15, 25, 0.8)',
          backdropFilter: 'var(--backdrop-blur)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '4.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, var(--accent-primary), #047857)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: 'var(--shadow-glow)',
              }}
            >
              <Radio size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.025em' }}>
                Mohalla Signal
              </h1>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Neighborhood Demand Intelligence
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span className="badge badge-primary">
              <ShieldCheck size={14} /> Phase 1 Initialized
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="container" style={{ padding: '3.5rem 1.5rem', flex: 1 }}>
        <section style={{ maxWidth: '840px', margin: '0 auto', textAlign: 'center', marginBottom: '3.5rem' }}>
          <div style={{ display: 'inline-flex', marginBottom: '1.25rem' }}>
            <span className="badge badge-signal">
              Phase 1: Project Foundation & Security Architecture
            </span>
          </div>
          <h2
            style={{
              fontSize: '2.5rem',
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: '-0.03em',
              marginBottom: '1rem',
            }}
          >
            Turning Lost Kirana Demand into an{' '}
            <span style={{ color: 'var(--accent-primary)' }}>Actionable Signal</span>
          </h2>
          <p
            style={{
              fontSize: '1.125rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
            }}
          >
            When unstocked product requests are missed by local merchants, Mohalla Signal captures them,
            matches products deterministically, and aggregates demand privately across local clusters.
          </p>
        </section>

        {/* Foundation Status Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.5rem',
            marginBottom: '3rem',
          }}
        >
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div
              style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-primary-light)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}
            >
              <Cpu size={20} />
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              React + TypeScript (Vite)
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Strict TypeScript setup, zero external CSS framework bloat, accessible design tokens.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)', fontSize: '0.8125rem', fontWeight: 600 }}>
              <CheckCircle2 size={16} /> Web Framework Ready
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div
              style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-info-light)',
                color: 'var(--accent-info)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}
            >
              <Server size={20} />
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              NestJS + Prisma + BullMQ
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              PostgreSQL persistent source of truth, Redis async queue foundation, Helmet security headers.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-info)', fontSize: '0.8125rem', fontWeight: 600 }}>
              <CheckCircle2 size={16} /> Backend Architecture Ready
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div
              style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-signal-light)',
                color: 'var(--accent-signal)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Security & Privacy Policy
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Privacy-thresholded demand aggregation (3+ shops), DTO whitelisting, zero client secret leaks.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-signal)', fontSize: '0.8125rem', fontWeight: 600 }}>
              <CheckCircle2 size={16} /> Security Baseline Ready
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div
              style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(168, 85, 247, 0.15)',
                color: '#c084fc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}
            >
              <Layers size={20} />
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Flutter Mobile Ready
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Isolated in mobile/ directory, designed to consume unified backend REST & WS APIs in Phase 8.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#c084fc', fontSize: '0.8125rem', fontWeight: 600 }}>
              <CheckCircle2 size={16} /> Clean Client Separation
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--bg-card-border)',
          padding: '1.5rem 0',
          textAlign: 'center',
          fontSize: '0.8125rem',
          color: 'var(--text-muted)',
        }}
      >
        Mohalla Signal &bull; Phase 1 Architecture Baseline &bull; Built with React, TypeScript & NestJS
      </footer>
    </main>
  );
};

export default App;
