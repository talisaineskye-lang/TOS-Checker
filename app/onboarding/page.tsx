import { VendorGrid } from '@/app/components/VendorGrid';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  return (
    <main className="onboarding-page">
      <header className="onboarding-header">
        <h1>VENDOR MANIFEST</h1>
        <p className="subtitle">
          Configure monitoring targets. We track Terms, Privacy, Pricing, and AUP
          changes &mdash; flagging what matters.
        </p>
      </header>

      <VendorGrid />
    </main>
  );
}
