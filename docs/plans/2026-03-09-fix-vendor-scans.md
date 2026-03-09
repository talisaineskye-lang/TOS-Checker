# Fix Vendor Scans — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix broken vendor scan URLs, restore dropped vendors, and properly categorize SPA failures.

**Architecture:** Database URL updates + schema change (`fetch_method` column on documents) + code changes to fetcher types and scan logic to handle SPA documents and track `last_checked_at` on failures.

**Tech Stack:** Supabase (direct REST API for DB changes), Next.js API routes, TypeScript

---

## Investigation Summary

### Issue 1: Stale URLs (404 errors)
- Framer moved legal pages: `/legal/terms/` → `/legal/terms-of-service/`
- FlutterFlow moved: `/terms-of-service` → `/tos`, `/privacy-policy` → `/privacy`
- Cursor TOS: `/terms` → `/terms-of-service` (privacy already works)
- Cursor AUP duplicates TOS URL — leave for now, note to user

### Issue 2: Dropped vendors
- **Root cause:** These ARE being scanned daily but failing. `last_checked_at` only updates on success, making them look stale.
- Replit AUP: URL 404 → new URL: `docs.replit.com/legal-and-security-info/usage` (1902 chars ✓)
- Wise Privacy: Hub page returns 126 chars → actual policy at `wise.com/gb/legal/privacy-notice-personal-en` (50K chars ✓)
- Bubble: SPA (15 chars) → belongs with Issue 3
- Fix: Also update `last_checked_at` on failure in scan logic

### Issue 3: SPA vendors (Bolt.new, Gumroad, Bubble)
- HTTP 200 but 0-15 chars extracted — JavaScript-rendered pages
- Add `fetch_method` column to documents, flag as `spa`
- Add `spa_not_supported` failure reason to fetcher
- Scan logic: check fetch_method before fetching, log proper failure type

---

## Task 1: Database — Add fetch_method column

**Supabase SQL:**
```sql
ALTER TABLE documents ADD COLUMN fetch_method text DEFAULT NULL;
COMMENT ON COLUMN documents.fetch_method IS 'NULL=standard server fetch, spa=JS-rendered page needing headless browser';
```

## Task 2: Database — Update stale URLs

| Vendor | Doc Type | Old URL | New URL |
|--------|----------|---------|---------|
| Framer | tos | framer.com/legal/terms/ | framer.com/legal/terms-of-service/ |
| Framer | privacy | framer.com/legal/privacy/ | framer.com/legal/privacy-statement/ |
| Framer | aup | framer.com/legal/terms/ | framer.com/legal/acceptable-use-policy/ |
| FlutterFlow | tos | flutterflow.io/terms-of-service | flutterflow.io/tos |
| FlutterFlow | privacy | flutterflow.io/privacy-policy | flutterflow.io/privacy |
| FlutterFlow | aup | flutterflow.io/terms-of-service | flutterflow.io/tos |
| Cursor | tos | cursor.com/terms | cursor.com/terms-of-service |
| Replit | aup | docs.replit.com/.../community-standards | docs.replit.com/legal-and-security-info/usage |
| Wise | privacy | wise.com/us/legal/privacy-policy | wise.com/gb/legal/privacy-notice-personal-en |

Then: reset `last_checked_at=null` and delete `scan_failures` for all updated documents.

## Task 3: Database — Flag SPA vendors

Set `fetch_method='spa'` on documents for: Bolt.new, Gumroad, Bubble (all docs).

## Task 4: Code — Add spa_not_supported failure type

**File:** `lib/fetcher.ts`
- Add `'spa_not_supported'` to `FetchFailureReason` union type

## Task 5: Code — Update scan logic for SPA + last_checked_at on failure

**File:** `app/api/cron/check-tos/route.ts`
- After fetch failure block (line ~60-74): also update `last_checked_at`
- Before fetch: if `doc.fetch_method === 'spa'`, skip fetch and log `spa_not_supported` failure
- Include `fetch_method` in the DocumentWithVendor interface and select query

**File:** `app/api/admin/trigger-check/route.ts`
- Same changes as above

## Task 6: Verify — Trigger manual scan and confirm results
