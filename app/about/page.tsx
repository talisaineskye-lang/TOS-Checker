import type { Metadata } from 'next';
import { Logo } from '@/app/components/Logo';

export const metadata: Metadata = {
  title: 'About StackDrift — SaaS Vendor Policy Monitoring Platform',
  description:
    'StackDrift is a vendor policy monitoring platform that tracks changes to Terms of Service, privacy policies, and pricing pages across 54+ SaaS vendors. Built for indie devs and SaaS teams.',
  alternates: { canonical: '/about' },
  openGraph: { url: '/about' },
};

export default function AboutPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'StackDrift',
    url: 'https://www.stackdrift.app',
    logo: 'https://www.stackdrift.app/icon-256x256.png',
    description:
      'StackDrift is a vendor policy monitoring platform for SaaS teams. It tracks changes to Terms of Service, privacy policies, and pricing pages with AI-powered severity scoring.',
    foundingDate: '2026',
    foundingLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressRegion: 'Alberta',
        addressCountry: 'CA',
      },
    },
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'support@stackdrift.app',
      contactType: 'customer service',
    },
  };

  return (
    <main className="about-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="about-nav">
        <a href="/" className="about-nav-logo">
          <Logo size="sm" />
        </a>
      </nav>

      <div className="about-container">
        <header className="about-header">
          <span className="about-label">ABOUT</span>
          <h1 className="about-title">About StackDrift</h1>
          <p className="about-sub">
            Vendor policy monitoring for SaaS teams, indie developers, and
            compliance professionals.
          </p>
        </header>

        <section className="about-section">
          <h2>What is StackDrift?</h2>
          <p>
            StackDrift is a <strong>vendor policy monitoring platform</strong> that
            automatically tracks changes to Terms of Service, privacy policies,
            acceptable use policies, and pricing pages across your entire SaaS
            vendor stack.
          </p>
          <p>
            When a vendor updates their legal or pricing documents, StackDrift
            detects the change within hours, classifies its severity using AI, and
            delivers a plain-English summary with a line-by-line diff. Alerts route
            to Slack, email, or webhooks so the right team sees the right changes.
          </p>
        </section>

        <section className="about-section">
          <h2>Why StackDrift Exists</h2>
          <p>
            Your SaaS vendors update their terms constantly. A liability cap gets
            halved. A data-sharing clause appears. A pricing tier disappears. These
            changes happen every week, and most go unnoticed until the damage is
            done.
          </p>
          <p>
            StackDrift was built to solve this blind spot. Instead of manually
            checking vendor pages or relying on email notifications that never come,
            StackDrift provides continuous, automated monitoring with AI-powered
            analysis.
          </p>
        </section>

        <section className="about-section">
          <h2>How It Works</h2>
          <p>
            StackDrift follows a four-step process: <strong>monitoring</strong>,{' '}
            <strong>detection</strong>, <strong>AI analysis</strong>, and{' '}
            <strong>alerts</strong>.
          </p>
          <p>
            We scan vendor documents every six hours. When a change is detected,
            our AI classifier evaluates the severity based on the nature of the
            change &mdash; liability shifts, data sharing modifications, and pricing
            changes are flagged as critical or warning, while minor wording updates
            are classified as notice-level.
          </p>
          <p>
            Each change is presented as a clean, line-by-line diff with a
            plain-English summary of what changed, why it matters, and what action
            you should take. Pro and Business plans include real-time alerts via
            Slack, email, and webhooks, plus a JSON API for custom integrations.
          </p>
        </section>

        <section className="about-section">
          <h2>What We Monitor</h2>
          <p>
            StackDrift currently tracks <strong>54+ curated vendors</strong> across
            nine categories:
          </p>
          <ul>
            <li>
              <strong>Payments &amp; Finance:</strong> Stripe, PayPal, Square,
              Wise, Gumroad, Paddle, Lemon Squeezy
            </li>
            <li>
              <strong>Cloud &amp; Infrastructure:</strong> AWS, Google Cloud,
              Azure, Cloudflare, Vercel, Netlify, Railway, Render, Neon
            </li>
            <li>
              <strong>AI &amp; Machine Learning:</strong> OpenAI, Anthropic,
              Google Gemini, Perplexity, Hugging Face, Replicate, OpenRouter,
              Groq, Mistral AI
            </li>
            <li>
              <strong>AI Builders:</strong> Lovable, Bolt.new, Cursor, Replit,
              Vercel v0, Bubble, FlutterFlow, Webflow, Framer, Windsurf,
              Wispr Flow, Manus
            </li>
            <li>
              <strong>Developer Tools:</strong> GitHub, Docker, Resend, Pinecone
            </li>
            <li>
              <strong>Automation &amp; Workflow:</strong> n8n, Zapier, Make
            </li>
            <li>
              <strong>Analytics:</strong> PostHog, Plausible, Mixpanel
            </li>
            <li>
              <strong>Scraping &amp; Data:</strong> Apify, Firecrawl, Browserbase
            </li>
            <li>
              <strong>Productivity &amp; Business:</strong> Notion, Cal.com,
              Linear, Slack
            </li>
          </ul>
          <p>
            Paid plans allow you to add custom vendors &mdash; any URL you want
            monitored for changes. Business plans support unlimited custom vendors.
          </p>
        </section>

        <section className="about-section">
          <h2>Drift Intel</h2>
          <p>
            Drift Intel is StackDrift&apos;s free curated news feed and weekly
            newsletter covering vendor policy changes, SaaS industry trends, AI
            developments, and regulatory updates relevant to indie developers and
            SaaS builders. Delivered every Friday, it provides a 5-minute briefing
            on what moved in the vendor landscape.
          </p>
          <p>
            Visit <a href="/intel">Drift Intel</a> to read the latest or subscribe
            to the newsletter.
          </p>
        </section>

        <section className="about-section">
          <h2>Contact</h2>
          <p>
            StackDrift is operated from Alberta, Canada. We are committed to
            PIPEDA compliance and respect your data privacy.
          </p>
          <p>
            <strong>General support:</strong>{' '}
            <a href="mailto:support@stackdrift.app">support@stackdrift.app</a>
            <br />
            <strong>Privacy inquiries:</strong>{' '}
            <a href="mailto:privacy@stackdrift.app">privacy@stackdrift.app</a>
          </p>
        </section>

        <footer className="about-footer">
          <span>&copy; 2026 StackDrift</span>
          <div className="f-links">
            <a href="/intel">Drift Intel</a>
            <a href="/pricing">Pricing</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <div className="f-social">
              <a href="https://x.com/Trish_DIntel" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="https://www.linkedin.com/in/trish-t-4670b93b2/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
