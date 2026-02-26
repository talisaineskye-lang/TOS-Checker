import './globals.css';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Outfit, JetBrains_Mono, Cormorant_Garamond } from 'next/font/google';
import { AuthProvider } from './components/AuthProvider';
import { Analytics } from '@vercel/analytics/react';

// Outfit — primary UI font (body, labels, navigation)
const outfit = Outfit({
  subsets: ['latin'],
  weight: ['200', '300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

// JetBrains Mono — code, tags, metadata
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-mono',
  display: 'swap',
});

// Cormorant Garamond — display headings, editorial
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
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
    <html lang="en" className={`${outfit.variable} ${jetbrains.variable} ${cormorant.variable}`}>
      <body>
        <AuthProvider>{children}</AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
