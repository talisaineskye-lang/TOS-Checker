# Design: Changelog-First Scanning + Signal Detection

**Date:** 2026-03-10
**Status:** Approved

## Problem

StackDrift missed GitHub's March 5th policy changes because:
1. Changelogs (the single URL that catches all policy changes) are scanned in arbitrary order
2. The analyzer has no way to flag when a changelog mentions a new or deprecated document

## Solution

Two tightly-scoped changes:
1. Sort changelog documents first in every scan so policy signals surface before stale document URLs are processed
2. Teach the analyzer to detect "new document" and "deprecation" patterns and return a structured `signal` field — deterministic code builds the prefix string, not the LLM

## Design

### 1. Scan Ordering (changelog-first)

Sort the fetched documents array before the loop in both scan routes:

```
changelogs first → all other doc types in original order
```

Files: `app/api/cron/check-tos/route.ts`, `app/api/admin/trigger-check/route.ts`

No DB change. One-line sort.

### 2. Analyzer Schema (`lib/analyzer.ts`)

Add optional `signal` to the JSON response shape:

```typescript
signal?: {
  type: 'NEW_DOCUMENT' | 'DEPRECATED';
  documentName: string;  // e.g. "GitHub Generative AI Services Terms"
  details: string;       // e.g. "supersedes Copilot Product Specific Terms as of March 5, 2026"
}
```

Update system prompt with a dedicated instruction block. LLM populates `signal` when it detects:
- A new document being introduced: "New subscriptions governed by...", "We've added [Policy]..."
- A document being deprecated/superseded: "This document is deprecated...", "will be replaced by..."

LLM only emits `signal` when confident. Absent = no signal detected.

### 3. Cron Post-Analysis Handling

After analysis, if `result.signal` is present:

1. Build prefix string deterministically:
   ```
   [SIGNAL:NEW_DOCUMENT] GitHub Generative AI Services Terms — supersedes Copilot Product Specific Terms as of March 5, 2026
   [SIGNAL:DEPRECATED] GitHub Copilot Product Specific Terms — superseded by Generative AI Services Terms
   ```
2. Prepend prefix to `summary`
3. Force `pending_review = true`
4. Log: `[check-tos] SIGNAL:${signal.type} detected in "${displayName}" — ${signal.documentName}`

Files: `app/api/cron/check-tos/route.ts`, `app/api/admin/trigger-check/route.ts`

### No Supabase Changes Required

`pending_review` (boolean) and `summary` (text) already exist on the `changes` table.

The `[SIGNAL:TYPE]` prefix format is designed to be parseable — if a `document_hint` JSONB column is added later, existing summaries can be backfilled via regex.

## Files Touched

| File | Change |
|---|---|
| `lib/analyzer.ts` | Add `signal` to response schema; update system prompt |
| `app/api/cron/check-tos/route.ts` | Sort changelogs first; handle `signal` post-analysis |
| `app/api/admin/trigger-check/route.ts` | Same as cron |

## Out of Scope

- Quarterly vendor audit checklist (separate workflow/process task)
- `document_hint` JSONB column (future migration path, not needed now)
- Automatic URL fetching for detected new documents (keeps a human in the loop)
