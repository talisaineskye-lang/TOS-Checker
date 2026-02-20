import type { Metadata } from 'next';
import { Logo } from '@/app/components/Logo';

export const metadata: Metadata = {
  title: 'About StackDrift — SaaS Vendor Policy Monitoring Platform',
  description:
    'StackDrift is a vendor policy monitoring platform that tracks changes to Terms of Service, privacy policies, and pricing pages across 29+ SaaS vendors. Built for indie devs and SaaS teams.',
  alternates: { canonical: '/about' },
  openGraph: { url: '/about' },
};

export default function AboutPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'StackDrift',
    url: 'https://www.stackdrift.app',
    logo: 'https://www.stackdrift.app/logo-icon.png',
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
            StackDrift currently tracks <strong>29+ curated vendors</strong> across
            four categories:
          </p>
          <ul>
            <li>
              <strong>Payments &amp; Finance:</strong> Stripe, PayPal, Square,
              Wise, Gumroad, Paddle
            </li>
            <li>
              <strong>Cloud &amp; Infrastructure:</strong> AWS, Google Cloud,
              Azure, Cloudflare, Vercel, Netlify
            </li>
            <li>
              <strong>AI &amp; Machine Learning:</strong> OpenAI, Anthropic,
              Google Gemini, Perplexity, Hugging Face, Replicate
            </li>
            <li>
              <strong>AI Builders &amp; Dev Tools:</strong> GitHub, Cursor, Replit,
              Bolt.new, Lovable, Webflow, Framer, Bubble, FlutterFlow, Durable
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
            SaaS builders. Delivered every Monday, it provides a 5-minute briefing
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
          </div>
        </footer>
      </div>
    </main>
  );
}
