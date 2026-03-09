'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { Logo } from '../components/Logo';
import { useAuth } from '../components/AuthProvider';
import { UserMenu } from '../components/UserMenu';
import { LoginModal } from '../components/LoginModal';
import { useState } from 'react';
import { goToBlueprintCheckout } from '@/lib/stripe/actions';

const FEATURES = [
  { icon: '54+', title: '54 vendors, 138 documents', desc: 'TOS, privacy, pricing, API terms across 9 categories' },
  { icon: '\u{1F6E1}', title: '7 production safeguards', desc: 'Content floors, removal gates, stale baselines, retry logic' },
  { icon: '\u{1F4C4}', title: '4 workflow files', desc: 'Monitor, process change, alert dispatch, first-run setup' },
  { icon: '\u26A1', title: '3 stack profiles', desc: 'AI tools, payments, cloud infrastructure \u2014 or build your own' },
  { icon: 'AI', title: 'Claude Sonnet analysis', desc: 'AI-powered risk assessment: summary, impact, action items' },
  { icon: '\u{1F514}', title: 'Multi-channel alerts', desc: 'Email via Resend, Slack webhooks, HMAC-signed webhooks' },
];

function BlueprintContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const { user, loading: authLoading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  async function handlePurchase() {
    setPurchasing(true);
    try {
      await goToBlueprintCheckout();
    } catch (err) {
      setPurchasing(false);
      alert(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  }

  return (
    <main className="blueprint-page">
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

      {/* Hero */}
      <section className="bp-hero">
        <h1>The Vendor Watch Blueprint</h1>
        <p>
          6 months of production vendor monitoring, packaged as a Claude Code
          agent. Buy once, run forever.
        </p>
        {error === 'payment_failed' && (
          <div className="bp-error">
            Payment could not be verified. Please try again or contact support.
          </div>
        )}
      </section>

      {/* What's included */}
      <section className="bp-grid">
        <h2>What&apos;s included</h2>
        <div className="bp-grid-items">
          {FEATURES.map((f, i) => (
            <div key={i} className="bp-grid-item">
              <div className="bp-grid-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bp-steps">
        <h2>How it works</h2>
        <div className="bp-steps-row">
          <div className="bp-step">
            <div className="bp-step-num">Step 1</div>
            <h3>Install</h3>
            <p>npm install + add your Anthropic API key</p>
          </div>
          <div className="bp-step">
            <div className="bp-step-num">Step 2</div>
            <h3>Configure</h3>
            <p>Choose full catalog or a stack profile</p>
          </div>
          <div className="bp-step">
            <div className="bp-step-num">Step 3</div>
            <h3>Scan</h3>
            <p>Run the agent &mdash; baselines on first run, alerts on changes</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bp-cta">
        <button className="bp-cta-btn" onClick={handlePurchase} disabled={purchasing}>
          {purchasing ? 'Redirecting\u2026' : 'Get the Blueprint \u2014 $49'}
        </button>
        <p className="bp-cta-sub">
          One-time purchase &middot; Deploy in 30 min &middot; Keep forever
        </p>
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
              <Link href="/blueprint">Blueprint</Link>
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

      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
    </main>
  );
}

export default function BlueprintPage() {
  return (
    <Suspense>
      <BlueprintContent />
    </Suspense>
  );
}
