'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Logo } from './components/Logo';
import { useAuth } from './components/AuthProvider';
import { UserMenu } from './components/UserMenu';
import { LoginModal } from './components/LoginModal';

const CubeScene = dynamic(() => import('./components/CubeScene'), { ssr: false });

// Scene visibility ranges (scroll progress 0-1)
const SCENES = [
  { id: 'scene1', start: 0, end: 0.12 },
  { id: 'scene2', start: 0.14, end: 0.27 },
  { id: 'scene3', start: 0.29, end: 0.42 },
  { id: 'scene4', start: 0.44, end: 0.57 },
  { id: 'scene5', start: 0.59, end: 0.72 },
  { id: 'scene6', start: 0.74, end: 0.88 },
];

const FAQ_ITEMS = [
  {
    q: 'What does StackDrift monitor?',
    a: 'StackDrift monitors Terms of Service, privacy policies, acceptable use policies, and pricing pages for SaaS vendors. We scan documents every 6 hours and detect changes using AI-powered diff analysis.',
  },
  {
    q: 'Who is StackDrift for?',
    a: 'StackDrift is built for indie developers, startup founders, and small SaaS teams who depend on third-party vendors but don\u2019t have legal departments to monitor policy changes.',
  },
  {
    q: 'How does severity scoring work?',
    a: 'Each detected change is classified by AI into four severity levels: Critical (liability shifts, data sharing changes), Warning (pricing changes, new restrictions), Notice (minor wording updates), and Stable (no changes detected). This helps you prioritize what needs attention.',
  },
  {
    q: 'Which vendors does StackDrift track?',
    a: 'We monitor 54+ vendors across payments (Stripe, PayPal), cloud (AWS, Vercel, Cloudflare), AI (OpenAI, Anthropic), developer tools (GitHub, Docker), automation (Zapier, n8n), analytics (PostHog, Mixpanel), and more. Pro and Business plans let you add custom vendors.',
  },
  {
    q: 'How is StackDrift different from a Google Alert?',
    a: 'Google Alerts monitors news mentions. StackDrift monitors the actual legal and pricing documents themselves, detects exact changes with line-by-line diffs, classifies severity with AI, and routes alerts to the right team. It\u2019s purpose-built for vendor risk.',
  },
  {
    q: 'Can I integrate StackDrift with my existing tools?',
    a: 'Yes. Pro and Business plans include Slack integration, webhooks, and a JSON API. You can route alerts by severity to different channels \u2014 critical changes to legal, pricing changes to finance, API changes to engineering.',
  },
];

export default function LandingPage() {
  const { user, loading: authLoading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const [activeScenes, setActiveScenes] = useState<Record<string, boolean>>({ scene1: true });

  // Scroll tracking
  const onScroll = useCallback(() => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
    setScrollProgress(progress);

    const newActive: Record<string, boolean> = {};
    SCENES.forEach((s) => {
      newActive[s.id] = progress >= s.start && progress <= s.end;
    });
    setActiveScenes(newActive);
  }, []);

  // Mouse tracking
  const onMouseMove = useCallback((e: MouseEvent) => {
    setMouseX((e.clientX / window.innerWidth - 0.5) * 2);
    setMouseY((e.clientY / window.innerHeight - 0.5) * 2);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('mousemove', onMouseMove);
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('mousemove', onMouseMove);
    };
  }, [onScroll, onMouseMove]);

  // --- JSON-LD structured data ---
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'StackDrift',
    description: 'SaaS vendor policy monitoring platform that tracks changes to Terms of Service, Privacy Policies, and Pricing pages across 54+ SaaS vendors. Built for indie developers and small SaaS teams.',
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Vendor Management, Policy Monitoring, Compliance',
    operatingSystem: 'Web',
    url: 'https://www.stackdrift.app',
    offers: [
      { '@type': 'Offer', name: 'Solo', price: '9', priceCurrency: 'USD', priceValidUntil: '2026-12-31', description: 'Monitor 54 curated vendors with AI-powered change summaries' },
      { '@type': 'Offer', name: 'Pro', price: '29', priceCurrency: 'USD', priceValidUntil: '2026-12-31', description: 'Webhooks, Slack integration, and full change history for workflow automation' },
      { '@type': 'Offer', name: 'Business', price: '99', priceCurrency: 'USD', priceValidUntil: '2026-12-31', description: 'Team seats, audit logs, redline PDF exports, and renewal reminders for compliance-ready teams' },
    ],
    featureList: [
      'Automated vendor policy change detection',
      'AI-powered change analysis and severity classification',
      'Terms of Service monitoring',
      'Privacy Policy monitoring',
      'Pricing page monitoring',
      'Real-time email and Slack alerts',
      'Webhook and JSON API integration',
      'Redline PDF compliance reports',
    ],
    creator: { '@type': 'Organization', name: 'StackDrift', url: 'https://www.stackdrift.app' },
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  return (
    <main className="landing-page">
      {/* Structured data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      {/* Nav */}
      <nav className="lp-nav">
        <div className="inner">
          <div className="nav-left">
            <Link href="/" className="nav-logo">
              <Logo size="sm" />
            </Link>
            <div className="nav-products">
              <button className="nav-products-trigger">
                Products
                <svg className="nav-products-chevron" viewBox="0 0 10 10" fill="none">
                  <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <div className="nav-products-dropdown">
                <Link href="/" className="nav-products-item">
                  <span className="nav-products-item-name">Vendor Monitor</span>
                  <span className="nav-products-item-desc">Managed service &middot; from $9/mo</span>
                </Link>
                <Link href="/blueprint" className="nav-products-item">
                  <span className="nav-products-item-name">Vendor Watch Blueprint</span>
                  <span className="nav-products-item-desc">One-time &middot; $49</span>
                </Link>
              </div>
            </div>
            <div className="nav-products-mobile">
              <Link href="/" className="nav-link">Monitor</Link>
              <Link href="/blueprint" className="nav-link">Blueprint</Link>
            </div>
            <Link href="/pricing" className="nav-link">Pricing</Link>
            <Link href="/intel" className="nav-link">Drift Intel</Link>
            <Link href="/about" className="nav-link">About</Link>
          </div>
          <div className="nav-right">
            {authLoading ? null : user ? (
              <UserMenu />
            ) : (
              <button className="nav-cta" onClick={() => setShowLogin(true)}>
                Sign in
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* 3D Canvas (fixed) */}
      <CubeScene progress={scrollProgress} mouseX={mouseX} mouseY={mouseY} />

      {/* Scroll track */}
      <div className="scroll-track">
        <div style={{ height: '100vh' }} />
        <div style={{ height: '100vh' }} />
        <div style={{ height: '100vh' }} />
        <div style={{ height: '100vh' }} />
        <div style={{ height: '100vh' }} />
        <div style={{ height: '100vh' }} />
        <div style={{ height: '100vh' }} />
      </div>

      {/* Scene 1: Hero */}
      <div className={`text-layer s1${activeScenes.scene1 ? ' active' : ''}`}>
        <div className="s1-kicker">Vendor policy monitoring</div>
        <h1>Your vendors<br />changed the <i>rules.</i></h1>
        <p className="s1-sub">
          StackDrift monitors Terms of Service, Privacy Policies, and Pricing
          pages across your entire vendor stack. AI-powered. Real-time.
        </p>
        <div className="s1-cta">
          <Link href="/pricing" className="cta-btn-gradient">Start free trial</Link>
          <Link href="/pricing" className="cta-btn">View plans</Link>
        </div>
        <p className="s1-trial">7-day free trial &middot; no charge until day 8</p>
        <div className="s1-scroll">
          <span>Scroll</span>
          <div className="s1-scroll-line" />
        </div>
      </div>

      {/* Scene 2: Detection */}
      <div className={`text-layer s2${activeScenes.scene2 ? ' active' : ''}`}>
        <div className="s2-inner">
          <div className="scene-number">01 &mdash; Detect</div>
          <h2 className="scene-heading">Every change,<br />caught in <em>hours.</em></h2>
          <p className="scene-body">
            We fetch and hash vendor documents every 6 hours. When something
            changes, AI analyzes the diff and surfaces exactly what shifted
            &mdash; line by line, in plain English.
          </p>
        </div>
      </div>

      {/* Scene 3: Analyze */}
      <div className={`text-layer s3${activeScenes.scene3 ? ' active' : ''}`}>
        <div className="s2-inner">
          <div className="scene-number">02 &mdash; Analyze</div>
          <h2 className="scene-heading">AI reads the<br />fine <em>print.</em></h2>
          <p className="scene-body">
            Each change is classified into four severity levels &mdash; Critical,
            Warning, Notice, Stable. AI explains what changed, why it matters,
            and what action you should take.
          </p>
        </div>
      </div>

      {/* Scene 4: Protect */}
      <div className={`text-layer s4${activeScenes.scene4 ? ' active' : ''}`}>
        <div>
          <div className="scene-number">03 &mdash; Alert</div>
          <h2 className="scene-heading">Know before<br />it <em>matters.</em></h2>
          <p className="scene-body">
            Alerts route to Slack, email, or webhooks. Critical changes go to
            legal, pricing shifts to finance, API updates to engineering. Your
            team sees what matters to them.
          </p>
        </div>
      </div>

      {/* Scene 5: Features */}
      <div className={`text-layer s5${activeScenes.scene5 ? ' active' : ''}`}>
        <div>
          <div className="scene-number" style={{ textAlign: 'center' }}>The details</div>
          <h2 className="scene-heading" style={{ textAlign: 'center', marginBottom: 0 }}>Built with care</h2>
          <div className="s5-grid">
            <div className="s5-item">
              <div className="s5-icon">54+</div>
              <h3>Vendors</h3>
              <p>Stripe, AWS, Vercel, OpenAI, and more. Monitored every 6 hours.</p>
            </div>
            <div className="s5-item">
              <div className="s5-icon">AI</div>
              <h3>Analysis</h3>
              <p>Severity scoring, plain-English summaries, and recommended actions.</p>
            </div>
            <div className="s5-item">
              <div className="s5-icon">&darr;</div>
              <h3>Alerts</h3>
              <p>Slack, email, webhooks, API. Route by severity to the right team.</p>
            </div>
            <div className="s5-item">
              <div className="s5-icon">PDF</div>
              <h3>Reports</h3>
              <p>Redline compliance exports. Audit-ready documentation.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Scene 6: CTA */}
      <div className={`text-layer s6${activeScenes.scene6 ? ' active' : ''}`}>
        <div>
          <h2>Stop getting<br /><i>blindsided.</i></h2>
          <p className="s6-sub">Start monitoring your vendor stack today. 7 days free.</p>
          <Link href="/pricing" className="cta-btn">Start free trial</Link>
        </div>
      </div>

      {/* Post-scroll content */}
      <div className="post-scroll">
        {/* Choose your path */}
        <section className="cyp-section">
          <h2 className="cyp-heading">Choose your path</h2>
          <div className="cyp-grid">
            <div className="cyp-card">
              <div className="cyp-label managed">MANAGED SERVICE</div>
              <h3 className="cyp-title">We watch. You get alerted.</h3>
              <p className="cyp-body">
                StackDrift monitors 54+ vendors across your stack and alerts
                you the moment something changes. No setup. No maintenance.
              </p>
              <div className="cyp-cta-wrap">
                <Link href="/pricing" className="cyp-btn-primary">Start Free Trial</Link>
                <span className="cyp-sublabel">From $9/mo &middot; 7-day free trial</span>
              </div>
            </div>
            <div className="cyp-card">
              <div className="cyp-label blueprint">ONE-TIME PURCHASE</div>
              <h3 className="cyp-title">Own the agent. Run it yourself.</h3>
              <p className="cyp-body">
                The exact monitoring engine powering StackDrift, packaged as
                a Claude Code blueprint. 54 vendors, 7 safeguards, $1&ndash;3/mo in API costs.
              </p>
              <div className="cyp-cta-wrap">
                <Link href="/blueprint" className="cyp-btn-secondary">Get the Blueprint &mdash; $49</Link>
                <span className="cyp-sublabel">One-time &middot; Deploy in 30 min &middot; Keep forever</span>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="lp-faq">
          <h2>Common questions</h2>
          <div className="lp-faq-list">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className={`lp-faq-item${openFaq === i ? ' open' : ''}`}>
                <button
                  className="lp-faq-q"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  <span>{item.q}</span>
                  <span className="lp-faq-icon">{openFaq === i ? '\u2212' : '+'}</span>
                </button>
                <div className="lp-faq-a">
                  <p>{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <div className="lp-footer-wrap">
          <div className="lp-footer-inner">
            <div className="lp-footer-left">
              <div className="lp-footer-logo">StackDrift</div>
              <p>Monitoring the fine print so you don&apos;t have to.</p>
            </div>
            <div className="lp-footer-cols">
              <div className="lp-footer-col">
                <h4>Product</h4>
                <Link href="/pricing">Pricing</Link>
                <Link href="/pricing">Get started</Link>
                <Link href="/dashboard">Dashboard</Link>
              </div>
              <div className="lp-footer-col">
                <h4>Resources</h4>
                <Link href="/intel">Drift Intel</Link>
                <Link href="/about">About</Link>
                <a href="mailto:support@stackdrift.app">Support</a>
              </div>
              <div className="lp-footer-col">
                <h4>Legal</h4>
                <Link href="/privacy">Privacy</Link>
                <Link href="/terms">Terms</Link>
              </div>
              <div className="lp-footer-col">
                <h4>Social</h4>
                <a href="https://x.com/Trish_DIntel" target="_blank" rel="noopener noreferrer">X (Twitter)</a>
                <a href="https://www.linkedin.com/in/trish-t-4670b93b2/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
              </div>
            </div>
          </div>
          <div className="lp-footer-copy">
            <span>&copy; 2026 StackDrift</span>
            <span>
              <Link href="/privacy">Privacy</Link> &middot; <Link href="/terms">Terms</Link>
            </span>
          </div>
        </div>
      </div>

      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
    </main>
  );
}
