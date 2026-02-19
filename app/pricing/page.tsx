'use client';

import { useState } from 'react';
import { Logo } from '../components/Logo';
import { useAuth } from '../components/AuthProvider';
import { UserMenu } from '../components/UserMenu';
import { LoginModal } from '../components/LoginModal';
import { goToCheckout } from '@/lib/stripe/actions';
import type { PlanName } from '@/lib/stripe/prices';

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  const toggleBilling = () => setAnnual((prev) => !prev);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'StackDrift Pricing',
    url: 'https://www.stackdrift.app/pricing',
    description: 'StackDrift pricing plans for SaaS vendor monitoring. Solo, Pro, and Business tiers.',
    mainEntity: {
      '@type': 'Product',
      name: 'StackDrift',
      description: 'SaaS vendor policy monitoring with AI-powered change detection and alerts.',
      offers: [
        {
          '@type': 'Offer',
          name: 'Solo',
          price: '9',
          priceCurrency: 'USD',
          priceValidUntil: '2026-12-31',
          description: '29 curated vendors, up to 5 custom vendors, weekly digest, AI summaries.',
          url: 'https://www.stackdrift.app/pricing',
          availability: 'https://schema.org/InStock',
        },
        {
          '@type': 'Offer',
          name: 'Pro',
          price: '29',
          priceCurrency: 'USD',
          priceValidUntil: '2026-12-31',
          description: 'Everything in Solo plus real-time alerts, Slack, webhooks, API, 20 custom vendors.',
          url: 'https://www.stackdrift.app/pricing',
          availability: 'https://schema.org/InStock',
        },
        {
          '@type': 'Offer',
          name: 'Business',
          price: '99',
          priceCurrency: 'USD',
          priceValidUntil: '2026-12-31',
          description: 'Everything in Pro plus team seats, compliance tagging, redline PDFs, unlimited vendors.',
          url: 'https://www.stackdrift.app/pricing',
          availability: 'https://schema.org/InStock',
        },
      ],
    },
  };

  return (
    <main className="pricing-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Nav */}
      <nav className="lp-nav">
        <div className="inner">
          <div className="nav-left">
            <a className="nav-logo" href="/">
              <Logo size="sm" />
            </a>
            <a href="/intel" className="nav-link">Intel</a>
            <a href="/#how" className="nav-link">How it works</a>
            <a href="/pricing" className="nav-link active">Pricing</a>
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

      {/* Hero */}
      <section className="pp-hero">
        <div className="pp-badge"><span className="pp-badge-dot" /> PRICING</div>
        <h1>StackDrift Pricing<br /><span className="dim">Plans for Every Team Size</span></h1>
        <p className="pp-sub">
          Know the moment your vendors change the rules. Choose the tier that fits how you work.
        </p>

        <div className="pp-toggle">
          <span
            className={`pp-toggle-label ${!annual ? 'active' : ''}`}
            onClick={() => annual && toggleBilling()}
          >
            Monthly
          </span>
          <div
            className={`pp-toggle-track ${annual ? 'on' : ''}`}
            onClick={toggleBilling}
          >
            <div className="pp-toggle-thumb" />
          </div>
          <span
            className={`pp-toggle-label ${annual ? 'active' : ''}`}
            onClick={() => !annual && toggleBilling()}
          >
            Annual
          </span>
          <span className="pp-save-badge">Save 20%</span>
        </div>
      </section>

      {/* Pricing Grid */}
      <div className="pp-grid">
        {/* Solo */}
        <div className="pp-tier pp-solo">
          <div className="pp-tier-name">Solo</div>
          <div className="pp-tier-tagline">Stay informed. Know the moment your vendors change the rules.</div>
          <div className="pp-price">
            <span className="pp-currency">$</span>
            <span className="pp-amount">{annual ? '7' : '9'}</span>
          </div>
          <div className="pp-period">/month</div>
          <div className="pp-annual">
            {annual ? '$84/yr billed annually' : 'Switch to annual — save 20%'}
          </div>
          <button className="pp-cta" onClick={() => goToCheckout('solo', annual ? 'annual' : 'monthly')}>Start monitoring</button>
          <div className="pp-divider" />
          <div className="pp-features">
            <div className="pp-feat">
              <span className="pp-fi yes">&#10003;</span>
              <span className="pp-fl">29 curated vendors<span className="pp-fd">Payments, cloud, AI, dev tools</span></span>
            </div>
            <div className="pp-feat">
              <span className="pp-fi yes">&#10003;</span>
              <span className="pp-fl">Up to 5 custom vendors<span className="pp-lim cyan">5</span></span>
            </div>
            <div className="pp-feat">
              <span className="pp-fi yes">&#10003;</span>
              <span className="pp-fl">Personalized weekly digest<span className="pp-fd">Your stack changes, delivered every Friday</span></span>
            </div>
            <div className="pp-feat">
              <span className="pp-fi yes">&#10003;</span>
              <span className="pp-fl">AI-powered change summaries</span>
            </div>
            <div className="pp-feat">
              <span className="pp-fi yes">&#10003;</span>
              <span className="pp-fl">Full Intel feed access</span>
            </div>
            <div className="pp-feat">
              <span className="pp-fi yes">&#10003;</span>
              <span className="pp-fl">Severity scoring &amp; classification</span>
            </div>
            <div className="pp-feat disabled">
              <span className="pp-fi no">&mdash;</span>
              <span className="pp-fl">Real-time alerts</span>
            </div>
            <div className="pp-feat disabled">
              <span className="pp-fi no">&mdash;</span>
              <span className="pp-fl">Webhooks &amp; JSON API</span>
            </div>
            <div className="pp-feat disabled">
              <span className="pp-fi no">&mdash;</span>
              <span className="pp-fl">Slack integration</span>
            </div>
          </div>
        </div>

        {/* Pro */}
        <div className="pp-tier pp-pro">
          <span className="pp-popular">MOST POPULAR</span>
          <div className="pp-tier-name">Pro</div>
          <div className="pp-tier-tagline">Automate it. Pipe vendor intel directly into your workflow.</div>
          <div className="pp-price">
            <span className="pp-currency">$</span>
            <span className="pp-amount">{annual ? '23' : '29'}</span>
          </div>
          <div className="pp-period">/month</div>
          <div className="pp-annual">
            {annual ? '$276/yr billed annually' : 'Switch to annual — save 20%'}
          </div>
          <button className="pp-cta" onClick={() => goToCheckout('pro', annual ? 'annual' : 'monthly')}>Start monitoring</button>
          <div className="pp-divider" />
          <div className="pp-features">
            <div className="pp-feat">
              <span className="pp-fi yes">&#10003;</span>
              <span className="pp-fl">Everything in Solo</span>
            </div>
            <div className="pp-feat">
              <span className="pp-fi pro">&#10003;</span>
              <span className="pp-fl">Up to 20 custom vendors<span className="pp-lim blue">20</span></span>
            </div>
            <div className="pp-feat">
              <span className="pp-fi pro">&#10003;</span>
              <span className="pp-fl">Real-time email alerts<span className="pp-fd">Notified the moment something changes</span></span>
            </div>
            <div className="pp-feat">
              <span className="pp-fi pro">&#10003;</span>
              <span className="pp-fl">Webhooks &amp; JSON API<span className="pp-fd">Push structured data to your stack</span></span>
            </div>
            <div className="pp-feat">
              <span className="pp-fi pro">&#10003;</span>
              <span className="pp-fl">Slack integration<span className="pp-fd">Alerts in your channels</span></span>
            </div>
            <div className="pp-feat">
              <span className="pp-fi pro">&#10003;</span>
              <span className="pp-fl">Full change history &amp; diffs</span>
            </div>
            <div className="pp-feat">
              <span className="pp-fi pro">&#10003;</span>
              <span className="pp-fl">Priority vendor requests</span>
            </div>
          </div>
        </div>

        {/* Business */}
        <div className="pp-tier pp-biz">
          <div className="pp-tier-name">Business</div>
          <div className="pp-tier-tagline">Compliance-ready. Built for teams that manage vendor risk.</div>
          <div className="pp-price">
            <span className="pp-currency">$</span>
            <span className="pp-amount">{annual ? '79' : '99'}</span>
          </div>
          <div className="pp-period">/month</div>
          <div className="pp-annual">
            {annual ? '$948/yr billed annually' : 'Switch to annual — save 20%'}
          </div>
          <a className="pp-cta" href="mailto:info@stackdrift.app?subject=StackDrift Business Plan Inquiry">Contact us</a>
          <div className="pp-divider" />
          <div className="pp-features">
            <div className="pp-feat">
              <span className="pp-fi yes">&#10003;</span>
              <span className="pp-fl">Everything in Pro</span>
            </div>
            <div className="pp-feat">
              <span className="pp-fi biz">&#10003;</span>
              <span className="pp-fl">Unlimited custom vendors<span className="pp-lim green">&infin;</span></span>
            </div>
            <div className="pp-feat">
              <span className="pp-fi biz">&#10003;</span>
              <span className="pp-fl">Team seats &mdash; up to 10<span className="pp-fd">Shared dashboard &amp; alert routing</span></span>
            </div>
            <div className="pp-feat">
              <span className="pp-fi biz">&#10003;</span>
              <span className="pp-fl">Redline PDF exports<span className="pp-fd">Compliance-ready change reports</span></span>
            </div>
            <div className="pp-feat">
              <span className="pp-fi biz">&#10003;</span>
              <span className="pp-fl">Audit log &amp; data retention</span>
            </div>
            <div className="pp-feat">
              <span className="pp-fi biz">&#10003;</span>
              <span className="pp-fl">Shared alert routing<span className="pp-fd">Route to legal@, compliance@, security@</span></span>
            </div>
            <div className="pp-feat">
              <span className="pp-fi biz">&#10003;</span>
              <span className="pp-fl">Compliance tagging<span className="pp-fd">GDPR, HIPAA, SOC 2, PCI DSS &amp; custom</span></span>
            </div>
            <div className="pp-feat">
              <span className="pp-fi biz">&#10003;</span>
              <span className="pp-fl">Renewal reminders<span className="pp-fd">Never miss a contract renewal deadline</span></span>
            </div>
            <div className="pp-feat">
              <span className="pp-fi biz">&#10003;</span>
              <span className="pp-fl">Priority support</span>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison */}
      <section className="pp-compare">
        <div className="pp-compare-head">
          <h2>Compare plans</h2>
          <p>Side by side, feature by feature.</p>
        </div>
        <table className="pp-table">
          <thead>
            <tr>
              <th>Feature</th>
              <th>Solo</th>
              <th>Pro</th>
              <th>Business</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Curated vendors</td><td className="pp-tv">29</td><td className="pp-tv">29</td><td className="pp-tv">29</td></tr>
            <tr><td>Custom vendors</td><td className="pp-tv">5</td><td className="pp-tv">20</td><td className="pp-tv">&infin;</td></tr>
            <tr><td>AI change summaries</td><td className="pp-tc">&#10003;</td><td className="pp-tc">&#10003;</td><td className="pp-tc">&#10003;</td></tr>
            <tr><td>Intel feed</td><td className="pp-tc">&#10003;</td><td className="pp-tc">&#10003;</td><td className="pp-tc">&#10003;</td></tr>
            <tr><td>Personalized weekly digest</td><td className="pp-tc">&#10003;</td><td className="pp-tc">&#10003;</td><td className="pp-tc">&#10003;</td></tr>
            <tr><td>Real-time email alerts</td><td className="pp-td">&mdash;</td><td className="pp-tc">&#10003;</td><td className="pp-tc">&#10003;</td></tr>
            <tr><td>Webhooks &amp; JSON API</td><td className="pp-td">&mdash;</td><td className="pp-tc">&#10003;</td><td className="pp-tc">&#10003;</td></tr>
            <tr><td>Slack integration</td><td className="pp-td">&mdash;</td><td className="pp-tc">&#10003;</td><td className="pp-tc">&#10003;</td></tr>
            <tr><td>Full change history &amp; diffs</td><td className="pp-td">&mdash;</td><td className="pp-tc">&#10003;</td><td className="pp-tc">&#10003;</td></tr>
            <tr><td>Team seats</td><td className="pp-tv">1</td><td className="pp-tv">1</td><td className="pp-tv">Up to 10</td></tr>
            <tr><td>Redline PDF exports</td><td className="pp-td">&mdash;</td><td className="pp-td">&mdash;</td><td className="pp-tc">&#10003;</td></tr>
            <tr><td>Audit log</td><td className="pp-td">&mdash;</td><td className="pp-td">&mdash;</td><td className="pp-tc">&#10003;</td></tr>
            <tr><td>Shared alert routing</td><td className="pp-td">&mdash;</td><td className="pp-td">&mdash;</td><td className="pp-tc">&#10003;</td></tr>
            <tr><td>Compliance tagging</td><td className="pp-td">&mdash;</td><td className="pp-td">&mdash;</td><td className="pp-tc">&#10003;</td></tr>
            <tr><td>Renewal reminders</td><td className="pp-td">&mdash;</td><td className="pp-td">&mdash;</td><td className="pp-tc">&#10003;</td></tr>
          </tbody>
        </table>
      </section>

      {/* FAQ */}
      <section className="pp-faq">
        <div className="pp-faq-head"><h2>Questions</h2></div>

        <div className="pp-faq-item">
          <div className="pp-faq-q">What&apos;s a &ldquo;custom vendor&rdquo;?</div>
          <div className="pp-faq-a">Any URL you want monitored for changes &mdash; a SaaS provider&apos;s terms page, a competitor&apos;s pricing, a regulatory portal. We&apos;ll track it and alert you when content changes.</div>
        </div>

        <div className="pp-faq-item">
          <div className="pp-faq-q">What&apos;s the difference between the newsletter and the weekly digest?</div>
          <div className="pp-faq-a">The Drift Intel newsletter is free editorial content &mdash; curated industry news delivered every Monday. The personalized weekly digest is a paid feature &mdash; a summary of changes specific to the vendors on your watchlist, delivered every Friday. One is broadcast, the other is tailored to your stack. Monday: what&apos;s happening in the industry. Friday: what changed in yours.</div>
        </div>

        <div className="pp-faq-item">
          <div className="pp-faq-q">Which 29 vendors do you monitor?</div>
          <div className="pp-faq-a">Major platforms across payments, cloud, AI, and dev tools &mdash; including Stripe, Vercel, Supabase, AWS, OpenAI, Anthropic, GitHub, Cloudflare, and more. The full list is visible on the dashboard.</div>
        </div>

        <div className="pp-faq-item">
          <div className="pp-faq-q">Can I switch plans?</div>
          <div className="pp-faq-a">Anytime. Upgrades are prorated immediately. Downgrades take effect at your next billing date. No lock-in.</div>
        </div>

        <div className="pp-faq-item">
          <div className="pp-faq-q">What does the webhook payload look like?</div>
          <div className="pp-faq-a">A structured JSON payload with vendor name, document type, diff summary, severity rating, AI analysis, and affected categories. Built for easy automation with Zapier, Make, n8n, or your own backend.</div>
        </div>

        <div className="pp-faq-item">
          <div className="pp-faq-q">Is there a free tier?</div>
          <div className="pp-faq-a">The Drift Intel newsletter is free for everyone &mdash; curated vendor intel every Monday on the Intel page. For personalized monitoring, change detection, and alerts, you&apos;ll need a paid plan.</div>
        </div>

        <div className="pp-faq-item">
          <div className="pp-faq-q">What&apos;s a &ldquo;Redline PDF&rdquo;?</div>
          <div className="pp-faq-a">A compliance-ready document showing exactly what changed in a vendor&apos;s terms &mdash; additions in green, removals in red, like a legal redline. Useful for audits, board reporting, and regulatory compliance.</div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="pp-bottom-cta">
        <h2>Start monitoring today.</h2>
        <p>Set up in 2 minutes. No credit card required to explore.</p>
        <a href="/onboarding" className="pp-btn">Get started &rarr;</a>
      </section>

      {/* Footer */}
      <footer className="pp-footer">
        <a href="/" className="pp-footer-logo">
          <Logo size="sm" />
        </a>
        <span>&copy; 2026 StackDrift</span>
        <div className="f-links">
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
        </div>
      </footer>

      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
    </main>
  );
}
