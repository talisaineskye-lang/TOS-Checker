import './globals.css';
import type { ReactNode } from 'react';
import { JetBrains_Mono } from 'next/font/google';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '700'],
  display: 'swap',
});

export const metadata = {
  title: 'TOS Change Monitor',
  description: 'Monitor Terms of Service changes and get alerts.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={jetbrainsMono.variable}>
      <body>{children}</body>
    </html>
  );
}
