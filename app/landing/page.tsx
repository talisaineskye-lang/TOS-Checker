'use client';

import { useEffect, useRef } from 'react';

export default function LandingPage() {
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
  }, []);

  return (
    <main className="landing-page">
      {/* Nav */}
      <nav className="lp-nav">
        <div className="inner">
          <div className="nav-left">
            <a className="nav-logo" href="/landing">
              <span className="nav-dot" />
              StackDrift
            </a>
            <a href="#monitor" className="nav-link">How it works</a>
            <a href="#targets" className="nav-link">What we track</a>
            <a href="#scoring" className="nav-link">Scoring</a>
            <a href="/intel" className="nav-link">Intel</a>
          </div>
          <div className="nav-right">
            <a className="pill pill-solid nav-pill" href="/onboarding">Early access</a>
          </div>
        </div>
      </nav>

      <div className="wrap">
        {/* Hero */}
        <section className="hero">
          <div className="tag tag-green">Vendor monitoring system</div>
          <h1>
            They changed the rules.<br />
            <span className="dim">Did you notice?</span>
          </h1>
          <p className="hero-sub">
            Your vendors update their Terms of Service, Privacy Policies, and Pricing
            pages constantly. Most changes are buried. Some can break your business.
          </p>
          <div className="hero-pills">
            <a className="pill pill-solid" href="/onboarding">Start monitoring</a>
            <a href="#monitor" className="pill pill-ghost">How it works</a>
          </div>
        </section>

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

        {/* CTA */}
        <section className="lp-cta lp-reveal" ref={(el) => { revealRefs.current[6] = el; }}>
          <h2>Stop getting<br />blindsided.</h2>
          <p>Start monitoring your vendor stack today. Free during early access.</p>
          <div className="cta-pills">
            <a className="pill pill-solid" href="/onboarding">Get early access</a>
          </div>
        </section>

        {/* Footer */}
        <footer className="lp-footer">
          <span>&copy; 2026 StackDrift</span>
          <div className="f-links">
            <a href="/intel">Intel</a>
            <a href="/onboarding">Get started</a>
          </div>
        </footer>
      </div>
    </main>
  );
}
