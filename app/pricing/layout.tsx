import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'StackDrift Pricing — Plans for Every Team Size',
  description: 'StackDrift pricing for SaaS vendor policy monitoring. Track Terms of Service, privacy policy, and pricing page changes. Plans from $7/mo with annual billing.',
  alternates: { canonical: '/pricing' },
  openGraph: { url: '/pricing' },
};

export default function PricingLayout({ children }: { children: ReactNode }) {
  return children;
}
