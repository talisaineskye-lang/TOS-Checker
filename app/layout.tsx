import './globals.css';
import type { ReactNode } from 'react';
import localFont from 'next/font/local';
import { Exo_2, Space_Mono } from 'next/font/google';

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

export const metadata = {
  title: 'StackDrift — Vendor Policy Monitoring',
  description: 'Monitor your vendor stack for TOS, privacy, and pricing changes. Get alerts before they break your business.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${codex.variable} ${exo2.variable} ${spaceMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
