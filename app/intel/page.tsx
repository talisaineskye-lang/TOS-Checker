'use client';

import { useState, useEffect, useRef } from 'react';
import { Logo } from '../components/Logo';

type Pillar = 'all' | 'policy_watch' | 'build' | 'business' | 'ai_tools' | 'growth' | 'ideas_trends' | 'regulatory_intel' | 'market_shift';

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
  policy_watch: 'Policy Watch',
  build: 'Build',
  business: 'Business',
  ai_tools: 'AI & Tools',
  growth: 'Growth',
  ideas_trends: 'Ideas & Trends',
  regulatory_intel: 'Regulatory',
  market_shift: 'Market',
};

const PILLAR_COLORS: Record<string, string> = {
  policy_watch: 'red',
  regulatory_intel: 'red',
  build: 'green',
  ai_tools: 'purple',
  business: 'blue',
  growth: 'pink',
  ideas_trends: 'cyan',
  market_shift: 'blue',
};

const FREE_PREVIEW_COUNT = 6;

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
  const feedRef = useRef<HTMLDivElement>(null);

  // Scroll-reveal observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('vis');
        });
      },
      { threshold: 0.08 }
    );
    const els = feedRef.current?.querySelectorAll('.ip-reveal');
    els?.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  // Data fetch
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
    <main className="intel-page" ref={feedRef}>
      {/* ── Nav ── */}
      <nav className="ip-nav">
        <div className="inner">
          <div className="nav-left">
            <a className="nav-logo" href="/landing">
              <Logo size="sm" />
            </a>
            <a href="/intel" className="nav-link active">Intel</a>
            <a href="/landing" className="nav-link">How it works</a>
          </div>
          <div className="nav-right">
            <a className="nav-pill" href="/onboarding">Start monitoring</a>
          </div>
        </div>
      </nav>

      <div className="wrap">
        {/* ── Hero ── */}
        <section className="ip-hero">
          <div className="ip-hero-label">
            <span className="ip-pulse-dot" />
            <span>DRIFT INTEL</span>
          </div>
          <h1>What&apos;s moving in your stack.</h1>
          <p className="ip-hero-sub">
            Curated intel from vendor blogs, regulatory bodies, and tech news
            &mdash; classified by AI, delivered every Tuesday.
          </p>
          <div className="ip-hero-stats">
            <div className="ip-stat">
              <span className="ip-stat-value">29</span>
              <span className="ip-stat-label">Vendors</span>
            </div>
            <div className="ip-stat">
              <span className="ip-stat-value">98</span>
              <span className="ip-stat-label">Documents</span>
            </div>
            <div className="ip-stat">
              <span className="ip-stat-value">6h</span>
              <span className="ip-stat-label">Refresh</span>
            </div>
          </div>
        </section>

        {/* ── Pillar Tabs ── */}
        <div className="ip-tabs">
          <div className="ip-tabs-inner">
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
        </div>

        {/* ── Feed ── */}
        {loading ? (
          <div className="ip-loading">Loading intel&hellip;</div>
        ) : items.length === 0 ? (
          <div className="ip-empty">No intel items yet. Check back soon.</div>
        ) : (
          <>
            {/* Free preview cards */}
            <div className="ip-feed">
              {previewItems.map((item, idx) => {
                const color = PILLAR_COLORS[item.pillar] || 'blue';
                return (
                  <a
                    key={item.id}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`ip-card accent-${color} ip-reveal`}
                    style={{ '--card-index': idx } as React.CSSProperties}
                  >
                    <div className="ip-card-inner">
                      <div className="ip-card-header">
                        <div className="ip-card-title">{item.title}</div>
                        <span className={`ip-pillar-badge ${color}`}>
                          {PILLAR_LABELS[item.pillar as Pillar] || item.pillar}
                        </span>
                      </div>
                      <p className="ip-card-summary">{item.summary}</p>
                      <div className="ip-card-footer">
                        <div className="ip-card-meta">
                          <span className="ip-card-source">{item.source}</span>
                          <span className="ip-meta-dot">&middot;</span>
                          <span>{formatTime(item.pub_date)}</span>
                        </div>
                        <span className="ip-read-arrow">Read &rarr;</span>
                      </div>
                      {(item.affected_vendors?.length > 0 || item.tags?.length > 0) && (
                        <>
                          <div className="ip-card-divider" />
                          <div className="ip-card-chips">
                            {item.affected_vendors?.map((v) => (
                              <span key={v} className="ip-chip vendor">{v}</span>
                            ))}
                            {item.tags?.map((t) => (
                              <span key={t} className="ip-chip">{t}</span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </a>
                );
              })}
            </div>

            {/* ── Newsletter Signup ── */}
            <section className="ip-newsletter ip-reveal">
              <div className="ip-nl-glow-1" />
              <div className="ip-nl-glow-2" />
              <div className="ip-nl-content">
                <div className="ip-hero-label">
                  <span className="ip-pulse-dot" />
                  <span>DRIFT INTEL NEWSLETTER</span>
                </div>
                <h2>Get this in your inbox every Tuesday.</h2>
                <p>
                  A 5-minute read curated for indie devs and SaaS builders.
                  Vendor policy changes, tool launches, and market moves
                  &mdash; classified and summarized.
                </p>
                <div className="ip-nl-embed">
                  <iframe
                    src="https://embeds.beehiiv.com/b42abe3a-e8c1-47c1-bd15-15333a895e73?slim=true"
                    style={{ width: '100%', maxWidth: 480, height: 52, border: 'none', background: 'transparent' }}
                    title="Subscribe to Drift Intel"
                  />
                </div>
                <div className="ip-nl-proof">
                  Every Tuesday, 6am &middot; 5-min read &middot; Unsubscribe anytime
                </div>
              </div>
            </section>

            {/* ── Gated section ── */}
            {gatedCount > 0 && (
              <div className="ip-gate-section">
                <div className="ip-gate-blur">
                  {gatedItems.map((item) => {
                    const color = PILLAR_COLORS[item.pillar] || 'blue';
                    return (
                      <div
                        key={item.id}
                        className={`ip-card accent-${color}`}
                        aria-hidden="true"
                      >
                        <div className="ip-card-inner">
                          <div className="ip-card-header">
                            <div className="ip-card-title">{item.title}</div>
                            <span className={`ip-pillar-badge ${color}`}>
                              {PILLAR_LABELS[item.pillar as Pillar] || item.pillar}
                            </span>
                          </div>
                          <p className="ip-card-summary">{item.summary}</p>
                          <div className="ip-card-meta">
                            <span className="ip-card-source">{item.source}</span>
                            <span className="ip-meta-dot">&middot;</span>
                            <span>{formatTime(item.pub_date)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="ip-gate-overlay">
                  <div className="ip-gate-content">
                    <span className="ip-gate-count">
                      +{gatedCount} more item{gatedCount !== 1 ? 's' : ''} this week
                    </span>
                    <a className="ip-cta-gradient" href="/onboarding">
                      Subscribe to Drift Intel
                    </a>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Bottom CTA ── */}
        <section className="ip-cta ip-reveal">
          <h2>Never miss a shift.</h2>
          <p>
            Get vendor policy changes, tool launches, and market intel
            delivered every Tuesday.
          </p>
          <a className="ip-cta-gradient" href="/onboarding">Subscribe to Drift Intel</a>
        </section>

        {/* ── Footer ── */}
        <footer className="ip-footer">
          <a href="/landing" className="ip-footer-logo">
            <Logo size="sm" />
          </a>
          <span className="ip-footer-copy">&copy; 2026 StackDrift</span>
        </footer>
      </div>
    </main>
  );
}
