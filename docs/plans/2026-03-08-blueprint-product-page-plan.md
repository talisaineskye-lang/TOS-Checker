# Blueprint Product Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Products" nav dropdown, "Choose your path" section, /blueprint product page, Stripe one-time checkout, and pricing page footnote to stackdrift.app.

**Architecture:** All changes are additive — no existing functionality is modified. New CSS classes are added to globals.css. Two new API routes handle one-time Stripe checkout and session verification. The /blueprint page is a standalone client component matching existing dark design.

**Tech Stack:** Next.js 16 App Router, vanilla CSS (globals.css), Stripe (one-time payment mode), existing Supabase auth (not required for blueprint purchase)

---

### Task 1: Add STRIPE_BLUEPRINT_PRICE_ID to prices.ts and .env.local

**Files:**
- Modify: `lib/stripe/prices.ts:14` (after STRIPE_PRICES)
- Modify: `.env.local` (add new env var)

**Step 1: Add the price export**

In `lib/stripe/prices.ts`, after line 14 (after the `as const;`), add:

```typescript
export const BLUEPRINT_PRICE_ID = process.env.STRIPE_BLUEPRINT_PRICE_ID || '';
```

**Step 2: Add placeholder to .env.local**

Add to `.env.local`:

```
STRIPE_BLUEPRINT_PRICE_ID=price_PLACEHOLDER
```

**Step 3: Commit**

```bash
git add lib/stripe/prices.ts .env.local
git commit -m "feat: add STRIPE_BLUEPRINT_PRICE_ID config"
```

---

### Task 2: Create POST /api/stripe/blueprint-checkout

**Files:**
- Create: `app/api/stripe/blueprint-checkout/route.ts`

**Step 1: Create the route**

```typescript
import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/client';
import { BLUEPRINT_PRICE_ID } from '@/lib/stripe/prices';

export async function POST(request: Request) {
  if (!BLUEPRINT_PRICE_ID) {
    return NextResponse.json({ error: 'Blueprint price not configured' }, { status: 500 });
  }

  const stripe = getStripe();
  const origin = request.headers.get('origin') || 'https://www.stackdrift.app';

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: BLUEPRINT_PRICE_ID, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${origin}/api/stripe/blueprint-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/blueprint`,
  });

  return NextResponse.json({ url: session.url });
}
```

**Step 2: Commit**

```bash
git add app/api/stripe/blueprint-checkout/route.ts
git commit -m "feat: add blueprint one-time checkout API route"
```

---

### Task 3: Create GET /api/stripe/blueprint-success

**Files:**
- Create: `app/api/stripe/blueprint-success/route.ts`

**Step 1: Create the route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/client';

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.redirect(new URL('/blueprint?error=payment_failed', request.url));
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      return NextResponse.redirect('https://stackdrift.gumroad.com/l/liddai');
    }

    return NextResponse.redirect(new URL('/blueprint?error=payment_failed', request.url));
  } catch {
    return NextResponse.redirect(new URL('/blueprint?error=payment_failed', request.url));
  }
}
```

**Step 2: Commit**

```bash
git add app/api/stripe/blueprint-success/route.ts
git commit -m "feat: add blueprint success verification + Gumroad redirect"
```

---

### Task 4: Add goToBlueprintCheckout to stripe actions

**Files:**
- Modify: `lib/stripe/actions.ts:52` (append after goToPortal)

**Step 1: Add the function**

After the `goToPortal` function (after line 52), add:

```typescript
export async function goToBlueprintCheckout() {
  const res = await fetch('/api/stripe/blueprint-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const { url } = await res.json();
  if (url) window.location.href = url;
}
```

Note: No auth token needed — blueprint purchase is anonymous.

**Step 2: Commit**

```bash
git add lib/stripe/actions.ts
git commit -m "feat: add goToBlueprintCheckout client action"
```

---

### Task 5: Add nav dropdown + "Choose your path" CSS to globals.css

**Files:**
- Modify: `app/globals.css` (insert after line 1825, after the `.nav-cta:hover` block, before the `/* ============ LANDING PAGE — Scroll-Driven Cube ============ */` comment)

**Step 1: Add the CSS**

Insert the following block after line 1825 (after the nav-cta hover rule):

```css
/* ============ PRODUCTS DROPDOWN ============ */

.nav-products {
  position: relative;
  display: flex;
  align-items: center;
}

.nav-products-trigger {
  font-size: 14px;
  color: var(--lp-white-faint);
  text-decoration: none;
  transition: color 0.2s;
  letter-spacing: 0.01em;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0;
}

.nav-products-trigger:hover { color: var(--lp-white-muted); }

.nav-products-chevron {
  width: 10px;
  height: 10px;
  transition: transform 0.2s;
}

.nav-products:hover .nav-products-chevron { transform: rotate(180deg); }

.nav-products-dropdown {
  position: absolute;
  top: calc(100% + 12px);
  left: 50%;
  transform: translateX(-50%);
  min-width: 260px;
  background: var(--wd-surface, #08061a);
  border: 1px solid var(--wd-line-hi, rgba(216,212,240,0.14));
  border-radius: 10px;
  padding: 8px;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.2s ease, visibility 0.2s ease;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
}

.nav-products:hover .nav-products-dropdown {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.nav-products-item {
  display: block;
  padding: 10px 14px;
  border-radius: 6px;
  text-decoration: none;
  transition: background 0.15s;
}

.nav-products-item:hover {
  background: var(--wd-line, rgba(216,212,240,0.08));
}

.nav-products-item-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--wd-white, #d8d4f0);
  display: block;
}

.nav-products-item-desc {
  font-size: 11px;
  color: var(--wd-white-muted, #6e6a8a);
  display: block;
  margin-top: 2px;
}

/* Mobile: replace dropdown with flat links */
@media (max-width: 860px) {
  .nav-products { display: none; }
  .nav-products-mobile { display: flex; gap: 16px; }
}

@media (min-width: 861px) {
  .nav-products-mobile { display: none; }
}

/* ============ CHOOSE YOUR PATH ============ */

.cyp-section {
  padding: 100px 40px 80px;
  max-width: 960px;
  margin: 0 auto;
  text-align: center;
}

.cyp-heading {
  font-family: var(--lp-serif, 'Cormorant Garamond', Georgia, serif);
  font-size: clamp(32px, 5vw, 48px);
  font-weight: 400;
  color: var(--lp-white, #eae8f5);
  margin: 0 0 48px;
  letter-spacing: -0.01em;
}

.cyp-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.cyp-card {
  background: var(--lp-surface, #08061a);
  border: 1px solid var(--lp-line-hi, rgba(216,212,240,0.14));
  border-radius: 12px;
  padding: 36px 32px;
  text-align: left;
  transition: transform 0.2s, box-shadow 0.2s;
}

.cyp-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
}

.cyp-label {
  font-family: var(--lp-mono, 'JetBrains Mono', monospace);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  margin: 0 0 16px;
}

.cyp-label.managed { color: var(--lp-cyan, #00e5ff); }
.cyp-label.blueprint { color: var(--lp-purple, #9382ff); }

.cyp-title {
  font-family: var(--lp-serif, 'Cormorant Garamond', Georgia, serif);
  font-size: 26px;
  font-weight: 500;
  color: var(--lp-white, #eae8f5);
  margin: 0 0 12px;
  letter-spacing: -0.01em;
}

.cyp-body {
  font-size: 14px;
  line-height: 1.6;
  color: var(--lp-white-dim, #c4c0da);
  margin: 0 0 24px;
}

.cyp-cta-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.cyp-btn-primary {
  display: inline-block;
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  font-family: var(--lp-mono, 'JetBrains Mono', monospace);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-decoration: none;
  color: var(--lp-cyan, #00e5ff);
  background: transparent;
  border: 1px solid var(--lp-cyan, #00e5ff);
  cursor: pointer;
  transition: all 0.3s ease;
}

.cyp-btn-primary:hover {
  background: rgba(0, 229, 255, 0.08);
  box-shadow: 0 0 20px rgba(0, 229, 255, 0.15);
}

.cyp-btn-secondary {
  display: inline-block;
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  font-family: var(--lp-mono, 'JetBrains Mono', monospace);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-decoration: none;
  color: var(--lp-purple, #9382ff);
  background: transparent;
  border: 1px solid var(--lp-purple, #9382ff);
  cursor: pointer;
  transition: all 0.3s ease;
}

.cyp-btn-secondary:hover {
  background: rgba(147, 130, 255, 0.08);
  box-shadow: 0 0 20px rgba(147, 130, 255, 0.15);
}

.cyp-sublabel {
  font-size: 12px;
  color: var(--lp-white-faint, #7a76a0);
}

@media (max-width: 700px) {
  .cyp-grid { grid-template-columns: 1fr; }
  .cyp-section { padding: 80px 24px 60px; }
}

/* ============ BLUEPRINT PAGE ============ */

.blueprint-page {
  background: var(--wd-bg, #030014);
  color: var(--wd-white, #d8d4f0);
  font-family: var(--font-sans, 'Outfit'), -apple-system, sans-serif;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

.bp-hero {
  padding: 120px 40px 60px;
  max-width: 720px;
  margin: 0 auto;
  text-align: center;
}

.bp-hero h1 {
  font-family: var(--font-serif, 'Cormorant Garamond'), Georgia, serif;
  font-size: clamp(36px, 6vw, 56px);
  font-weight: 400;
  color: var(--wd-white, #d8d4f0);
  margin: 0 0 16px;
  letter-spacing: -0.01em;
  line-height: 1.1;
}

.bp-hero p {
  font-size: 17px;
  line-height: 1.6;
  color: var(--wd-white-dim, #a8a4c0);
  margin: 0;
  max-width: 560px;
  margin: 0 auto;
}

/* Error banner */
.bp-error {
  max-width: 600px;
  margin: 16px auto 0;
  padding: 12px 20px;
  border: 1px solid var(--wd-red, #ff4444);
  border-radius: 8px;
  background: rgba(255,68,68,0.08);
  color: var(--wd-red, #ff4444);
  font-size: 13px;
  text-align: center;
}

/* What's included grid */
.bp-grid {
  padding: 40px 40px 80px;
  max-width: 960px;
  margin: 0 auto;
}

.bp-grid h2 {
  font-family: var(--font-serif, 'Cormorant Garamond'), Georgia, serif;
  font-size: 32px;
  font-weight: 400;
  text-align: center;
  margin: 0 0 40px;
  color: var(--wd-white, #d8d4f0);
}

.bp-grid-items {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.bp-grid-item {
  background: var(--wd-surface, #08061a);
  border: 1px solid var(--wd-line-hi, rgba(216,212,240,0.14));
  border-radius: 10px;
  padding: 24px;
}

.bp-grid-icon {
  font-size: 24px;
  margin-bottom: 12px;
}

.bp-grid-item h3 {
  font-size: 15px;
  font-weight: 600;
  color: var(--wd-white, #d8d4f0);
  margin: 0 0 6px;
}

.bp-grid-item p {
  font-size: 13px;
  line-height: 1.5;
  color: var(--wd-white-muted, #6e6a8a);
  margin: 0;
}

/* How it works */
.bp-steps {
  padding: 0 40px 80px;
  max-width: 800px;
  margin: 0 auto;
}

.bp-steps h2 {
  font-family: var(--font-serif, 'Cormorant Garamond'), Georgia, serif;
  font-size: 32px;
  font-weight: 400;
  text-align: center;
  margin: 0 0 40px;
  color: var(--wd-white, #d8d4f0);
}

.bp-steps-row {
  display: flex;
  gap: 32px;
  justify-content: center;
}

.bp-step {
  flex: 1;
  text-align: center;
  max-width: 220px;
}

.bp-step-num {
  font-family: var(--font-mono, 'JetBrains Mono'), monospace;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--wd-cyan, #00e5ff);
  margin-bottom: 8px;
}

.bp-step h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--wd-white, #d8d4f0);
  margin: 0 0 6px;
}

.bp-step p {
  font-size: 13px;
  line-height: 1.5;
  color: var(--wd-white-muted, #6e6a8a);
  margin: 0;
}

/* CTA section */
.bp-cta {
  text-align: center;
  padding: 40px 40px 100px;
}

.bp-cta-btn {
  display: inline-block;
  padding: 14px 36px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  font-family: var(--font-mono, 'JetBrains Mono'), monospace;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: none;
  color: var(--wd-cyan, #00e5ff);
  background: transparent;
  border: 1px solid var(--wd-cyan, #00e5ff);
  cursor: pointer;
  transition: all 0.3s ease;
}

.bp-cta-btn:hover {
  background: rgba(0, 229, 255, 0.08);
  box-shadow: 0 0 20px rgba(0, 229, 255, 0.15);
}

.bp-cta-sub {
  font-size: 13px;
  color: var(--wd-white-faint, #3d3960);
  margin-top: 12px;
}

@media (max-width: 700px) {
  .bp-hero { padding: 100px 24px 40px; }
  .bp-grid { padding: 40px 24px 60px; }
  .bp-grid-items { grid-template-columns: 1fr; }
  .bp-steps { padding: 0 24px 60px; }
  .bp-steps-row { flex-direction: column; align-items: center; }
  .bp-cta { padding: 20px 24px 80px; }
}

/* ============ PRICING FOOTNOTE ============ */

.pp-blueprint-footnote {
  max-width: 600px;
  margin: 0 auto;
  padding: 60px 40px 0;
  text-align: center;
}

.pp-blueprint-footnote-divider {
  border: none;
  border-top: 1px solid var(--wd-line, rgba(216,212,240,0.08));
  margin: 0 0 40px;
}

.pp-blueprint-footnote h3 {
  font-family: var(--font-serif, 'Cormorant Garamond'), Georgia, serif;
  font-size: 24px;
  font-weight: 400;
  color: var(--wd-white-dim, #a8a4c0);
  margin: 0 0 12px;
}

.pp-blueprint-footnote p {
  font-size: 14px;
  line-height: 1.6;
  color: var(--wd-white-muted, #6e6a8a);
  margin: 0 0 24px;
}

.pp-blueprint-footnote-btn {
  display: inline-block;
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  font-family: var(--font-mono, 'JetBrains Mono'), monospace;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: none;
  color: var(--wd-white-dim, #a8a4c0);
  background: transparent;
  border: 1px solid var(--wd-line-hi, rgba(216,212,240,0.14));
  cursor: pointer;
  transition: all 0.3s ease;
}

.pp-blueprint-footnote-btn:hover {
  color: var(--wd-white, #d8d4f0);
  border-color: var(--wd-white-muted, #6e6a8a);
  background: rgba(216,212,240,0.04);
}

@media (max-width: 700px) {
  .pp-blueprint-footnote { padding: 40px 24px 0; }
}
```

**Step 2: Commit**

```bash
git add app/globals.css
git commit -m "feat: add CSS for nav dropdown, choose-your-path, blueprint page, pricing footnote"
```

---

### Task 6: Update landing page nav + add "Choose your path" section

**Files:**
- Modify: `app/page.tsx`

**Step 1: Add "Choose your path" section and nav dropdown**

In the nav (`<nav className="lp-nav">`), replace the `<div className="nav-left">` block (lines 134–141) with:

```tsx
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
```

Then, in the `post-scroll` div, insert the "Choose your path" section **before** the FAQ `<section>` (before line 268). Add:

```tsx
{/* Choose your path */}
<section className="cyp-section">
  <h2 className="cyp-heading">Choose your path</h2>
  <div className="cyp-grid">
    <div className="cyp-card">
      <div className="cyp-label managed">MANAGED SERVICE</div>
      <h3 className="cyp-title">We watch. You get alerted.</h3>
      <p className="cyp-body">
        StackDrift monitors 54+ vendors across your stack and alerts
        you the moment something changes. No setup. No maintenance.
      </p>
      <div className="cyp-cta-wrap">
        <Link href="/pricing" className="cyp-btn-primary">Start Free Trial</Link>
        <span className="cyp-sublabel">From $9/mo &middot; 7-day free trial</span>
      </div>
    </div>
    <div className="cyp-card">
      <div className="cyp-label blueprint">ONE-TIME PURCHASE</div>
      <h3 className="cyp-title">Own the agent. Run it yourself.</h3>
      <p className="cyp-body">
        The exact monitoring engine powering StackDrift, packaged as
        a Claude Code blueprint. 54 vendors, 7 safeguards, $1&ndash;3/mo in API costs.
      </p>
      <div className="cyp-cta-wrap">
        <Link href="/blueprint" className="cyp-btn-secondary">Get the Blueprint &mdash; $49</Link>
        <span className="cyp-sublabel">One-time &middot; Deploy in 30 min &middot; Keep forever</span>
      </div>
    </div>
  </div>
</section>
```

**Step 2: Verify the page renders**

Run: `npm run dev` and check `http://localhost:3000`

Expected:
- Products dropdown appears in nav, reveals two items on hover with opacity fade
- On mobile (< 860px), "Monitor" and "Blueprint" show as flat links
- "Choose your path" section appears after the scroll scenes, before FAQ
- Hero is completely unchanged

**Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add Products dropdown and Choose Your Path section to landing page"
```

---

### Task 7: Update pricing page nav + add footnote

**Files:**
- Modify: `app/pricing/page.tsx`

**Step 1: Update the nav**

Replace the `<div className="nav-left">` block (lines 80–87) with the same Products dropdown + mobile links pattern from Task 6 (adapted for `<a>` tags since pricing page uses `<a>` not `<Link>`):

```tsx
<div className="nav-left">
  <a className="nav-logo" href="/">
    <Logo size="sm" />
  </a>
  <div className="nav-products">
    <button className="nav-products-trigger">
      Products
      <svg className="nav-products-chevron" viewBox="0 0 10 10" fill="none">
        <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
    <div className="nav-products-dropdown">
      <a href="/" className="nav-products-item">
        <span className="nav-products-item-name">Vendor Monitor</span>
        <span className="nav-products-item-desc">Managed service &middot; from $9/mo</span>
      </a>
      <a href="/blueprint" className="nav-products-item">
        <span className="nav-products-item-name">Vendor Watch Blueprint</span>
        <span className="nav-products-item-desc">One-time &middot; $49</span>
      </a>
    </div>
  </div>
  <div className="nav-products-mobile">
    <a href="/" className="nav-link">Monitor</a>
    <a href="/blueprint" className="nav-link">Blueprint</a>
  </div>
  <a href="/intel" className="nav-link">Drift Intel</a>
  <a href="/#how" className="nav-link">How it works</a>
  <a href="/pricing" className="nav-link active">Pricing</a>
</div>
```

**Step 2: Add the footnote**

Insert the following **after** the `pp-bottom-cta` section (after line 370) and **before** the footer (before line 373):

```tsx
{/* Blueprint footnote */}
<section className="pp-blueprint-footnote">
  <hr className="pp-blueprint-footnote-divider" />
  <h3>Rather own it outright?</h3>
  <p>
    The Vendor Watch Blueprint is a one-time purchase &mdash; no subscription,
    no account needed. Buy the agent, deploy it yourself, run it forever.
  </p>
  <a href="/blueprint" className="pp-blueprint-footnote-btn">Get the Blueprint &mdash; $49</a>
</section>
```

**Step 3: Verify**

Run dev server and check `/pricing`:
- Products dropdown in nav works identically to landing page
- Footnote appears at bottom, after "Start your free trial" CTA, before footer
- Footnote is visually understated — does not compete with tier cards

**Step 4: Commit**

```bash
git add app/pricing/page.tsx
git commit -m "feat: add Products dropdown to pricing nav + Blueprint footnote"
```

---

### Task 8: Create /blueprint page

**Files:**
- Create: `app/blueprint/page.tsx`

**Step 1: Create the page**

```tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { Logo } from '../components/Logo';
import { useAuth } from '../components/AuthProvider';
import { UserMenu } from '../components/UserMenu';
import { LoginModal } from '../components/LoginModal';
import { useState } from 'react';
import { goToBlueprintCheckout } from '@/lib/stripe/actions';

const FEATURES = [
  { icon: '54+', title: '54 vendors, 138 documents', desc: 'TOS, privacy, pricing, API terms across 9 categories' },
  { icon: '🛡', title: '7 production safeguards', desc: 'Content floors, removal gates, stale baselines, retry logic' },
  { icon: '📄', title: '4 workflow files', desc: 'Monitor, process change, alert dispatch, first-run setup' },
  { icon: '⚡', title: '3 stack profiles', desc: 'AI tools, payments, cloud infrastructure — or build your own' },
  { icon: 'AI', title: 'Claude Sonnet analysis', desc: 'AI-powered risk assessment: summary, impact, action items' },
  { icon: '🔔', title: 'Multi-channel alerts', desc: 'Email via Resend, Slack webhooks, HMAC-signed webhooks' },
];

function BlueprintContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const { user, loading: authLoading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  return (
    <main className="blueprint-page">
      {/* Nav */}
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
          <div className="nav-right">
            {authLoading ? null : user ? (
              <UserMenu />
            ) : (
              <button className="nav-cta" onClick={() => setShowLogin(true)}>
                Sign in
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bp-hero">
        <h1>The Vendor Watch Blueprint</h1>
        <p>
          6 months of production vendor monitoring, packaged as a Claude Code
          agent. Buy once, run forever.
        </p>
        {error === 'payment_failed' && (
          <div className="bp-error">
            Payment could not be verified. Please try again or contact support.
          </div>
        )}
      </section>

      {/* What's included */}
      <section className="bp-grid">
        <h2>What&apos;s included</h2>
        <div className="bp-grid-items">
          {FEATURES.map((f, i) => (
            <div key={i} className="bp-grid-item">
              <div className="bp-grid-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bp-steps">
        <h2>How it works</h2>
        <div className="bp-steps-row">
          <div className="bp-step">
            <div className="bp-step-num">Step 1</div>
            <h3>Install</h3>
            <p>npm install + add your Anthropic API key</p>
          </div>
          <div className="bp-step">
            <div className="bp-step-num">Step 2</div>
            <h3>Configure</h3>
            <p>Choose full catalog or a stack profile</p>
          </div>
          <div className="bp-step">
            <div className="bp-step-num">Step 3</div>
            <h3>Scan</h3>
            <p>Run the agent — baselines on first run, alerts on changes</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bp-cta">
        <button className="bp-cta-btn" onClick={goToBlueprintCheckout}>
          Get the Blueprint &mdash; $49
        </button>
        <p className="bp-cta-sub">
          One-time purchase &middot; Deploy in 30 min &middot; Keep forever
        </p>
      </section>

      {/* Footer */}
      <div className="lp-footer-wrap">
        <div className="lp-footer-inner">
          <div className="lp-footer-left">
            <div className="lp-footer-logo">StackDrift</div>
            <p>Monitoring the fine print so you don&apos;t have to.</p>
          </div>
          <div className="lp-footer-cols">
            <div className="lp-footer-col">
              <h4>Product</h4>
              <Link href="/pricing">Pricing</Link>
              <Link href="/blueprint">Blueprint</Link>
              <Link href="/dashboard">Dashboard</Link>
            </div>
            <div className="lp-footer-col">
              <h4>Resources</h4>
              <Link href="/intel">Drift Intel</Link>
              <Link href="/about">About</Link>
              <a href="mailto:support@stackdrift.app">Support</a>
            </div>
            <div className="lp-footer-col">
              <h4>Legal</h4>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
            </div>
            <div className="lp-footer-col">
              <h4>Social</h4>
              <a href="https://x.com/Trish_DIntel" target="_blank" rel="noopener noreferrer">X (Twitter)</a>
              <a href="https://www.linkedin.com/in/trish-t-4670b93b2/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
            </div>
          </div>
        </div>
        <div className="lp-footer-copy">
          <span>&copy; 2026 StackDrift</span>
          <span>
            <Link href="/privacy">Privacy</Link> &middot; <Link href="/terms">Terms</Link>
          </span>
        </div>
      </div>

      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
    </main>
  );
}

export default function BlueprintPage() {
  return (
    <Suspense>
      <BlueprintContent />
    </Suspense>
  );
}
```

**Step 2: Add blueprint-page scoping to CSS**

The `.blueprint-page` class needs to be included in the nav CSS selectors. In `globals.css`, update the nav style rules to include `.blueprint-page`. Find each group of three selectors like:

```css
.landing-page .lp-nav,
.pricing-page .lp-nav,
.login-page .lp-nav {
```

And add `.blueprint-page .lp-nav,` to each group. There are ~15 such selector groups in the nav CSS section (lines 1724–1825).

**Step 3: Verify**

Run dev server and check `/blueprint`:
- Nav matches other pages with Products dropdown
- Hero, features grid, steps, and CTA render correctly
- "Get the Blueprint" button calls Stripe checkout
- `?error=payment_failed` shows red error banner
- Footer matches landing page

**Step 4: Commit**

```bash
git add app/blueprint/page.tsx app/globals.css
git commit -m "feat: add /blueprint product page with Stripe checkout"
```

---

### Task 9: Final verification

**Step 1: Check all pages**

- `http://localhost:3000` — Landing page: Products dropdown works, "Choose your path" renders, hero unchanged
- `http://localhost:3000/pricing` — Pricing page: Products dropdown, footnote at bottom, tiers unchanged
- `http://localhost:3000/blueprint` — Blueprint page: Full page renders, CTA redirects to Stripe
- `http://localhost:3000/blueprint?error=payment_failed` — Error banner shows

**Step 2: Check mobile (< 860px)**

- Products dropdown hidden, "Monitor" + "Blueprint" flat links visible
- "Choose your path" cards stack vertically
- Blueprint page grid stacks to single column

**Step 3: Check dropdown transition**

- Hover on "Products" → dropdown fades in smoothly (opacity transition, NOT display toggle)
- Mouse away → dropdown fades out

**Step 4: Commit all remaining changes**

```bash
git add -A
git commit -m "feat: complete dual-product homepage with blueprint page, nav dropdown, and pricing footnote"
```
