# Process Change Workflow

This workflow handles a single detected change. It takes the old and new content, runs the diff, sends it to Claude Sonnet for analysis, classifies the risk, and returns a structured result.

## Inputs

- `vendorName`: Display name (e.g., "Stripe")
- `docType`: Document type label (e.g., "Terms of Service")
- `oldContent`: Previous snapshot content
- `newContent`: Current fetched content

## Steps

1. **Run sentence diff.** Call the `diff-sentences` tool with `oldContent` and `newContent`.
   - Splits on `.!?` boundaries
   - Returns added sentences (in new, not in old) and removed sentences (in old, not in new)
   - Caps total output at 12,000 characters (5,000 per section)

2. **Send to Claude Sonnet.** Call the `analyze-change` tool with:
   - `vendorName`, `docType`, `added[]`, `removed[]`
   - Sonnet returns JSON: `{ summary, impact, action, suggestedRiskLevel, isNoise }`
   - If Sonnet fails after 2 attempts, falls back to keyword-only classification

3. **Run keyword classifier.** Call the `classify-risk` tool with combined added + removed text.
   - Returns matched risk buckets (ownership, training, pricing, etc.)
   - Returns classifier-level risk assessment

4. **Combine results.** The LLM assessment is the primary signal:
   - Use Sonnet's `suggestedRiskLevel` as the final risk level
   - Use Sonnet's `isNoise` flag — if true, force risk level to `low`
   - Use the classifier's `primaryBucket` for categorization
   - If Sonnet failed (`analysisFailed: true`), use the classifier's risk level instead

5. **Return structured result:**

```json
{
  "summary": "One sentence — what changed and why it matters",
  "impact": "Who is affected and how",
  "action": "What to do right now",
  "riskLevel": "low | medium | high | critical",
  "riskBucket": "ownership | training | pricing | ...",
  "categories": ["ownership", "training"],
  "isNoise": false,
  "analysisFailed": false,
  "diffExcerpt": {
    "added": ["first 10 added sentences..."],
    "removed": ["first 10 removed sentences..."]
  }
}
```

## Risk Level Definitions

| Level | Meaning | Examples |
|-------|---------|---------|
| `low` | No material impact | Wording clarifications, contact info updates |
| `medium` | Worth noting | Visibility defaults, pricing adjustments, new usage caps |
| `high` | Significant shift | Training opt-outs removed, model deprecations, export limits |
| `critical` | Immediate action | IP ownership changed, retroactive changes, service shutdown |

## Noise Detection

A change is **noise** if it's a non-substantive change:
- Language translations
- Tracking ID rotations
- Session token changes
- Minor whitespace/formatting
- Internal reference numbers

Even low-risk changes (like contact email updates) are NOT noise — they're real changes, just low impact.
