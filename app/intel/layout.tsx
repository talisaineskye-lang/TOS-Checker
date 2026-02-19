import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Drift Intel — SaaS Vendor Policy News & Analysis',
  description: 'Drift Intel delivers curated SaaS vendor policy news and AI-classified updates on Terms of Service, privacy policies, and pricing changes every week.',
  alternates: { canonical: '/intel' },
  openGraph: { url: '/intel' },
};

export default function IntelLayout({ children }: { children: ReactNode }) {
  return children;
}
