'use client';

import { useEffect, useRef, useState } from 'react';
import { Logo } from './components/Logo';
import { useAuth } from './components/AuthProvider';
import { UserMenu } from './components/UserMenu';
import { LoginModal } from './components/LoginModal';

export default function LandingPage() {
  const revealRefs = useRef<(HTMLElement | null)[]>([]);
  const { user, loading: authLoading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
  }, []);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'StackDrift',
    description: 'SaaS vendor policy monitoring platform that tracks changes to Terms of Service, Privacy Policies, and Pricing pages across 29+ SaaS vendors. Built for indie developers and small SaaS teams.',
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Vendor Management, Policy Monitoring, Compliance',
    operatingSystem: 'Web',
    url: 'https://www.stackdrift.app',
    offers: [
      {
        '@type': 'Offer',
        name: 'Solo',
        price: '9',
        priceCurrency: 'USD',
        priceValidUntil: '2026-12-31',
        description: 'Monitor 29 curated vendors with AI-powered change summaries',
      },
      {
        '@type': 'Offer',
        name: 'Pro',
        price: '29',
        priceCurrency: 'USD',
        priceValidUntil: '2026-12-31',
        description: 'Webhooks, Slack integration, and full change history for workflow automation',
      },
      {
        '@type': 'Offer',
        name: 'Business',
        price: '99',
        priceCurrency: 'USD',
        priceValidUntil: '2026-12-31',
        description: 'Team seats, audit logs, redline PDF exports, and renewal reminders for compliance-ready teams',
      },
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
    creator: {
      '@type': 'Organization',
      name: 'StackDrift',
      url: 'https://www.stackdrift.app',
    },
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is StackDrift?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'StackDrift is a SaaS vendor policy monitoring platform that automatically tracks changes to Terms of Service, Privacy Policies, Acceptable Use Policies, and Pricing pages across 29+ SaaS vendors including Stripe, AWS, Vercel, OpenAI, and Anthropic.',
        },
      },
      {
        '@type': 'Question',
        name: 'Who is StackDrift for?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'StackDrift is built for indie developers, startup founders, and small SaaS teams who depend on third-party vendors but don\'t have legal departments to monitor policy changes.',
        },
      },
      {
        '@type': 'Question',
        name: 'How does StackDrift detect vendor policy changes?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'StackDrift automatically fetches and hashes vendor policy documents on a regular schedule. When a change is detected, AI analyzes the diff to determine what changed, why it matters, and what action you should take, then classifies the severity as critical, warning, or notice.',
        },
      },
      {
        '@type': 'Question',
        name: 'What vendors does StackDrift monitor?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'StackDrift monitors 29+ SaaS vendors across categories including payment processors (Stripe, PayPal, Square), cloud infrastructure (AWS, Vercel, Netlify), AI platforms (OpenAI, Anthropic, Google Gemini), and development tools (GitHub, Cursor, Bolt.new).',
        },
      },
      {
        '@type': 'Question',
        name: 'How much does StackDrift cost?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'StackDrift offers three paid plans: Solo at $9/month for individual monitoring, Pro at $29/month for automation and workflow integration, and Business at $99/month for teams needing compliance features like audit logs and redline PDF exports. Annual billing saves 20%.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is Drift Intel?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Drift Intel is StackDrift\'s free weekly newsletter and news feed covering SaaS vendor policy changes, AI industry developments, compliance updates, and business news relevant to indie developers and SaaS builders.',
        },
      },
    ],
  };

  return (
    <main className="landing-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {/* Nav */}
      <nav className="lp-nav">
        <div className="inner">
          <div className="nav-left">
            <a className="nav-logo" href="/">
              <Logo size="sm" />
            </a>
            <a href="#monitor" className="nav-link">How it works</a>
            <a href="#targets" className="nav-link">What we track</a>
            <a href="#scoring" className="nav-link">Scoring</a>
            <a href="/intel" className="nav-link">Intel</a>
            <a href="/pricing" className="nav-link">Pricing</a>
          </div>
          <div className="nav-right">
            {!authLoading && (
              <>
                {user ? (
                  <UserMenu />
                ) : (
                  <button className="nav-cta" onClick={() => setShowLogin(true)}>
                    Sign in
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero — two-column with radar */}
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-label">
            <span className="hero-label-dot" />
            <span>Vendor Monitoring System</span>
          </div>
          <h1 className="hero-h1">
            They changed the rules.<br />
            <span className="dim">Did you notice?</span>
          </h1>
          <p className="hero-sub">
            Your vendors update their Terms of Service, Privacy Policies, and Pricing
            pages constantly. Most changes are buried. Some can break your business.
          </p>
          <div className="hero-btns">
            <a className="btn-primary" href="/onboarding">Start monitoring</a>
            <a href="#monitor" className="btn-secondary">How it works</a>
          </div>
          <div className="stats-bar">
            <div className="stat">
              <span className="stat-val">29</span>
              <span className="stat-label">Vendors tracked</span>
            </div>
            <div className="stat">
              <span className="stat-val">98</span>
              <span className="stat-label">Documents</span>
            </div>
            <div className="stat">
              <span className="stat-val">6h</span>
              <span className="stat-label">Refresh cycle</span>
            </div>
          </div>
        </div>

        <div className="hero-radar">
          <div className="radar-container">
            <div className="radar-ring radar-ring-1" />
            <div className="radar-ring radar-ring-2" />
            <div className="radar-ring radar-ring-3" />
            <div className="radar-ring radar-ring-4" />
            <div className="radar-sweep-trail" />
            <div className="radar-sweep" />
            <div className="radar-core" />
            <div className="radar-blip blip-1" />
            <div className="radar-blip blip-2" />
            <div className="radar-blip blip-3" />
            <div className="radar-blip blip-4" />
            <div className="radar-blip blip-5" />
            <span className="blip-label label-1">Stripe TOS</span>
            <span className="blip-label label-2">Vercel pricing</span>
            <span className="blip-label label-3">Supabase policy</span>
            <span className="blip-label label-4">OpenAI terms</span>
            <span className="blip-label label-5">Heroku sunset</span>
          </div>
        </div>
      </section>

      <div className="wrap">
        {/* Row 1: Live Feed */}
        <div id="monitor" className="lp-row lp-reveal" ref={(el) => { revealRefs.current[0] = el; }}>
          <div>
            <div className="feed-console">
              <div className="fc-head">
                <span className="fc-title">CHANGE FEED</span>
                <span className="fc-live">LIVE</span>
              </div>
              <div className="fc-body">
                <div className="fc-item">
                  <div className="fc-sev sr" />
                  <div className="fc-info">
                    <div className="fc-vendor">Stripe</div>
                    <div className="fc-detail">TOS &sect;7.2 &mdash; Liability cap reduced to 3-month fees</div>
                  </div>
                  <div className="fc-time">2h</div>
                </div>
                <div className="fc-item">
                  <div className="fc-sev sr" />
                  <div className="fc-info">
                    <div className="fc-vendor">Stripe</div>
                    <div className="fc-detail">TOS &sect;12.1 &mdash; Data sharing with affiliated partners</div>
                  </div>
                  <div className="fc-time">2h</div>
                </div>
                <div className="fc-item">
                  <div className="fc-sev sa" />
                  <div className="fc-info">
                    <div className="fc-vendor">PayPal</div>
                    <div className="fc-detail">Privacy &mdash; Data retention changed to 7 years</div>
                  </div>
                  <div className="fc-time">3d</div>
                </div>
                <div className="fc-item">
                  <div className="fc-sev sa" />
                  <div className="fc-info">
                    <div className="fc-vendor">OpenAI</div>
                    <div className="fc-detail">API Terms &mdash; Rate limiting clause added</div>
                  </div>
                  <div className="fc-time">5d</div>
                </div>
                <div className="fc-item">
                  <div className="fc-sev sy" />
                  <div className="fc-info">
                    <div className="fc-vendor">AWS</div>
                    <div className="fc-detail">AUP &mdash; Minor wording in &sect;3.4</div>
                  </div>
                  <div className="fc-time">12d</div>
                </div>
                <div className="fc-item">
                  <div className="fc-sev sg" />
                  <div className="fc-info">
                    <div className="fc-vendor">Cloudflare</div>
                    <div className="fc-detail">No changes &mdash; 45 days stable</div>
                  </div>
                  <div className="fc-time">45d</div>
                </div>
              </div>
            </div>
          </div>
          <div className="row-content">
            <div className="tag">Real-time monitoring</div>
            <h2>Every change, the moment it happens.</h2>
            <p>
              We scan your vendors&apos; legal and pricing documents daily. When
              something changes, you see it immediately &mdash; severity-scored and
              summarized in plain English.
            </p>
            <p>No more finding out after the damage is done.</p>
          </div>
        </div>

        {/* Row 2: Diff */}
        <div className="lp-row flip lp-reveal" ref={(el) => { revealRefs.current[1] = el; }}>
          <div>
            <div className="console">
              <div className="console-head">
                <div className="console-dots">
                  <span /><span /><span />
                </div>
                <span className="console-path">stripe / terms-of-service.md</span>
                <span className="console-badge">CRITICAL</span>
              </div>
              <div className="console-body">
                <div className="cl ctx">&sect;7.2 &mdash; Liability</div>
                <div className="cl rem">- Stripe liable for direct damages up to total fees paid.</div>
                <div className="cl add">+ Liability capped at fees paid in preceding 3 months.</div>
                <div className="cl ctx">{'\u00A0'}</div>
                <div className="cl ctx">&sect;12.1 &mdash; Data Processing</div>
                <div className="cl rem">- Customer data not shared without explicit consent.</div>
                <div className="cl add">+ Data may be shared with affiliated partners for service improvement.</div>
              </div>
            </div>
          </div>
          <div className="row-content">
            <div className="tag">Output format</div>
            <h2>Clear diffs. Not legal soup.</h2>
            <p>
              Every detected change is presented as a clean, line-by-line diff with
              severity scoring. You see exactly what was added, removed, or modified.
            </p>
            <p>Plus a plain-English summary of what it means for your business.</p>
          </div>
        </div>

        {/* Row 3: Problem */}
        <div className="lp-row lp-reveal" ref={(el) => { revealRefs.current[2] = el; }}>
          <div className="row-content">
            <div className="tag">The problem</div>
            <h2>
              Your vendors update their legal pages constantly. Most changes are buried.
            </h2>
            <p>
              A liability cap gets halved. A data-sharing clause appears. A pricing
              tier disappears. These aren&apos;t hypotheticals &mdash; they happen every
              week across your vendor stack.
            </p>
            <p>By the time you notice, the damage is already done.</p>
          </div>
          <div className="row-content" style={{ maxWidth: 380 }}>
            <div className="risk-block">
              <div className="tag" style={{ color: 'var(--lp-red)' }}>Silent pricing changes</div>
              <p>
                A vendor changes their model or adds usage caps. You find out when
                your bill doubles.
              </p>
            </div>
            <div className="risk-block">
              <div className="tag" style={{ color: 'var(--lp-amber)' }}>Data policy shifts</div>
              <p>
                A new clause about sharing user data with third parties. Your privacy
                commitment becomes a liability.
              </p>
            </div>
            <div className="risk-block">
              <div className="tag" style={{ color: 'var(--lp-yellow)' }}>Liability transfers</div>
              <p>
                An indemnification clause shifts responsibility to you. Things that
                were the vendor&apos;s problem become yours.
              </p>
            </div>
          </div>
        </div>

        {/* Row 4: Integrations */}
        <div className="lp-row flip lp-reveal" ref={(el) => { revealRefs.current[3] = el; }}>
          <div className="row-content" style={{ maxWidth: 380 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <span className="pill pill-ghost pill-sm">Slack</span>
              <span className="pill pill-ghost pill-sm">Email</span>
              <span className="pill pill-ghost pill-sm">Webhooks</span>
              <span className="pill pill-ghost pill-sm">RSS</span>
              <span className="pill pill-ghost pill-sm">API</span>
              <span className="pill pill-ghost pill-sm">PagerDuty</span>
            </div>
          </div>
          <div className="row-content">
            <div className="tag">Integrations</div>
            <h2>Alerts go where your team already works.</h2>
            <p>
              Route by severity. Critical changes go to legal, pricing changes go to
              finance, API changes go to engineering. Configure once, never miss what
              matters.
            </p>
          </div>
        </div>

        {/* Document Types */}
        <section id="targets" className="types-row lp-reveal" ref={(el) => { revealRefs.current[4] = el; }}>
          <div className="tag">Document types</div>
          <h2>What we watch.</h2>
          <div className="type-list">
            <div className="type-item">
              <div className="t-accent" />
              <h4>Terms of Service</h4>
              <p>
                Liability, termination, IP ownership, dispute resolution &mdash; the
                clauses that matter when things go wrong.
              </p>
            </div>
            <div className="type-item">
              <div className="t-accent" />
              <h4>Privacy Policy</h4>
              <p>
                Data collection, sharing, retention, cross-border transfers. Your
                compliance depends on theirs.
              </p>
            </div>
            <div className="type-item">
              <div className="t-accent" />
              <h4>Acceptable Use</h4>
              <p>
                A new restriction here could make your entire product non-compliant
                overnight.
              </p>
            </div>
            <div className="type-item">
              <div className="t-accent" />
              <h4>Pricing Pages</h4>
              <p>
                Rate changes, deprecated plans, new caps. Know before your margins
                disappear.
              </p>
            </div>
          </div>
        </section>

        {/* Severity */}
        <section id="scoring" className="sev-row lp-reveal" ref={(el) => { revealRefs.current[5] = el; }}>
          <div className="tag" style={{ marginBottom: 32 }}>Severity scoring</div>
          <div className="sev-scale">
            <div className="sev-item">
              <h5>Critical</h5>
              <p>Liability shifts, data sharing changes, termination modifications</p>
            </div>
            <div className="sev-item">
              <h5>Warning</h5>
              <p>Pricing changes, new restrictions, compliance-affecting updates</p>
            </div>
            <div className="sev-item">
              <h5>Notice</h5>
              <p>Minor wording, formatting, or clarification changes</p>
            </div>
            <div className="sev-item">
              <h5>Stable</h5>
              <p>No changes detected since last scan</p>
            </div>
          </div>
        </section>

        {/* Brand Definition */}
        <section className="lp-brand lp-reveal" ref={(el) => { revealRefs.current[6] = el; }}>
          <div className="tag">About StackDrift</div>
          <h2>What is StackDrift?</h2>
          <p>
            StackDrift is a <strong>vendor policy monitoring platform</strong> built for
            SaaS teams, indie developers, and compliance professionals. It automatically
            tracks changes to Terms of Service, privacy policies, acceptable use
            policies, and pricing pages across your entire vendor stack.
          </p>
          <p>
            When a vendor updates their legal or pricing documents, StackDrift detects
            the change within hours, classifies its severity using AI, and delivers a
            plain-English summary with a line-by-line diff. Alerts route to Slack,
            email, or webhooks &mdash; so legal, finance, and engineering each see what
            matters to them.
          </p>
          <p>
            Founded in 2026 and based in Canada, StackDrift currently monitors 29+
            curated vendors across payments, cloud infrastructure, AI platforms, and
            developer tools &mdash; with support for unlimited custom vendors on higher
            tiers.
          </p>
        </section>

        {/* CTA */}
        <section className="lp-cta lp-reveal" ref={(el) => { revealRefs.current[7] = el; }}>
          <h2>Stop getting<br />blindsided.</h2>
          <p>Start monitoring your vendor stack today. Free during early access.</p>
          <div className="cta-pills">
            <a className="btn-primary" href="/onboarding">Get early access</a>
          </div>
        </section>

        {/* FAQ */}
        <section className="lp-faq lp-reveal" ref={(el) => { revealRefs.current[8] = el; }}>
          <div className="tag">Frequently asked questions</div>
          <h2>Common questions about StackDrift</h2>
          <div className="lp-faq-list">
            {[
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
                a: 'We monitor 29+ vendors across payments (Stripe, PayPal), cloud (AWS, Vercel, Cloudflare), AI (OpenAI, Anthropic), and developer tools (GitHub, Cursor). Pro and Business plans let you add custom vendors.',
              },
              {
                q: 'How is StackDrift different from a Google Alert?',
                a: 'Google Alerts monitors news mentions. StackDrift monitors the actual legal and pricing documents themselves, detects exact changes with line-by-line diffs, classifies severity with AI, and routes alerts to the right team. It\u2019s purpose-built for vendor risk.',
              },
              {
                q: 'Can I integrate StackDrift with my existing tools?',
                a: 'Yes. Pro and Business plans include Slack integration, webhooks, and a JSON API. You can route alerts by severity to different channels \u2014 critical changes to legal, pricing changes to finance, API changes to engineering.',
              },
            ].map((item, i) => (
              <div
                key={i}
                className={`lp-faq-item${openFaq === i ? ' open' : ''}`}
              >
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
        <footer className="lp-footer">
          <span>&copy; 2026 StackDrift</span>
          <div className="f-links">
            <a href="/intel">Intel</a>
            <a href="/pricing">Pricing</a>
            <a href="/about">About</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="mailto:support@stackdrift.app">support@stackdrift.app</a>
          </div>
        </footer>
      </div>

      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
    </main>
  );
}
