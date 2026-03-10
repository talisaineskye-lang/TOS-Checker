# Changelog-First Scanning + Signal Detection Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sort changelog documents first in all scans, and teach the analyzer to detect "new document" and "deprecated" patterns, emitting structured `[SIGNAL:TYPE]` prefixes in change summaries and flagging them for admin review.

**Architecture:** Add an optional `signal` field to `AnalysisResult` — the LLM classifies the pattern and extracts the document name; the cron routes build the prefix string deterministically and prepend it to the stored summary. Both scan routes sort changelogs to the front of the document loop before iterating.

**Tech Stack:** TypeScript, Next.js App Router, Anthropic SDK (claude-sonnet-4-20250514), Supabase

**Spec:** `docs/superpowers/specs/2026-03-10-changelog-first-signal-detection-design.md`

---

## Chunk 1: Analyzer changes

### Task 1: Add `signal` to `AnalysisResult` and export `buildSignalPrefix`

**Files:**
- Modify: `lib/analyzer.ts:9-20` (AnalysisResult interface)
- Modify: `lib/analyzer.ts` (add buildSignalPrefix export)

- [ ] **Step 1: Add `signal` to the `AnalysisResult` interface**

  In `lib/analyzer.ts`, replace the `AnalysisResult` interface (lines 9–20):

  ```typescript
  export interface AnalysisResult {
    summary: string;
    impact: string;
    action: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    riskBucket: RiskBucket | null;
    riskPriority: RiskPriority;
    categories: string[];
    title: string;
    isNoise: boolean;
    analysisFailed: boolean;
    signal?: {
      type: 'NEW_DOCUMENT' | 'DEPRECATED';
      documentName: string;
      details: string;
    };
  }
  ```

- [ ] **Step 2: Export `buildSignalPrefix` helper directly below the interface**

  Add after the `AnalysisResult` interface closing brace:

  ```typescript
  /** Build a deterministic [SIGNAL:TYPE] prefix string from a detected signal. */
  export function buildSignalPrefix(signal: NonNullable<AnalysisResult['signal']>): string {
    return `[SIGNAL:${signal.type}] ${signal.documentName} — ${signal.details}`;
  }
  ```

- [ ] **Step 3: Verify TypeScript compiles**

  Run: `npx tsc --noEmit`
  Expected: No errors on `lib/analyzer.ts`

---

### Task 2: Update analyzer prompt and JSON parsing to include `signal`

**Files:**
- Modify: `lib/analyzer.ts:115-175` (prompt string)
- Modify: `lib/analyzer.ts:196-233` (llmResult parse + return)

- [ ] **Step 1: Add signal detection instructions to the prompt**

  In the prompt string, find the `isNoise` instruction line:
  ```
  - isNoise: true if this is a non-substantive change...
  ```

  Add this block directly after it (before the blank line that precedes "Risk levels:"):

  ```
  - signal: (optional) Populate ONLY when the diff explicitly mentions:
    a) A new policy document being introduced — e.g. "New subscriptions will be governed by [Document Name]", "We've added [Policy Name] to our terms", "See our new [Document]"
    b) An existing document being deprecated or superseded — e.g. "This document is deprecated as of [date]", "replaced by [Document Name]", "superseded by [New Policy]"
    When present, set:
      - type: "NEW_DOCUMENT" if a new document is referenced, "DEPRECATED" if an existing one is retiring
      - documentName: exact name of the new or deprecated document as it appears in the text
      - details: brief context string, e.g. "supersedes Copilot Product Specific Terms as of March 5, 2026"
    Omit the signal field entirely if neither condition is met.
  ```

- [ ] **Step 2: Update the JSON format at the bottom of the prompt**

  Find the closing JSON template (lines ~168–175):
  ```
  Respond with JSON only (no markdown, no backticks):
  {
    "summary": "...",
    "impact": "...",
    "action": "...",
    "suggestedRiskLevel": "low" | "medium" | "high" | "critical",
    "isNoise": true | false
  }
  ```

  Replace with:
  ```
  Respond with JSON only (no markdown, no backticks):
  {
    "summary": "...",
    "impact": "...",
    "action": "...",
    "suggestedRiskLevel": "low" | "medium" | "high" | "critical",
    "isNoise": true | false,
    "signal": { "type": "NEW_DOCUMENT" | "DEPRECATED", "documentName": "...", "details": "..." }
  }
  Note: Omit the "signal" key entirely if no new document or deprecation is detected.
  ```

- [ ] **Step 3: Update the `llmResult` type annotation to include `signal`**

  Find the `JSON.parse` line (~line 196):
  ```typescript
  const llmResult = JSON.parse(jsonText) as {
    summary: string;
    impact: string;
    action: string;
    suggestedRiskLevel: 'low' | 'medium' | 'high' | 'critical';
    isNoise: boolean;
  };
  ```

  Replace with:
  ```typescript
  const llmResult = JSON.parse(jsonText) as {
    summary: string;
    impact: string;
    action: string;
    suggestedRiskLevel: 'low' | 'medium' | 'high' | 'critical';
    isNoise: boolean;
    signal?: {
      type: 'NEW_DOCUMENT' | 'DEPRECATED';
      documentName: string;
      details: string;
    };
  };
  ```

- [ ] **Step 4: Return `signal` in the success return statement**

  Find the `return {` block (~line 222) that ends with `analysisFailed: false,`. Add `signal` before closing brace:

  ```typescript
  return {
    summary: llmResult.summary,
    impact: llmResult.impact,
    action: llmResult.action,
    riskLevel: finalRiskLevel,
    riskBucket: classification.primaryBucket,
    riskPriority: finalPriority,
    categories: classification.buckets,
    title,
    isNoise: llmResult.isNoise,
    analysisFailed: false,
    signal: llmResult.signal,
  };
  ```

  The fallback return (~line 268) does not need `signal` — it's already `analysisFailed: true` and signal detection requires a successful parse.

- [ ] **Step 5: Verify TypeScript compiles**

  Run: `npx tsc --noEmit`
  Expected: No errors

- [ ] **Step 6: Commit**

  ```bash
  git add lib/analyzer.ts
  git commit -m "feat(analyzer): add signal detection for new document and deprecation notices"
  ```

---

## Chunk 2: Cron route changes

### Task 3: Changelog-first sort + signal handling in `check-tos`

**Files:**
- Modify: `app/api/cron/check-tos/route.ts:1-12` (imports)
- Modify: `app/api/cron/check-tos/route.ts:48` (for loop — sort before iterating)
- Modify: `app/api/cron/check-tos/route.ts:305-337` (post-analysis signal block + changePayload)

- [ ] **Step 1: Add `buildSignalPrefix` to the analyzer import**

  Find line 5:
  ```typescript
  import { analyzeChanges } from '@/lib/analyzer';
  ```

  Replace with:
  ```typescript
  import { analyzeChanges, buildSignalPrefix } from '@/lib/analyzer';
  ```

- [ ] **Step 2: Sort changelogs first before the document loop**

  Find line 48:
  ```typescript
  for (const doc of documents as DocumentWithVendor[]) {
  ```

  Replace with:
  ```typescript
  const sortedDocuments = [...(documents as DocumentWithVendor[])].sort((a, b) =>
    a.doc_type === 'changelog' ? -1 : b.doc_type === 'changelog' ? 1 : 0
  );

  for (const doc of sortedDocuments) {
  ```

- [ ] **Step 3: Add signal handling block after the `analyzeChanges` call**

  Find line 305 (the analysis call + isNoise lines):
  ```typescript
  // Normal incremental change — run AI analysis
  const effectiveDate = extractEffectiveDate(content);
  const analysis = await analyzeChanges(displayName, diff.added, diff.removed, effectiveDate);

  // Safety Net 3 (existing): For noise changes, force risk_level to 'low'
  const isNoise = analysis.isNoise ?? false;
  const effectiveRiskLevel = isNoise ? 'low' : analysis.riskLevel;
  ```

  Replace with:
  ```typescript
  // Normal incremental change — run AI analysis
  const effectiveDate = extractEffectiveDate(content);
  const analysis = await analyzeChanges(displayName, diff.added, diff.removed, effectiveDate);

  // --- Signal detection: new document or deprecation notice ---
  let finalSummary = analysis.summary;
  let signalPendingReview = false;
  if (analysis.signal) {
    const prefix = buildSignalPrefix(analysis.signal);
    finalSummary = `${prefix}\n${analysis.summary}`;
    signalPendingReview = true;
    console.log(`[check-tos] SIGNAL:${analysis.signal.type} detected in "${displayName}" — ${analysis.signal.documentName}`);
  }

  // Safety Net 3 (existing): For noise changes, force risk_level to 'low'
  const isNoise = analysis.isNoise ?? false;
  const effectiveRiskLevel = isNoise ? 'low' : analysis.riskLevel;
  ```

- [ ] **Step 4: Update `changePayload` to use `finalSummary` and `signalPendingReview`**

  Find the `changePayload` object definition:
  ```typescript
  const changePayload = {
    vendor_id: doc.vendor_id,
    document_id: doc.id,
    old_snapshot_id: lastSnapshot.id,
    new_snapshot_id: newSnapshot.id,
    summary: analysis.summary,
    impact: analysis.impact,
    action: analysis.action,
    risk_level: effectiveRiskLevel,
    risk_bucket: analysis.riskBucket,
    risk_priority: isNoise ? 'low' : analysis.riskPriority,
    categories: analysis.categories,
    is_noise: isNoise,
    pending_review: false,
  };
  ```

  Replace with:
  ```typescript
  const changePayload = {
    vendor_id: doc.vendor_id,
    document_id: doc.id,
    old_snapshot_id: lastSnapshot.id,
    new_snapshot_id: newSnapshot.id,
    summary: finalSummary,
    impact: analysis.impact,
    action: analysis.action,
    risk_level: effectiveRiskLevel,
    risk_bucket: analysis.riskBucket,
    risk_priority: isNoise ? 'low' : analysis.riskPriority,
    categories: analysis.categories,
    is_noise: isNoise,
    pending_review: signalPendingReview,
  };
  ```

- [ ] **Step 5: Update `sendChangeAlert` to use `finalSummary`**

  Find the `sendChangeAlert` call inside the `if (effectiveRiskLevel !== 'low' && !isNoise)` block:
  ```typescript
  summary: analysis.summary,
  ```

  Replace with:
  ```typescript
  summary: finalSummary,
  ```

  Also update the webhookData block just below it:
  ```typescript
  summary: analysis.summary,
  ```
  Replace with:
  ```typescript
  summary: finalSummary,
  ```

- [ ] **Step 6: Verify TypeScript compiles**

  Run: `npx tsc --noEmit`
  Expected: No errors

- [ ] **Step 7: Commit**

  ```bash
  git add app/api/cron/check-tos/route.ts
  git commit -m "feat(cron): changelog-first scan ordering and signal prefix handling"
  ```

---

## Chunk 3: Admin trigger-check route changes

### Task 4: Same changes in `trigger-check`

**Files:**
- Modify: `app/api/admin/trigger-check/route.ts:1-12` (imports)
- Modify: `app/api/admin/trigger-check/route.ts:46` (for loop)
- Modify: `app/api/admin/trigger-check/route.ts:292-324` (post-analysis signal block + changePayload)

These changes mirror Task 3 exactly — same logic, same structure, different log prefix (`[trigger-check]`).

- [ ] **Step 1: Add `buildSignalPrefix` to the analyzer import**

  Find:
  ```typescript
  import { analyzeChanges } from '@/lib/analyzer';
  ```

  Replace with:
  ```typescript
  import { analyzeChanges, buildSignalPrefix } from '@/lib/analyzer';
  ```

- [ ] **Step 2: Sort changelogs first before the document loop**

  Find line 46:
  ```typescript
  for (const doc of documents as DocumentWithVendor[]) {
  ```

  Replace with:
  ```typescript
  const sortedDocuments = [...(documents as DocumentWithVendor[])].sort((a, b) =>
    a.doc_type === 'changelog' ? -1 : b.doc_type === 'changelog' ? 1 : 0
  );

  for (const doc of sortedDocuments) {
  ```

- [ ] **Step 3: Add signal handling block after the `analyzeChanges` call**

  Find:
  ```typescript
  // Normal incremental change — run AI analysis
  const effectiveDate = extractEffectiveDate(content);
  const analysis = await analyzeChanges(displayName, diff.added, diff.removed, effectiveDate);

  // Safety Net 3 (existing): For noise changes, force risk_level to 'low'
  const isNoise = analysis.isNoise ?? false;
  const effectiveRiskLevel = isNoise ? 'low' : analysis.riskLevel;
  ```

  Replace with:
  ```typescript
  // Normal incremental change — run AI analysis
  const effectiveDate = extractEffectiveDate(content);
  const analysis = await analyzeChanges(displayName, diff.added, diff.removed, effectiveDate);

  // --- Signal detection: new document or deprecation notice ---
  let finalSummary = analysis.summary;
  let signalPendingReview = false;
  if (analysis.signal) {
    const prefix = buildSignalPrefix(analysis.signal);
    finalSummary = `${prefix}\n${analysis.summary}`;
    signalPendingReview = true;
    console.log(`[trigger-check] SIGNAL:${analysis.signal.type} detected in "${displayName}" — ${analysis.signal.documentName}`);
  }

  // Safety Net 3 (existing): For noise changes, force risk_level to 'low'
  const isNoise = analysis.isNoise ?? false;
  const effectiveRiskLevel = isNoise ? 'low' : analysis.riskLevel;
  ```

- [ ] **Step 4: Update `changePayload` to use `finalSummary` and `signalPendingReview`**

  Find the `changePayload` object:
  ```typescript
  const changePayload = {
    vendor_id: doc.vendor_id,
    document_id: doc.id,
    old_snapshot_id: lastSnapshot.id,
    new_snapshot_id: newSnapshot.id,
    summary: analysis.summary,
    impact: analysis.impact,
    action: analysis.action,
    risk_level: effectiveRiskLevel,
    risk_bucket: analysis.riskBucket,
    risk_priority: isNoise ? 'low' : analysis.riskPriority,
    categories: analysis.categories,
    is_noise: isNoise,
    pending_review: false,
  };
  ```

  Replace with:
  ```typescript
  const changePayload = {
    vendor_id: doc.vendor_id,
    document_id: doc.id,
    old_snapshot_id: lastSnapshot.id,
    new_snapshot_id: newSnapshot.id,
    summary: finalSummary,
    impact: analysis.impact,
    action: analysis.action,
    risk_level: effectiveRiskLevel,
    risk_bucket: analysis.riskBucket,
    risk_priority: isNoise ? 'low' : analysis.riskPriority,
    categories: analysis.categories,
    is_noise: isNoise,
    pending_review: signalPendingReview,
  };
  ```

- [ ] **Step 5: Update `sendChangeAlert` to use `finalSummary`**

  In the `sendChangeAlert` call and webhookData block, replace both instances of:
  ```typescript
  summary: analysis.summary,
  ```
  with:
  ```typescript
  summary: finalSummary,
  ```

- [ ] **Step 6: Verify TypeScript compiles**

  Run: `npx tsc --noEmit`
  Expected: No errors

- [ ] **Step 7: Commit**

  ```bash
  git add app/api/admin/trigger-check/route.ts
  git commit -m "feat(admin): changelog-first scan ordering and signal prefix handling"
  ```

---

## Verification

- [ ] **Manual smoke test**

  After deploying or running locally, trigger a scan via the admin panel. Check Vercel/server logs for the sort order — changelog documents should appear before tos/privacy/aup in the log output per vendor.

- [ ] **Signal end-to-end test**

  To test signal detection without waiting for a real policy change: temporarily modify `lib/analyzer.ts` to return a hardcoded `signal` in the fallback return (the `analysisFailed` path), trigger a scan, verify the change record in Supabase has a `[SIGNAL:...]` prefix in `summary` and `pending_review = true`. Revert the hardcoded signal after confirming.

- [ ] **Supabase verification query**

  ```sql
  SELECT id, summary, pending_review, detected_at
  FROM changes
  WHERE summary LIKE '[SIGNAL:%'
  ORDER BY detected_at DESC
  LIMIT 10;
  ```

  Expected: Any signal-flagged changes appear here with correct prefix format.
