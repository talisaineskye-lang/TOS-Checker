# How Scanning Works

## Overview

StackDrift's scanner fetches the HTML of each tracked document URL, extracts the visible text, hashes it, and compares it against the last stored snapshot. If the hash differs, it diffs the content at the sentence level and sends the diff to Claude Sonnet for analysis.

The pipeline runs in this order for every active document:

1. **Fetch** — HTTP GET with 3 retries, 5s delay, 15s timeout
2. **Clean** — Strip HTML tags, nav, scripts, boilerplate; normalize whitespace
3. **Hash** — SHA256 of cleaned text
4. **Compare** — Check hash against stored snapshot; skip if unchanged
5. **Diff** — Split content into sentences, identify added and removed lines
6. **Analyze** — Send diff to Claude Sonnet: summary, impact, action, risk level, noise flag
7. **Store** — Save new snapshot and change record
8. **Alert** — Dispatch email/Slack/webhook for medium/high/critical non-noise changes

---

## What It Catches

- Wording changes to Terms of Service, Privacy Policies, API Terms, AUPs
- Pricing page updates (rate changes, tier restructuring, new caps)
- Policy additions, removals, or restructures
- Deprecation notices (model retirements, API version sunsets)
- Data handling and training clause changes
- IP ownership and licensing modifications

## What It Doesn't Catch

- **Changes on JS-rendered (SPA) pages** — Pages that require a headless browser to render are skipped. Known examples: Gumroad, Bolt.new, Bubble.io. See the SPA safeguard below.
- **New documents that aren't tracked** — If a vendor publishes a brand-new policy at a URL not in the catalog, it won't be detected until that URL is added. See [Changelog URL Strategy](#changelog-url-strategy) below.
- **PDF-only documents** — PDFs hosted on CDN links are not fetched; only stable HTML URLs are supported.
- **Changes behind login walls** — If a document redirects to an auth page, the fetch returns too little content and is rejected by the content floor.
- **Very large page restructures** — If >80% of sentences change at once (full page redesign, language swap), the scanner saves a new baseline without alerting, to avoid false-positive noise storms.

---

## Changelog URL Strategy

The most reliable way to catch all policy changes for a vendor is to track their **changelog or updates page** — a single URL maintained by the vendor that logs every policy change with dates.

When a changelog page is tracked (`doc_type: 'changelog'`), the scanner processes it **before** all other document types for that vendor. This means if a changelog mentions a new document, you see the signal before scanning (now-potentially-stale) individual policy URLs.

### Vendors with known changelog URLs

| Vendor | Changelog URL | What it covers |
|--------|--------------|----------------|
| GitHub | `github.com/customer-terms/updates` | All customer agreement changes |
| Xero | `developer.xero.com/faq/pricing-and-policy-updates` | Developer pricing and policy changes |
| Xero | `developer.xero.com/changelog` | API-level changes and deprecations |
| OpenAI | `platform.openai.com/docs/deprecations` | Model and API deprecations |
| Anthropic | `docs.anthropic.com/en/docs/about-claude/model-deprecations` | Model deprecations |

### How to find a vendor's changelog

1. Check `[vendor.com]/legal` or `[vendor.com]/updates`
2. Search `[vendor name] site:github.com customer-terms` — many enterprise vendors maintain a public `customer-terms` GitHub repo
3. Check their developer docs for a "changelog" or "what's new" section
4. Look for "policy history" or "version history" links at the bottom of their TOS

---

## Signal Detection

> **Status: Implemented in production (StackDrift app). Planned for blueprint.**

When the analyzer detects language indicating a **new policy document** or a **deprecated document**, it emits a structured signal alongside the normal analysis.

### Signal types

| Signal | Triggers when | Example |
|--------|--------------|---------|
| `NEW_DOCUMENT` | Diff mentions a new policy being introduced | "New subscriptions will be governed by the GitHub Generative AI Services Terms" |
| `DEPRECATED` | Diff mentions an existing document being retired | "This document is deprecated as of March 5, 2026" |

### What happens

When a signal is detected, the change record is flagged with:
- `pending_review: true` — appears in the admin review queue
- `summary` prefixed with `[SIGNAL:NEW_DOCUMENT] Document Name — details` or `[SIGNAL:DEPRECATED] Document Name — details`

This keeps a human in the loop: the signal tells you a new URL exists and needs to be added to the catalog, but doesn't attempt to auto-discover or auto-track it.

### Example signal in a change record

```
[SIGNAL:NEW_DOCUMENT] GitHub Generative AI Services Terms — supersedes Copilot Product Specific Terms as of March 5, 2026

GitHub has deprecated the Copilot Product Specific Terms. New subscriptions are governed by the new Generative AI Services Terms.
```

### Backfill compatibility

The `[SIGNAL:TYPE]` prefix format is designed to be machine-parseable. If a structured `document_hint` column is added to the database later, existing records can be backfilled by parsing the prefix with a simple regex:

```
/^\[SIGNAL:(NEW_DOCUMENT|DEPRECATED)\] (.+?) — (.+)$/
```

---

## Quarterly Vendor Audit

**Recommendation:** Every quarter, manually review each vendor's policy hub for new documents.

The scanner catches *changes* to tracked documents. It cannot catch a vendor quietly publishing a new policy at an untracked URL. Regular audits close this gap.

### Audit checklist

For each vendor in your catalog:

- [ ] Visit `[vendor.com]/legal` — any new documents listed?
- [ ] Check the vendor's changelog URL (if tracked) for references to new policies
- [ ] Search for `"[Vendor Name] terms" site:github.com/customer-terms`
- [ ] Check developer docs for new "platform terms" or "commercial terms" pages
- [ ] Note any documents referenced in existing tracked pages that aren't in the catalog

When you find a new URL, add it to `data/vendor-catalog.json` (blueprint) or the `documents` table in Supabase (production).

---

## Safeguard Reference

All safeguards are fail-safe: when in doubt, the system saves a baseline silently rather than alerting.

| Safeguard | Trigger condition | What happens |
|-----------|------------------|--------------|
| **Content floor** | Fetched content < 500 chars | Logged as failure, skipped |
| **SPA skipping** | URL matches known JS-rendered page list | Logged as `spa_not_supported`, skipped |
| **HTTP failure** | Non-200 status, timeout, or network error | Logged as scan failure, skipped |
| **First scan** | No prior snapshot exists | Baseline saved, no analysis |
| **Recovery baseline** | Prior scan was a failure | New baseline saved silently |
| **Stale baseline** | Last snapshot > 30 days old | New baseline saved silently |
| **90% removal gate** | > 90% of prior content gone | Held in review queue, admin notified |
| **Full replacement** | > 80% sentences changed AND > 100 affected | New baseline saved, `is_noise: true` |
| **Noise suppression** | Claude flags `isNoise: true` | Risk forced to `low`, no alert |
| **First-scan calibration** | First comparison + low/noise result | Change discarded silently |
| **Retry logic** | HTTP 429, 5xx, timeout, network error | Up to 3 retries with 5s delay |
