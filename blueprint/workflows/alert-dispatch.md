# Alert Dispatch Workflow

This workflow sends notifications when a meaningful change is detected. All three channels are optional — only active if the relevant environment variable is set.

## Inputs

- `vendorName`: Display name of the vendor
- `vendorSlug`: URL-safe identifier
- `docType`: Document type label
- `summary`: One-sentence change summary
- `impact`: Who is affected and how
- `action`: What to do right now
- `riskLevel`: low | medium | high | critical
- `categories`: Array of risk bucket names

## When to Dispatch

Only dispatch alerts when ALL of these are true:
- Risk level is `medium`, `high`, or `critical`
- The change is NOT noise (`isNoise: false`)
- At least one alert channel is configured

## Channels

### 1. Email (Resend)

**Required env vars:** `RESEND_API_KEY`, `ALERT_EMAIL_TO`
**Optional:** `ALERT_EMAIL_FROM` (defaults to `StackDrift Agent <alerts@stackdrift.app>`)

- Subject format: `[RISK_LEVEL] VendorName — Summary snippet`
- HTML email with severity color bar (red/orange/blue/green)
- Sections: vendor name, doc type, risk badge, summary, impact, action
- Footer with detection timestamp

### 2. Slack (Incoming Webhook)

**Required env var:** `SLACK_WEBHOOK_URL`
**Optional:** `SLACK_MIN_SEVERITY` (defaults to `medium`)

- Block Kit message with header + section + optional action button
- Severity emoji mapping:
  - critical = 🚨
  - high = ⚠️
  - medium = 📋
  - low = ℹ️
- Respects `SLACK_MIN_SEVERITY` — won't send if alert severity is below the minimum

### 3. Webhook (HMAC-SHA256 Signed)

**Required env var:** `WEBHOOK_URL`
**Optional:** `WEBHOOK_SECRET` (for HMAC-SHA256 signing)

- POST request with JSON payload
- Headers: `Content-Type`, `X-StackDrift-Event`, `X-StackDrift-Signature` (if secret set)
- Payload structure:
  ```json
  {
    "event": "vendor.change.detected",
    "timestamp": "2026-03-08T06:00:00.000Z",
    "vendor": "Stripe",
    "vendor_slug": "stripe",
    "document_type": "Terms of Service",
    "severity": "high",
    "summary": "...",
    "impact": "...",
    "action": "...",
    "tags": ["ownership", "training"]
  }
  ```
- Retries: 3 attempts with exponential backoff (2s, 4s) on 5xx or network errors
- 10-second timeout per attempt

## Logging

All dispatch attempts (success and failure) are logged to `data/scan-log.json` with:
- Which channels succeeded
- Which channels failed and why
- The risk level and vendor info

## Verifying Webhook Signatures

If you set `WEBHOOK_SECRET`, your receiving endpoint can verify authenticity:

```javascript
const crypto = require('crypto');

function verifySignature(body, signature, secret) {
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```
