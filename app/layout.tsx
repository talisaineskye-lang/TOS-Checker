import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'TOS Change Monitor',
  description: 'Monitor Terms of Service changes and get alerts.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
