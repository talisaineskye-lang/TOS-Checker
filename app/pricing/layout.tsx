import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Simple plans for monitoring your vendor stack. Start free during early access.',
  alternates: { canonical: '/pricing' },
};

export default function PricingLayout({ children }: { children: ReactNode }) {
  return children;
}
