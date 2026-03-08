# Monitor Vendors Workflow

This is the main scan workflow. It fetches every tracked vendor document, checks for changes against the stored baseline, and triggers analysis + alerts when meaningful changes are found.

## Steps

1. **Load the vendor list.** Read `data/vendor-catalog.json`. If a stack profile was specified (e.g., `ai-tools`, `payments`, `cloud-infra`), load the profile from `stack-profiles/{name}.json` and filter the catalog to only include those vendor slugs.

2. **For each vendor, for each document in their `documents[]` array:**

   a. **Fetch the document.** Call the `fetch-vendor-doc` tool with the document URL.
      - If the fetch fails (HTTP error, timeout, network error), log the failure to `data/scan-log.json` and skip to the next document.

   b. **Clean the content.** Call the `clean-content` tool with the raw HTML.
      - Stage 1: Strip scripts, styles, nav, footer, header, tracking pixels via Cheerio
      - Stage 2: Strip UUIDs, timestamps, hex tokens, multi-param query strings via regex
      - If cleaned content is < 500 characters, log as `content_too_short` and skip.

   c. **Hash and compare.** Compute SHA256 of cleaned text. Load the stored snapshot from `data/snapshots/{vendor-slug}-{doc-type}.json`.
      - **First scan (no snapshot exists):** Save as initial baseline. Do not analyze or alert. Move to next document.
      - **No change (hash matches):** Log as `no_change`. Move to next document.

   d. **Apply safeguards before analysis:**
      - **Recovery baseline:** If the previous scan for this document was a failure (check `data/scan-log.json`), save the new content as a recovery baseline without alerting.
      - **Stale baseline:** If the stored snapshot is > 30 days old, save as a baseline reset without alerting.
      - **Full replacement:** If > 80% of sentences changed AND > 100 total sentences changed, save as baseline without alerting (likely page redesign or language swap).
      - **90% removal gate:** If > 90% of previous content was removed, do NOT alert. Add to `data/review-queue.json` for manual review. Log a warning.

   e. **Diff and analyze.** If none of the safeguards triggered:
      - Call the `diff-sentences` tool to get added/removed sentences
      - Call the `analyze-change` tool (Claude Sonnet) to get summary, impact, action, risk level, is_noise
      - Call the `classify-risk` tool for keyword bucket classification
      - If `is_noise` is true, force risk level to `low`

   f. **Store the result.** Call the `store-result` tool:
      - Save new snapshot to `data/snapshots/`
      - Save change record to `data/changes/`
      - Log scan result to `data/scan-log.json`

   g. **Dispatch alerts.** If risk level is `medium`, `high`, or `critical` AND not noise:
      - Call the `dispatch-alert` tool
      - Email (if RESEND_API_KEY set), Slack (if SLACK_WEBHOOK_URL set), Webhook (if WEBHOOK_URL set)

3. **Log summary.** Print: `X vendors scanned, Y changes detected, Z alerts dispatched, W failures`.

## Running This Workflow

```bash
# Full scan
npx tsx tools/run-scan.ts

# Scan a specific profile
npx tsx tools/run-scan.ts --profile ai-tools

# Scan a single vendor
npx tsx tools/run-scan.ts --vendor stripe

# Dry run (fetch + clean only, no API calls)
npx tsx tools/run-scan.ts --dry-run
```

Or via Claude Code:
```
claude --project blueprint/ 'Run the monitor-vendors workflow for all vendors'
claude --project blueprint/ 'Run the monitor-vendors workflow using the payments profile'
```
