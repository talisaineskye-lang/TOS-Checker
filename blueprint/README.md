# StackDrift Agent Blueprint

A standalone vendor policy monitoring agent that watches 55+ SaaS vendors for changes to their Terms of Service, Privacy Policies, pricing, and API terms. When a change is detected, it analyzes the business impact using Claude Sonnet and sends you an alert.

This is the same monitoring engine that powers [StackDrift](https://stackdrift.app), extracted as a self-contained project you can run yourself.

## What You'll Need

- **Node.js 18+**
- **Anthropic API key** (Claude Max subscription or [API access](https://console.anthropic.com))
- **5 minutes** to set up

## Quick Start

### 1. Install dependencies

```bash
cd blueprint/
npm install
```

### 2. Configure your API key

```bash
cp .env.example .env
```

Open `.env` and add your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Run your first scan

```bash
npx tsx tools/run-scan.ts
```

The first scan establishes baselines — it fetches every document and saves a snapshot. No alerts are sent on the first run.

### 4. Run again later to detect changes

```bash
npx tsx tools/run-scan.ts
```

On subsequent runs, the agent compares each document against its stored baseline. If something changed, it diffs the content, sends it to Claude Sonnet for analysis, and tells you what happened, who's affected, and what to do.

## Choosing Your Vendor List

### Full catalog (default)

The full catalog covers 55+ vendors across 9 categories. Just run the scan with no flags.

### Stack profiles

Pre-configured subsets for common stacks:

```bash
# AI platforms + builders (OpenAI, Anthropic, Cursor, Lovable, etc.)
npx tsx tools/run-scan.ts --profile ai-tools

# Payment processors (Stripe, PayPal, Paddle, etc.)
npx tsx tools/run-scan.ts --profile payments

# Cloud & infrastructure (AWS, Vercel, Cloudflare, etc.)
npx tsx tools/run-scan.ts --profile cloud-infra
```

### Single vendor

```bash
npx tsx tools/run-scan.ts --vendor stripe
```

### Custom stack

Create `stack-profiles/my-stack.json`:

```json
["stripe", "openai", "vercel", "github"]
```

Then run:

```bash
npx tsx tools/run-scan.ts --profile my-stack
```

Vendor slugs are listed in `data/vendor-catalog.json`.

## Scheduling

### Cron job

```bash
# Daily at 6 AM UTC
0 6 * * * cd /path/to/blueprint && npx tsx tools/run-scan.ts >> /var/log/stackdrift.log 2>&1
```

### Claude Code (manual)

```bash
claude --project blueprint/ 'Run a full scan of all vendors'
```

### Trigger.dev / Inngest

Deploy `tools/run-scan.ts` as a scheduled task. The scan is a single Node.js script with no web framework dependencies.

## Alert Setup

All alert channels are optional. Add the relevant env vars to `.env` to enable them.

### Email (Resend)

```env
RESEND_API_KEY=re_...
ALERT_EMAIL_FROM=alerts@yourdomain.com
ALERT_EMAIL_TO=you@yourdomain.com
```

Sends HTML emails with severity color bars, risk badges, and action items.

### Slack

```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
SLACK_MIN_SEVERITY=medium
```

Sends Block Kit messages with severity emoji (🚨 critical, ⚠️ high, 📋 medium).

### Webhook

```env
WEBHOOK_URL=https://your-endpoint.com/vendor-alerts
WEBHOOK_SECRET=your-signing-secret
```

Sends HMAC-SHA256 signed POST payloads. Your endpoint can verify authenticity using the `X-StackDrift-Signature` header.

## Understanding the Output

### Snapshots (`data/snapshots/`)

One file per vendor document (e.g., `stripe-tos.json`). Contains the SHA256 hash, full cleaned text, and timestamp of the last scan.

### Changes (`data/changes/`)

One file per detected change (e.g., `2026-03-08-stripe-tos.json`). Contains:

| Field | Description |
|-------|-------------|
| `summary` | One sentence — what changed and why you should care |
| `impact` | Who is affected and how |
| `action` | What to do right now |
| `riskLevel` | `low` / `medium` / `high` / `critical` |
| `riskBucket` | Primary category: ownership, training, pricing, etc. |
| `isNoise` | `true` if the change is cosmetic (formatting, translations) |
| `diffExcerpt` | First 10 added and removed sentences |

### Review queue (`data/review-queue.json`)

Items held by the 90% removal gate — likely failed fetches, not real changes. Check these manually.

### Scan log (`data/scan-log.json`)

Running history of every scan attempt: success, failure, change detected, alerts sent.

## The Safeguards

These protect you from false positives. They're the result of running this engine in production across thousands of scans.

| Safeguard | What it does | Why it exists |
|-----------|-------------|---------------|
| **Content floor** | Rejects pages < 500 chars | Catches login walls, CAPTCHAs, JS shells |
| **SPA document skipping** | Skips known JS-rendered pages (Gumroad, Bolt.new, Bubble) | These return HTTP 200 but empty shells; need headless browser |
| **90% removal gate** | Holds for review if > 90% content gone | Catches 403s, rate limits, rendering failures |
| **First scan baseline** | Never alerts on first scan | Establishes baseline, not a "change" |
| **Recovery baseline** | After a failure, next success is silent | Prevents alert storms after intermittent outages |
| **Stale baseline** | Resets if > 30 days since last scan | Handles reactivated/dormant documents |
| **Full replacement** | Skips if > 80% sentences changed | Catches page redesigns, language swaps |
| **Retry logic** | 3 attempts, 5s delay, transient only | Handles rate limits and server errors |
| **Noise suppression** | Forces noise to `low`, no alerts | Formatting-only changes don't ping you |

## Customizing the Vendor List

### Adding a vendor

Add an entry to `data/vendor-catalog.json`:

```json
{
  "slug": "my-saas",
  "name": "My SaaS",
  "category": "productivity",
  "documents": [
    { "type": "tos", "url": "https://mysaas.com/terms", "label": "Terms of Service" },
    { "type": "privacy", "url": "https://mysaas.com/privacy", "label": "Privacy Policy" }
  ]
}
```

### Removing a vendor

Delete the entry from `data/vendor-catalog.json`. Existing snapshots in `data/snapshots/` can be deleted or left in place (they'll be ignored).

### Categories

`payment`, `cloud`, `ai-platform`, `ai-builder`, `devtools`, `automation`, `analytics`, `scraping`, `productivity`

---

**Want a dashboard, team alerts, and webhook integrations without managing any of this?** Check out [StackDrift](https://stackdrift.app) — the hosted version with a full UI.
