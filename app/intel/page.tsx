'use client';

import { useState, useEffect, useRef } from 'react';

type Pillar = 'all' | 'direct_delta' | 'regulatory_intel' | 'market_shift';

interface IntelItem {
  id: string;
  title: string;
  link: string;
  summary: string;
  source: string;
  pillar: string;
  severity: string;
  relevance: number;
  pub_date: string;
  affected_vendors: string[];
  tags: string[];
}

const PILLAR_LABELS: Record<Pillar, string> = {
  all: 'All',
  direct_delta: 'Direct Changes',
  regulatory_intel: 'Regulatory',
  market_shift: 'Market Shifts',
};

const FREE_PREVIEW_COUNT = 4;

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export default function IntelPage() {
  const [activePillar, setActivePillar] = useState<Pillar>('all');
  const [items, setItems] = useState<IntelItem[]>([]);
  const [loading, setLoading] = useState(true);

  const revealRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('vis');
        });
      },
      { threshold: 0.08 }
    );
    revealRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '30', hours: '168' });
    if (activePillar !== 'all') params.set('pillar', activePillar);

    fetch(`/api/intel/feed?${params}`)
      .then((res) => res.json())
      .then((data) => setItems(data.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [activePillar]);

  const previewItems = items.slice(0, FREE_PREVIEW_COUNT);
  const gatedItems = items.slice(FREE_PREVIEW_COUNT, FREE_PREVIEW_COUNT + 3);
  const gatedCount = Math.max(0, items.length - FREE_PREVIEW_COUNT);

  return (
    <main className="intel-page">
      {/* Nav */}
      <nav className="ip-nav">
        <div className="inner">
          <div className="nav-left">
            <a className="nav-logo" href="/landing">
              <span className="nav-dot" />
              TOS Monitor
            </a>
            <a href="/intel" className="nav-link active">Intel Feed</a>
            <a href="/landing" className="nav-link">How it works</a>
          </div>
          <div className="nav-right">
            <a className="nav-pill" href="/onboarding">Start monitoring</a>
          </div>
        </div>
      </nav>

      <div className="wrap">
        {/* Hero */}
        <section className="ip-hero">
          <div className="tag tag-green">Industry intel</div>
          <h1>
            What&apos;s moving in<br />
            <span className="dim">vendor policy.</span>
          </h1>
          <p className="ip-hero-sub">
            Real-time intel from regulatory bodies, vendor blogs, and tech news
            &mdash; classified by AI. Updated every 6 hours.
          </p>
        </section>

        {/* Pillar Tabs */}
        <div className="ip-tabs">
          {(Object.keys(PILLAR_LABELS) as Pillar[]).map((pillar) => (
            <button
              key={pillar}
              className={`ip-tab ${activePillar === pillar ? 'active' : ''}`}
              onClick={() => setActivePillar(pillar)}
            >
              {PILLAR_LABELS[pillar]}
            </button>
          ))}
        </div>

        {/* Feed */}
        {loading ? (
          <div className="ip-loading">Loading intel&hellip;</div>
        ) : items.length === 0 ? (
          <div className="ip-empty">No intel items yet. Check back soon.</div>
        ) : (
          <>
            {/* Free preview cards */}
            <div className="ip-feed">
              {previewItems.map((item, idx) => (
                <div
                  key={item.id}
                  className={`ip-card sev-${item.severity} ip-reveal`}
                  ref={(el) => { revealRefs.current[idx] = el; }}
                >
                  <div className="ip-card-header">
                    <div className="ip-card-title">
                      <a href={item.link} target="_blank" rel="noopener noreferrer">
                        {item.title}
                      </a>
                    </div>
                    <span className={`ip-sev-badge ${item.severity}`}>
                      {item.severity}
                    </span>
                  </div>
                  <p className="ip-card-summary">{item.summary}</p>
                  <div className="ip-card-meta">
                    <span className="ip-card-source">{item.source}</span>
                    <span>{formatTime(item.pub_date)}</span>
                    {item.relevance > 0 && <span>relevance: {item.relevance}</span>}
                  </div>
                  {(item.affected_vendors?.length > 0 || item.tags?.length > 0) && (
                    <div className="ip-card-chips">
                      {item.affected_vendors?.map((v) => (
                        <span key={v} className="ip-chip vendor">{v}</span>
                      ))}
                      {item.tags?.map((t) => (
                        <span key={t} className="ip-chip">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Gated section */}
            {gatedCount > 0 && (
              <div className="ip-gate-section">
                <div className="ip-gate-blur">
                  {gatedItems.map((item) => (
                    <div
                      key={item.id}
                      className={`ip-card sev-${item.severity}`}
                      aria-hidden="true"
                    >
                      <div className="ip-card-header">
                        <div className="ip-card-title">{item.title}</div>
                        <span className={`ip-sev-badge ${item.severity}`}>
                          {item.severity}
                        </span>
                      </div>
                      <p className="ip-card-summary">{item.summary}</p>
                      <div className="ip-card-meta">
                        <span className="ip-card-source">{item.source}</span>
                        <span>{formatTime(item.pub_date)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="ip-gate-overlay">
                  <div className="ip-gate-content">
                    <div className="tag" style={{ marginBottom: 16 }}>
                      +{gatedCount} more item{gatedCount !== 1 ? 's' : ''}
                    </div>
                    <h3>Get the full intel feed.</h3>
                    <p>
                      Sign up to unlock every classified item, vendor alerts,
                      and daily briefings.
                    </p>
                    <a className="ip-cta-pill" href="/onboarding">
                      Get early access
                    </a>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* CTA */}
        <section
          className="ip-cta ip-reveal"
          ref={(el) => { revealRefs.current[20] = el; }}
        >
          <h2>
            Stay ahead of<br />vendor changes.
          </h2>
          <p>
            Monitor your entire vendor stack. Free during early access.
          </p>
          <a className="ip-cta-pill" href="/onboarding">Get early access</a>
        </section>

        {/* Footer */}
        <footer className="ip-footer">
          <span>&copy; 2026 TOS Monitor</span>
          <div className="ip-footer-links">
            <a href="/landing">Home</a>
            <a href="/intel">Intel</a>
          </div>
        </footer>
      </div>
    </main>
  );
}
