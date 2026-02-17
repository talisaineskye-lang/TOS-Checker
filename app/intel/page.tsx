'use client';

import { useState, useEffect, useRef } from 'react';
import { Logo } from '../components/Logo';
import { SubscribeForm } from '../components/SubscribeForm';
import { useAuth } from '../components/AuthProvider';
import { UserMenu } from '../components/UserMenu';
import { LoginModal } from '../components/LoginModal';

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

const PILLAR_LABELS: Record<string, string> = {
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

const RIVER_SECTIONS = [
  { label: 'Ideas & Trends', pillars: ['ideas_trends', 'growth'], color: 'cyan', layout: 'layout-2-1' },
  { label: 'Build', pillars: ['build'], color: 'green', layout: 'layout-1-2' },
  { label: 'Business · AI & Tools', pillars: ['business', 'ai_tools', 'market_shift'], color: 'blue', layout: 'layout-3' },
  { label: 'Policy & Regulatory', pillars: ['policy_watch', 'regulatory_intel'], color: 'red', layout: 'layout-2-1' },
];

function severityRank(severity: string): number {
  switch (severity) {
    case 'critical': return 4;
    case 'high': return 3;
    case 'medium': return 2;
    case 'low': return 1;
    default: return 0;
  }
}

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
  const [items, setItems] = useState<IntelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const pageRef = useRef<HTMLDivElement>(null);
  const { user, loading: authLoading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

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
    const els = pageRef.current?.querySelectorAll('.ip-reveal');
    els?.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  const [quickHitsData, setQuickHitsData] = useState<{
    spotlight: { label: string; accentColor: string; article: IntelItem } | null;
    quickHits: IntelItem[];
  }>({ spotlight: null, quickHits: [] });

  // Data fetch
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/intel/feed?limit=30&hours=168').then((r) => r.json()),
      fetch('/api/intel/quick-hits').then((r) => r.json()),
    ])
      .then(([feedData, qhData]) => {
        setItems(feedData.items || []);
        setQuickHitsData({
          spotlight: qhData.spotlight || null,
          quickHits: qhData.quickHits || [],
        });
      })
      .catch(() => {
        setItems([]);
        setQuickHitsData({ spotlight: null, quickHits: [] });
      })
      .finally(() => setLoading(false));
  }, []);

  // Split items: featured (first), river (rest — skip 8 to leave room)
  const featured = items[0] || null;
  const riverItems = items.slice(8);

  // Group river items by section
  const riverSections = RIVER_SECTIONS.map((section) => ({
    ...section,
    items: riverItems.filter((item) => section.pillars.includes(item.pillar)),
  })).filter((section) => section.items.length > 0);

  // Collect unique vendors for radar strip
  const vendorMap = new Map<string, { name: string; severity: string }>();
  items.forEach((item) => {
    item.affected_vendors?.forEach((v) => {
      const existing = vendorMap.get(v);
      if (!existing || severityRank(item.severity) > severityRank(existing.severity)) {
        vendorMap.set(v, { name: v, severity: item.severity });
      }
    });
  });
  const radarVendors = Array.from(vendorMap.values()).slice(0, 6);

  return (
    <main className="intel-page" ref={pageRef}>
      {/* ── Logo Rail ── */}
      <div className="ip-logo-rail">
        <span className="ip-rail-text">
          STACK<span className="ip-rail-drift">DRIFT</span>
        </span>
      </div>

      {/* ── Nav ── */}
      <nav className="ip-nav">
        <div className="ip-nav-inner">
          <div className="ip-nav-left">
            <a className="ip-nav-logo" href="/">
              <Logo size="sm" />
            </a>
            <a href="/intel" className="ip-nav-link active">Intel</a>
            <a href="/#how" className="ip-nav-link">How it works</a>
            <a href="/pricing" className="ip-nav-link">Pricing</a>
          </div>
          <div className="ip-nav-right">
            {!authLoading && (
              <>
                {user ? (
                  <UserMenu />
                ) : (
                  <button className="ip-nav-pill" onClick={() => setShowLogin(true)}>
                    Sign in
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Page Body ── */}
      <div className="ip-page">
        {loading ? (
          <div className="ip-loading">Loading intel&hellip;</div>
        ) : items.length === 0 ? (
          <div className="ip-empty">No intel items yet. Check back soon.</div>
        ) : (
          <>
            {/* ── Hero Zone — asymmetric split ── */}
            <div className="ip-hero-zone">
              {/* Left: masthead + featured story */}
              <div className="ip-hero-left">
                <div className="ip-masthead-badge">
                  <span className="ip-pulse-dot" />
                  DRIFT INTEL
                </div>

                <h1 className="ip-hero-title">
                  What&apos;s moving<br />in your <span className="ip-accent">stack.</span>
                </h1>

                <p className="ip-hero-sub">
                  Curated intel from vendor blogs, AI trends and tech news
                  &mdash; classified by AI, delivered every Monday.
                </p>

                {/* Featured story */}
                {featured && (
                  <a
                    href={featured.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ip-hero-featured ip-reveal"
                  >
                    <div className="ip-hf-pillar">
                      <span className={`ip-sev-dot ${PILLAR_COLORS[featured.pillar] || 'blue'}`} />
                      {(PILLAR_LABELS[featured.pillar] || featured.pillar).toUpperCase()}
                      {featured.severity === 'critical' && ' · CRITICAL'}
                      {featured.severity === 'high' && ' · HIGH'}
                    </div>
                    <div className="ip-hf-title">{featured.title}</div>
                    <p className="ip-hf-summary">{featured.summary}</p>
                    <div className="ip-hf-meta">
                      <span className="ip-hf-source">{featured.source}</span>
                      <span className="ip-sep">&middot;</span>
                      <span>{formatTime(featured.pub_date)}</span>
                    </div>
                    {(featured.affected_vendors?.length > 0 || featured.tags?.length > 0) && (
                      <div className="ip-hf-chips">
                        {featured.affected_vendors?.map((v) => (
                          <span key={v} className="ip-chip vendor">{v}</span>
                        ))}
                        {featured.tags?.map((t) => (
                          <span key={t} className="ip-chip">{t}</span>
                        ))}
                      </div>
                    )}
                  </a>
                )}
              </div>

              {/* Right: Quick Hits sidebar */}
              <div className="ip-hero-right">
                <div className="ip-qh-header">
                  <h3>Quick Hits</h3>
                  <span className="ip-qh-live">LIVE</span>
                </div>

                {/* Spotlight — only shows if there's a matching article */}
                {quickHitsData.spotlight && (
                  <div className="ip-spotlight">
                    <div className="ip-spotlight-header">
                      <span className={`ip-sev-dot ${quickHitsData.spotlight.accentColor}`} />
                      <h3 className="ip-spotlight-label">{quickHitsData.spotlight.label}</h3>
                    </div>
                    <a
                      href={quickHitsData.spotlight.article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ip-spotlight-card"
                    >
                      <span className="ip-spotlight-title">
                        {quickHitsData.spotlight.article.title}
                      </span>
                      <span className="ip-spotlight-summary">
                        {quickHitsData.spotlight.article.summary}
                      </span>
                      <span className="ip-spotlight-meta">
                        <span className="ip-cell-source">{quickHitsData.spotlight.article.source}</span>
                        <span className="ip-sep">&middot;</span>
                        <span>{formatTime(quickHitsData.spotlight.article.pub_date)}</span>
                      </span>
                    </a>
                  </div>
                )}

                {/* Quick Hits list — heat-scored */}
                {quickHitsData.quickHits.map((item) => {
                  const color = PILLAR_COLORS[item.pillar] || 'blue';
                  return (
                    <a
                      key={item.id}
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ip-qh-item"
                    >
                      <div className={`ip-qh-accent ${color}`} />
                      <div className="ip-qh-content">
                        <div className="ip-qh-title">{item.title}</div>
                        <div className="ip-qh-meta">
                          <span className="ip-qh-source">{item.source}</span>
                          <span className="ip-sep">&middot;</span>
                          <span>{formatTime(item.pub_date)}</span>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>

            {/* ── Vendor Radar Strip ── */}
            {radarVendors.length > 0 && (
              <div className="ip-radar-strip">
                <div className="ip-radar-bar">
                  {radarVendors.map((v) => {
                    const dotClass =
                      v.severity === 'critical' ? 'alert' :
                      v.severity === 'high' ? 'warning' : 'active';
                    const statusText =
                      v.severity === 'critical' ? 'TOS changed' :
                      v.severity === 'high' ? 'Updated' : 'Stable';
                    return (
                      <div key={v.name} className="ip-radar-item">
                        <span className={`ip-ri-dot ${dotClass}`} />
                        <span className="ip-ri-name">
                          {v.name.charAt(0).toUpperCase() + v.name.slice(1)}
                        </span>
                        <span className={`ip-ri-status ${dotClass !== 'active' ? 'changed' : ''}`}>
                          {statusText}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Story River ── */}
            <div className="ip-river">
              {riverSections.map((section, sIdx) => (
                <div key={section.label}>
                  {sIdx > 0 && <div className="ip-river-divider" />}
                  <div className="ip-sec-head">
                    <div
                      className="ip-sec-accent"
                      style={{ background: `var(--ip-${section.color})` }}
                    />
                    <h2>{section.label}</h2>
                  </div>
                  <div
                    className={`ip-story-row ${section.layout} ip-reveal`}
                    style={{ '--card-index': sIdx } as React.CSSProperties}
                  >
                    {section.items
                      .slice(0, section.layout === 'layout-3' ? 3 : 2)
                      .map((item, idx) => {
                        const color = PILLAR_COLORS[item.pillar] || 'blue';
                        const isLarge =
                          (section.layout === 'layout-2-1' && idx === 0) ||
                          (section.layout === 'layout-1-2' && idx === 1);
                        return (
                          <a
                            key={item.id}
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`ip-story-cell a-${color}${isLarge ? ' large' : ''}`}
                          >
                            <span className={`ip-cell-badge ${color}`}>
                              {PILLAR_LABELS[item.pillar] || item.pillar}
                            </span>
                            <div className="ip-cell-title">{item.title}</div>
                            <p className="ip-cell-summary">{item.summary}</p>
                            <div className="ip-cell-meta">
                              <span className="ip-cell-source">{item.source}</span>
                              <span className="ip-sep">&middot;</span>
                              <span>{formatTime(item.pub_date)}</span>
                              <span className="ip-cell-read">Read &rarr;</span>
                            </div>
                            {(item.affected_vendors?.length > 0 || item.tags?.length > 0) && (
                              <div className="ip-cell-chips">
                                {item.affected_vendors?.map((v) => (
                                  <span key={v} className="ip-chip vendor">{v}</span>
                                ))}
                                {item.tags?.map((t) => (
                                  <span key={t} className="ip-chip">{t}</span>
                                ))}
                              </div>
                            )}
                          </a>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Newsletter ── */}
            <div className="ip-newsletter-section ip-reveal">
              <div className="ip-nl-box">
                <div className="ip-nl-glow-1" />
                <div className="ip-nl-glow-2" />
                <div className="ip-nl-content">
                  <div className="ip-masthead-badge" style={{ justifyContent: 'center' }}>
                    <span className="ip-pulse-dot" />
                    DRIFT INTEL NEWSLETTER
                  </div>
                  <h2>Get this in your inbox every Monday.</h2>
                  <p>
                    A 5-minute read curated for indie devs and SaaS builders.
                    Vendor policy changes, tool launches, and market moves
                    &mdash; classified and summarized.
                  </p>
                  <div className="ip-nl-embed">
                    <SubscribeForm />
                  </div>
                  <div className="ip-nl-proof">
                    Every Monday, 6am &middot; 5-min read &middot; Unsubscribe anytime
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Footer ── */}
        <footer className="ip-footer">
          <a href="/" className="ip-footer-logo">
            <Logo size="sm" />
          </a>
          <span className="ip-footer-copy">&copy; 2026 StackDrift</span>
        </footer>
      </div>

      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
    </main>
  );
}
