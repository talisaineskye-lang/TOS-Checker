import { VendorGrid } from '@/app/components/VendorGrid';
import { Logo } from '@/app/components/Logo';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  return (
    <main className="onboarding-page">
      <nav className="wd-nav">
        <div className="nav-inner">
          <div className="wd-nav-left">
            <a className="wd-nav-brand" href="/">
              <Logo size="sm" />
            </a>
            <div className="wd-nav-crumb">
              <span className="sep">/</span>
              <span>setup</span>
              <span className="sep">/</span>
              <span className="current">vendors</span>
            </div>
          </div>
        </div>
      </nav>

      <VendorGrid />
    </main>
  );
}
