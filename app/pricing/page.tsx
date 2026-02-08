import { Logo } from '../components/Logo';

export default function PricingPage() {
  return (
    <main className="landing-page">
      <nav className="lp-nav">
        <div className="inner">
          <div className="nav-left">
            <a className="nav-logo" href="/">
              <Logo size="sm" />
            </a>
            <a href="/" className="nav-link">Home</a>
            <a href="/intel" className="nav-link">Intel</a>
          </div>
          <div className="nav-right">
            <a className="pill pill-solid nav-pill" href="/onboarding">Early access</a>
          </div>
        </div>
      </nav>

      <div className="wrap">
        <section className="hero" style={{ textAlign: 'center' }}>
          <div className="tag tag-green">Pricing</div>
          <h1>Coming soon.</h1>
          <p className="hero-sub">
            StackDrift is free during early access. Pricing plans will be announced soon.
          </p>
          <div className="hero-pills">
            <a className="pill pill-solid" href="/onboarding">Get early access</a>
            <a href="/" className="pill pill-ghost">Back to home</a>
          </div>
        </section>

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
