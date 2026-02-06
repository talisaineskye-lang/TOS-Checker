import { VendorGrid } from '@/app/components/VendorGrid';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  return (
    <main className="onboarding-page">
      <nav className="wd-nav">
        <div className="wd-nav-brand">
          <span className="wd-nav-pulse" />
          Watchdog
        </div>
        <div className="wd-nav-path">
          setup / <span>vendors</span>
        </div>
      </nav>

      <header className="wd-header">
        <h1>Select your vendor stack.</h1>
        <p>
          We monitor Terms of Service, Privacy Policies, Pricing, and AUP
          documents for changes that affect your business.
        </p>
      </header>

      <div className="wd-content">
        <VendorGrid />
      </div>

      <footer className="wd-footer">
        <span>Watchdog</span>
        <div className="wd-footer-links">
          <a href="/">Dashboard</a>
          <a href="/admin">Admin</a>
        </div>
      </footer>
    </main>
  );
}
