import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { VendorGrid } from '@/app/components/VendorGrid';

export const dynamic = 'force-dynamic';

async function checkOnboardingStatus(): Promise<boolean> {
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'onboarding_completed')
    .single();

  return data?.value === 'true';
}

export default async function OnboardingPage() {
  const isCompleted = await checkOnboardingStatus();

  if (isCompleted) {
    redirect('/');
  }

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
