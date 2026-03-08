# StackDrift Agent Blueprint

## Project Purpose

This is a standalone vendor policy monitoring agent extracted from the StackDrift production engine (stackdrift.app). It watches the Terms of Service, Privacy Policies, pricing pages, and API terms of 55+ SaaS vendors for changes, analyzes each change using Claude Sonnet, classifies the business risk, and dispatches alerts. No database, no frontend, no deployment platform required — just Node.js and an Anthropic API key.

## Architecture Overview

The monitoring pipeline runs in this exact order:

1. **Load vendors** — Read `data/vendor-catalog.json` (or a stack profile subset)
2. **Fetch** — HTTP GET each document URL with retry logic (15s timeout, 3 attempts)
3. **Clean HTML** — Strip non-content elements via Cheerio, then strip dynamic strings via regex
4. **Content floor** — Reject content shorter than 500 characters
5. **Hash compare** — SHA256 of cleaned text vs. stored snapshot in `data/snapshots/`
6. **If changed:** Run sentence-level diff (split on `.!?`, cap at 12K chars)
7. **Analyze** — Send diff to Claude Sonnet for structured JSON: summary, impact, action, risk_level, is_noise
8. **Classify** — Keyword bucket detection: ownership, training, visibility, export, pricing, deprecation
9. **Store** — Save new snapshot + change record to `data/changes/`
10. **Alert** — If medium/high/critical and not noise: dispatch via email, Slack, and/or webhook

## Safeguards

These are production-hardened protections against false positives. ALL are implemented in `tools/run-scan.ts`:

### 1. HTTP Status Check
Non-200 responses are logged as failures. Only transient errors (429, 5xx, timeout, network) are retried.

### 2. Content Floor (500 chars)
If cleaned content is shorter than 500 characters, the document is marked `content_too_short` and skipped. This catches login walls, CAPTCHA pages, and JS-rendered pages that return a shell.

### 3. 90% Removal Gate
If >90% of the previous content's sentences are missing from the new content, the change is NOT sent to users. Instead, it's added to `data/review-queue.json` with a warning. This catches: 403 pages, rate-limited responses, and JS rendering failures that passed the content floor.

### 4a. First Scan Behavior
The first time a document is scanned (no existing snapshot), the content is saved as a baseline. No analysis, no alerts.

### 4b. Recovery Baseline
If the previous scan for a document failed (logged in scan-log.json), the next successful scan saves a new baseline WITHOUT alerting. This prevents false positives from intermittent fetch failures.

### 4c. Stale Baseline Reset
If the stored snapshot is >30 days old, the document is treated as reactivated. New content is saved as a baseline without alerting.

### 5. Full Replacement Detection
If >80% of sentences changed AND >100 total sentences are affected, this is likely a page redesign, language swap, or major restructure. Saved as a new baseline without analysis or alerts.

### 6. Retry Logic
3 attempts maximum with 5-second delay between retries. Only retries on transient errors:
- HTTP 429 (rate limited)
- HTTP 5xx (server errors)
- Timeout (15-second limit)
- Network errors (DNS, connection refused, etc.)

Does NOT retry on:
- HTTP 4xx (except 429) — deterministic client errors
- `content_too_short` — deterministic content issue

### 7. Noise Suppression
If Claude Sonnet flags a change as noise (`isNoise: true`), the risk level is forced to `low` and no alerts are dispatched. Noise includes: language translations, tracking ID rotations, session tokens, minor formatting changes.

## File Structure

```
blueprint/
  CLAUDE.md                    ← You are here
  README.md                    ← Setup guide
  .env.example                 ← Environment variables
  package.json                 ← Dependencies

  workflows/
    monitor-vendors.md         ← Main scan workflow
    process-change.md          ← Change analysis workflow
    alert-dispatch.md          ← Notification workflow
    setup-first-run.md         ← First-time setup

  tools/
    fetch-vendor-doc.ts        ← HTTP fetch with retry
    clean-content.ts           ← Cheerio + regex cleaning
    diff-sentences.ts          ← Sentence-level diff + hashing
    analyze-change.ts          ← Claude Sonnet analysis
    classify-risk.ts           ← Keyword bucket classifier
    store-result.ts            ← Local JSON file storage
    dispatch-alert.ts          ← Email/Slack/webhook dispatch
    run-scan.ts                ← CLI entry point (orchestrator)

  data/
    vendor-catalog.json        ← 55+ vendors with document URLs
    snapshots/                 ← Stored baselines (gitignored)
    changes/                   ← Change records (gitignored)

  stack-profiles/
    ai-tools.json              ← AI platforms + builders
    payments.json              ← Payment processors
    cloud-infra.json           ← Cloud & infrastructure
```

## Running the Agent

### Manual scan
```bash
# All vendors
npx tsx tools/run-scan.ts

# Stack profile
npx tsx tools/run-scan.ts --profile ai-tools

# Single vendor
npx tsx tools/run-scan.ts --vendor stripe

# Dry run (fetch only, no API calls)
npx tsx tools/run-scan.ts --dry-run
```

### Via Claude Code
```bash
claude --project blueprint/ 'Run a full scan of all vendors in vendor-catalog.json'
claude --project blueprint/ 'Scan only the payments profile'
claude --project blueprint/ 'Check if Stripe has updated their terms'
```

### Scheduled (cron)
```bash
# Daily at 6 AM UTC
0 6 * * * cd /path/to/blueprint && npx tsx tools/run-scan.ts >> /var/log/stackdrift.log 2>&1
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key for Claude Sonnet analysis |
| `RESEND_API_KEY` | No | Resend API key for email alerts |
| `ALERT_EMAIL_FROM` | No | Sender email (default: `StackDrift Agent <alerts@stackdrift.app>`) |
| `ALERT_EMAIL_TO` | No | Recipient email for alerts |
| `SLACK_WEBHOOK_URL` | No | Slack incoming webhook URL |
| `SLACK_MIN_SEVERITY` | No | Minimum severity for Slack alerts (default: `medium`) |
| `WEBHOOK_URL` | No | Custom webhook endpoint URL |
| `WEBHOOK_SECRET` | No | HMAC-SHA256 signing secret for webhook payloads |

## Key Design Decisions

- **LLM is primary signal.** The keyword classifier is secondary confirmation. Claude Sonnet understands context (translations, rewording) that keyword matching cannot distinguish.
- **Flat file storage.** No database required. Snapshots and changes are JSON files. This keeps the blueprint zero-dependency beyond Node.js and the Anthropic SDK.
- **All safeguards are fail-safe.** When in doubt, the system saves a baseline and does NOT alert. False negatives are preferable to false positives.
- **Tools are standalone.** Each tool file receives inputs as parameters and returns outputs explicitly. No shared state, no singletons, no global config.

## Adding Custom Vendors

Add entries to `data/vendor-catalog.json`:

```json
{
  "slug": "my-vendor",
  "name": "My Vendor",
  "category": "cloud",
  "documents": [
    { "type": "tos", "url": "https://myvendor.com/terms", "label": "Terms of Service" },
    { "type": "privacy", "url": "https://myvendor.com/privacy", "label": "Privacy Policy" }
  ]
}
```

Or create a custom stack profile at `stack-profiles/my-stack.json`:
```json
["stripe", "openai", "my-vendor"]
```
