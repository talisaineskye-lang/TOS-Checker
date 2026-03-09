'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { Logo } from '../../components/Logo';

function DownloadContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get('url');

  return (
    <main className="blueprint-page">
      <nav className="lp-nav">
        <div className="inner">
          <div className="nav-left">
            <Link href="/" className="nav-logo">
              <Logo size="sm" />
            </Link>
            <div className="nav-products">
              <button className="nav-products-trigger">
                Products
                <svg className="nav-products-chevron" viewBox="0 0 10 10" fill="none">
                  <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <div className="nav-products-dropdown">
                <Link href="/" className="nav-products-item">
                  <span className="nav-products-item-name">Vendor Monitor</span>
                  <span className="nav-products-item-desc">Managed service &middot; from $9/mo</span>
                </Link>
                <Link href="/blueprint" className="nav-products-item">
                  <span className="nav-products-item-name">Vendor Watch Blueprint</span>
                  <span className="nav-products-item-desc">One-time &middot; $49</span>
                </Link>
              </div>
            </div>
            <div className="nav-products-mobile">
              <Link href="/" className="nav-link">Monitor</Link>
              <Link href="/blueprint" className="nav-link">Blueprint</Link>
            </div>
            <Link href="/pricing" className="nav-link">Pricing</Link>
            <Link href="/intel" className="nav-link">Drift Intel</Link>
            <Link href="/about" className="nav-link">About</Link>
          </div>
          <div className="nav-right" />
        </div>
      </nav>

      <section className="bp-hero">
        <h1>You&apos;re in. Here&apos;s your Blueprint.</h1>
        <p>Your download link is ready. It expires in 24 hours.</p>
      </section>

      <section className="bp-cta">
        {url ? (
          <>
            <a href={url} className="bp-cta-btn" download>
              Download Vendor Watch Blueprint
            </a>
            <p className="bp-cta-sub">
              Check your email for your Stripe receipt.
            </p>
          </>
        ) : (
          <div className="bp-error">
            No download link found. Please contact support@stackdrift.app.
          </div>
        )}
      </section>
    </main>
  );
}

export default function DownloadPage() {
  return (
    <Suspense>
      <DownloadContent />
    </Suspense>
  );
}
