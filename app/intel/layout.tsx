import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Intel',
  description: 'Latest vendor policy changes detected by StackDrift. Real-time monitoring of Terms of Service, Privacy Policies, and Pricing pages.',
  alternates: { canonical: '/intel' },
};

export default function IntelLayout({ children }: { children: ReactNode }) {
  return children;
}
