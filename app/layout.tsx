import './globals.css';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Exo_2, Space_Mono } from 'next/font/google';
import { AuthProvider } from './components/AuthProvider';
import { Analytics } from '@vercel/analytics/react';

// CODEX — wordmark only
const codex = localFont({
  src: [
    { path: '../public/fonts/Codex-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../public/fonts/Codex-Italic.ttf', weight: '400', style: 'italic' },
  ],
  variable: '--font-codex',
  display: 'swap',
});

// Exo 2 — primary UI font (replaces Inter)
const exo2 = Exo_2({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

// Space Mono — labels, tags, meta (replaces JetBrains Mono)
const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'StackDrift — Automated Vendor Policy Monitoring | Track TOS, Privacy & Pricing Changes',
    template: '%s | StackDrift',
  },
  description:
    'StackDrift monitors Terms of Service, Privacy Policies, and Pricing pages across 29+ SaaS vendors. Get AI-powered change detection, severity scoring, and real-time alerts. Built for indie devs and SaaS teams.',
  metadataBase: new URL('https://www.stackdrift.app'),
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'en_CA',
    url: 'https://www.stackdrift.app',
    siteName: 'StackDrift',
    title: 'StackDrift — Automated Vendor Policy Monitoring | Track TOS, Privacy & Pricing Changes',
    description:
      'StackDrift monitors Terms of Service, Privacy Policies, and Pricing pages across 29+ SaaS vendors. AI-powered change detection, severity scoring, and real-time alerts.',
    images: [
      {
        url: 'https://www.stackdrift.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'StackDrift — Vendor Policy Monitoring',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StackDrift — Automated Vendor Policy Monitoring | Track TOS, Privacy & Pricing Changes',
    description:
      'StackDrift monitors Terms of Service, Privacy Policies, and Pricing pages across 29+ SaaS vendors. AI-powered change detection with real-time alerts.',
    images: ['https://www.stackdrift.app/og-image.png'],
  },
  icons: {
    icon: '/favicon-32.png',
    apple: '/icon-192.png',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${codex.variable} ${exo2.variable} ${spaceMono.variable}`}>
      <body>
        <AuthProvider>{children}</AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
