# Design: Blueprint Product Page & Dual-Product Homepage

**Date:** 2026-03-08
**Status:** Approved

## Goal

Update stackdrift.app to present two products:
1. **Vendor Monitor** — the existing SaaS subscription (from $9/mo)
2. **Vendor Watch Blueprint** — a one-time digital product ($49)

No existing functionality changes. The hero, pricing tiers, and current flows stay intact. This adds a nav dropdown, a "Choose your path" section, a new /blueprint page, a Stripe one-time checkout route, and a pricing page footnote.

---

## 1. Nav Update

**Location:** Landing page nav (`.lp-nav`), between the logo and "Pricing" link.

**Desktop (≥640px):**
- Add a "Products" trigger with a small chevron icon
- On hover, reveal an absolutely-positioned dropdown panel:
  - Background: `--wd-surface` (#08061a)
  - Border: `--wd-line-hi` (rgba(216,212,240,0.14))
  - Rounded corners, subtle box-shadow
  - **Transition:** `opacity` + `visibility` + `pointer-events` (NOT `display`) for smooth fade-in/out
- Two items in the dropdown:
  - "Vendor Monitor" → `/` — sub-label: "Managed service · from $9/mo"
  - "Vendor Watch Blueprint" → `/blueprint` — sub-label: "One-time · $49"
- Each item: hover highlight with `--wd-line` background

**Mobile (<640px):**
- No dropdown, no hamburger
- Replace the "Products" trigger with two flat nav links: "Monitor" and "Blueprint"
- Same styling as existing nav links

**Existing nav items** (Pricing, Drift Intel, About) remain after the dropdown, unchanged.

---

## 2. "Choose Your Path" Section

**Location:** Directly after the hero (after the 3D scroll scenes end, before the FAQ section on the landing page).

**Layout:**
- Section heading: "Choose your path" — `--wd-serif` font, centered
- Two cards side by side on desktop (max-width container, gap between cards)
- Stacked on mobile (<700px)

**Card styling:**
- Background: `--wd-surface`
- Border: `--wd-line-hi`
- Rounded corners (12px)
- Hover: subtle lift (translateY(-2px) + shadow)
- Padding: 32px–40px

**Card 1 — "Monitor for me"**
- Label tag: `MANAGED SERVICE` (uppercase, small, `--wd-cyan` color)
- Headline: "We watch. You get alerted."
- Body: "StackDrift monitors 54+ vendors across your stack and alerts you the moment something changes. No setup. No maintenance."
- CTA: "Start Free Trial" → existing trial signup flow
- Button: `.cta-btn-gradient` (cyan primary, same as hero CTA)
- Sub-label: "From $9/mo · 7-day free trial"

**Card 2 — "I'll run it myself"**
- Label tag: `ONE-TIME PURCHASE` (uppercase, small, `--wd-purple` color)
- Headline: "Own the agent. Run it yourself."
- Body: "The exact monitoring engine powering StackDrift, packaged as a Claude Code blueprint. 54 vendors, 7 safeguards, $1–3/mo in API costs."
- CTA: "Get the Blueprint — $49" → `/blueprint`
- Button: ghost/outline style with `--wd-purple` border to differentiate from Card 1
- Sub-label: "One-time · Deploy in 30 min · Keep forever"

---

## 3. /blueprint Page

**Route:** `app/blueprint/page.tsx`
**Layout:** Reuses root layout. Same `--wd-bg` background, same fonts.

### Hero
- Headline: "The Vendor Watch Blueprint" (`--wd-serif`, large)
- Subhead: "6 months of production vendor monitoring, packaged as a Claude Code agent. Buy once, run forever."
- No 3D canvas — static hero, lightweight

### What's Included Grid
- 6-item grid (3×2 desktop, stacked mobile)
- Card style matching landing page features section
- Items:
  1. **54 vendors, 138 documents** — "TOS, privacy, pricing, API terms across 9 categories"
  2. **7 production safeguards** — "Content floors, removal gates, stale baselines, retry logic"
  3. **4 workflow files** — "Monitor, process change, alert dispatch, first-run setup"
  4. **3 stack profiles** — "AI tools, payments, cloud infrastructure — or build your own"
  5. **Claude Sonnet analysis** — "AI-powered risk assessment: summary, impact, action items"
  6. **Multi-channel alerts** — "Email via Resend, Slack webhooks, HMAC-signed webhooks"

### How It Works
- 3-step horizontal flow (vertical on mobile):
  1. **Install** — `npm install` + add your Anthropic API key
  2. **Configure** — Choose full catalog or a stack profile
  3. **Scan** — `npx tsx tools/run-scan.ts` — baselines on first run, alerts on changes

### CTA Section
- "Get the Blueprint — $49" → Stripe one-time checkout
- Button: `.cta-btn-gradient` (primary cyan)
- Sub-label: "One-time purchase · Deploy in 30 min · Keep forever"

### Error State
- If URL contains `?error=payment_failed`:
  - Show a dismissible banner: "Payment could not be verified. Please try again or contact support."
  - Styled with `--wd-red` border

### Footer
- Reuse existing landing page footer

---

## 4. Stripe Integration

### Environment Variable
- Add `STRIPE_BLUEPRINT_PRICE_ID` to `.env.local` (placeholder, user creates the product in Stripe dashboard)

### Checkout Route: `POST /api/stripe/blueprint-checkout`
- **No auth required** — anyone can buy without an account
- Creates a Stripe checkout session:
  - `mode: 'payment'` (one-time, not subscription)
  - `line_items`: 1 unit of `STRIPE_BLUEPRINT_PRICE_ID`
  - `success_url`: `/api/stripe/blueprint-success?session_id={CHECKOUT_SESSION_ID}`
  - `cancel_url`: `/blueprint`
  - `allow_promotion_codes: true`
- Returns `{ url: session.url }` for client redirect

### Success Route: `GET /api/stripe/blueprint-success`
- Receives `session_id` query parameter
- Retrieves the Stripe session via `stripe.checkout.sessions.retrieve(session_id)`
- **If valid and paid** (`payment_status === 'paid'`): redirect 302 to `https://stackdrift.gumroad.com/l/liddai`
- **If invalid or unpaid**: redirect 302 to `/blueprint?error=payment_failed`
- No page rendered — pure server-side redirect

### Price ID Config
- Add to `lib/stripe/prices.ts`:
  ```typescript
  export const BLUEPRINT_PRICE_ID = process.env.STRIPE_BLUEPRINT_PRICE_ID || '';
  ```

---

## 5. Pricing Page Footnote

**Location:** Bottom of `/pricing`, after the FAQ section, before the footer.

- Horizontal divider: `border-top: 1px solid var(--wd-line)`
- Heading: "Rather own it outright?" — `--wd-serif`, smaller than section headings (~24px)
- Paragraph: "The Vendor Watch Blueprint is a one-time purchase — no subscription, no account needed. Buy the agent, deploy it yourself, run it forever."
- CTA: "Get the Blueprint — $49" → `/blueprint`
- Button: ghost/outline style (`.cta-btn` or similar, not the gradient primary)
- **Understated** — should not visually compete with the subscription tier cards above. Feels like a footnote.

---

## 6. Files to Create/Modify

### New Files
- `app/blueprint/page.tsx` — Blueprint product page
- `app/api/stripe/blueprint-checkout/route.ts` — One-time payment checkout
- `app/api/stripe/blueprint-success/route.ts` — Session verification + Gumroad redirect

### Modified Files
- `app/page.tsx` — Add Products dropdown to nav, add "Choose your path" section after hero
- `app/pricing/page.tsx` — Add footnote section at bottom
- `app/globals.css` — Add styles for: nav dropdown, choose-your-path cards, blueprint page, pricing footnote
- `lib/stripe/prices.ts` — Add `BLUEPRINT_PRICE_ID` export
- `.env.local` — Add `STRIPE_BLUEPRINT_PRICE_ID` placeholder

### Not Modified
- Hero section (headline, subhead, CTAs — all untouched)
- Pricing tiers (Solo, Pro, Business — all untouched)
- Dashboard, onboarding, admin, intel — all untouched
- Auth flows — blueprint purchase requires no account

---

## 7. Design Tokens Used

All from existing `globals.css`:
- Backgrounds: `--wd-bg` (#030014), `--wd-surface` (#08061a)
- Text: `--wd-white`, `--wd-white-dim`, `--wd-white-muted`
- Accents: `--wd-cyan` (Monitor/primary), `--wd-purple` (Blueprint)
- Borders: `--wd-line`, `--wd-line-hi`
- Fonts: `--wd-serif` (headings), `--wd-font` (body), `--wd-mono` (labels)
- Button patterns: `.cta-btn-gradient` (primary), `.cta-btn` (ghost)
