# Setup & First Run Workflow

This workflow guides you through initial setup and the first baseline scan.

## Prerequisites

- Node.js 18 or later
- An Anthropic API key (Claude Max subscription or API access)

## Steps

### 1. Install Dependencies

```bash
cd blueprint/
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Open `.env` and fill in at minimum:

```
ANTHROPIC_API_KEY=sk-ant-...
```

All other variables (Resend, Slack, Webhook) are optional — you can add them later.

### 3. Choose Your Vendor List

You have three options:

**Option A — Full catalog (55+ vendors):**
No extra config needed. The scan will use `data/vendor-catalog.json` by default.

**Option B — Stack profile:**
Use a pre-configured subset:
- `ai-tools` — OpenAI, Anthropic, Gemini, Cursor, Lovable, etc.
- `payments` — Stripe, PayPal, Square, Paddle, etc.
- `cloud-infra` — AWS, Vercel, Cloudflare, Railway, etc.

**Option C — Custom list:**
Create your own profile at `stack-profiles/my-stack.json`:
```json
["stripe", "openai", "vercel", "github"]
```
Use vendor slugs from `data/vendor-catalog.json`.

### 4. Run First Scan (Baseline)

The first scan populates initial baselines — it will NOT trigger any alerts.

```bash
# Full catalog
npx tsx tools/run-scan.ts

# Or with a profile
npx tsx tools/run-scan.ts --profile ai-tools

# Or dry run first to test fetching
npx tsx tools/run-scan.ts --dry-run
```

### 5. Verify Baselines

Check that baseline snapshots were created:

```bash
ls data/snapshots/
```

You should see files like:
```
stripe-tos.json
stripe-privacy.json
openai-tos.json
...
```

Each file contains `{ hash, content, scannedAt }`.

### 6. Schedule Ongoing Scans

**Option A — Cron job (simplest):**
```bash
# Daily at 6 AM UTC
0 6 * * * cd /path/to/blueprint && npx tsx tools/run-scan.ts >> /var/log/stackdrift-scan.log 2>&1
```

**Option B — Claude Code manual:**
```bash
claude --project blueprint/ 'Run a full scan of all vendors'
```

**Option C — Trigger.dev or similar:**
Deploy the scan as a scheduled task on Trigger.dev, Inngest, or any job scheduler that supports Node.js.

### 7. Test Alerts (Optional)

To verify your alert channels work, temporarily modify a snapshot to force a change detection:

1. Open any snapshot file in `data/snapshots/`
2. Change the `hash` to `"test"`
3. Run the scan — it will detect a "change" and dispatch alerts
4. Restore the original hash after testing

## What Happens Next

On subsequent scans:
- **No change:** Hash matches → logged and skipped
- **Change detected:** Diff → Claude Sonnet analysis → risk classification → store → alert
- **Safeguards fire:** Recovery baselines, stale resets, and 90% removal gates protect against false positives

Check `data/scan-log.json` for a running history of all scan results.
Check `data/changes/` for detailed change records.
Check `data/review-queue.json` for items held by the 90% removal gate.
