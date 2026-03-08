/**
 * run-scan.ts — CLI entry point for the StackDrift Agent Blueprint.
 *
 * Usage:
 *   npx tsx tools/run-scan.ts                         # Scan all vendors
 *   npx tsx tools/run-scan.ts --profile ai-tools      # Scan AI tools only
 *   npx tsx tools/run-scan.ts --vendor stripe         # Scan single vendor
 *   npx tsx tools/run-scan.ts --dry-run               # Check fetches only, no analysis
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchVendorDoc } from './fetch-vendor-doc.js';
import { cleanContent } from './clean-content.js';
import { hashContent, hasChanged, diffSentences, getRemovalRatio, isFullReplacement } from './diff-sentences.js';
import { analyzeChange } from './analyze-change.js';
import { getSnapshot, saveSnapshot, saveChange, addToReviewQueue, logScan, wasPreviousScanFailure as checkPreviousFailure } from './store-result.js';
import { dispatchAlert } from './dispatch-alert.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..', 'data');

interface VendorDoc {
  type: string;
  url: string;
  label?: string;
}

interface Vendor {
  slug: string;
  name: string;
  category: string;
  documents: VendorDoc[];
}

// --- Load vendor list ---

function loadVendors(profileName?: string, singleVendor?: string): Vendor[] {
  const catalogPath = path.join(DATA_DIR, 'vendor-catalog.json');
  const catalog: Vendor[] = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));

  if (singleVendor) {
    const vendor = catalog.find((v) => v.slug === singleVendor);
    if (!vendor) {
      console.error(`Vendor "${singleVendor}" not found in catalog.`);
      process.exit(1);
    }
    return [vendor];
  }

  if (profileName) {
    const profilePath = path.join(DATA_DIR, '..', 'stack-profiles', `${profileName}.json`);
    if (!fs.existsSync(profilePath)) {
      console.error(`Stack profile "${profileName}" not found at ${profilePath}`);
      process.exit(1);
    }
    const slugs: string[] = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
    return catalog.filter((v) => slugs.includes(v.slug));
  }

  return catalog;
}

// --- Parse CLI args ---

function parseArgs(): { profile?: string; vendor?: string; dryRun: boolean } {
  const args = process.argv.slice(2);
  let profile: string | undefined;
  let vendor: string | undefined;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--profile' && args[i + 1]) { profile = args[++i]; }
    else if (args[i] === '--vendor' && args[i + 1]) { vendor = args[++i]; }
    else if (args[i] === '--dry-run') { dryRun = true; }
  }

  return { profile, vendor, dryRun };
}

// --- Main scan loop ---

async function main() {
  const { profile, vendor, dryRun } = parseArgs();

  if (!process.env.ANTHROPIC_API_KEY && !dryRun) {
    console.error('ANTHROPIC_API_KEY is required. Set it in .env or environment.');
    process.exit(1);
  }

  const vendors = loadVendors(profile, vendor);
  const totalDocs = vendors.reduce((sum, v) => sum + v.documents.length, 0);

  console.log(`\n[scan] Starting scan: ${vendors.length} vendors, ${totalDocs} documents${dryRun ? ' (DRY RUN)' : ''}${profile ? ` (profile: ${profile})` : ''}\n`);

  let scanned = 0;
  let changes = 0;
  let alerts = 0;
  let failures = 0;

  for (const v of vendors) {
    for (const doc of v.documents) {
      const displayName = `${v.name} - ${doc.label || doc.type}`;
      scanned++;

      try {
        // --- Fetch ---
        const fetchResult = await fetchVendorDoc(doc.url);

        if (!fetchResult.ok) {
          console.log(`  ✗ ${displayName}: fetch failed (${fetchResult.reason})`);
          logScan({ timestamp: new Date().toISOString(), vendorSlug: v.slug, vendorName: v.name, docType: doc.type, docUrl: doc.url, status: 'fetch_failed', details: { reason: fetchResult.reason, httpStatus: fetchResult.httpStatus } });
          failures++;
          continue;
        }

        // --- Clean ---
        const cleanResult = cleanContent(fetchResult.content);

        if (!cleanResult.ok) {
          console.log(`  ✗ ${displayName}: ${cleanResult.errorMessage}`);
          logScan({ timestamp: new Date().toISOString(), vendorSlug: v.slug, vendorName: v.name, docType: doc.type, docUrl: doc.url, status: 'fetch_failed', details: { reason: cleanResult.reason, contentLength: cleanResult.contentLength } });
          failures++;
          continue;
        }

        const content = cleanResult.content;
        const contentHash = hashContent(content);

        // --- Get existing snapshot ---
        const snapshot = getSnapshot(v.slug, doc.type);

        // Safeguard 4a: First scan — save baseline only
        if (!snapshot) {
          saveSnapshot(v.slug, doc.type, contentHash, content);
          console.log(`  ◆ ${displayName}: initial baseline saved (${cleanResult.contentLength} chars)`);
          logScan({ timestamp: new Date().toISOString(), vendorSlug: v.slug, vendorName: v.name, docType: doc.type, docUrl: doc.url, status: 'initial_snapshot' });
          continue;
        }

        // No change
        if (!hasChanged(snapshot.hash, contentHash)) {
          console.log(`  ✓ ${displayName}: no change`);
          logScan({ timestamp: new Date().toISOString(), vendorSlug: v.slug, vendorName: v.name, docType: doc.type, docUrl: doc.url, status: 'no_change' });
          continue;
        }

        if (dryRun) {
          console.log(`  △ ${displayName}: CHANGE DETECTED (dry run — skipping analysis)`);
          changes++;
          continue;
        }

        // Safeguard 4b: Recovery baseline after previous failure
        if (checkPreviousFailure(v.slug, doc.type)) {
          saveSnapshot(v.slug, doc.type, contentHash, content);
          console.log(`  ◆ ${displayName}: recovery baseline saved (previous scan failed)`);
          logScan({ timestamp: new Date().toISOString(), vendorSlug: v.slug, vendorName: v.name, docType: doc.type, docUrl: doc.url, status: 'recovery_baseline' });
          continue;
        }

        // Safeguard 4c: Stale baseline (>30 days)
        const daysSince = (Date.now() - new Date(snapshot.scannedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince > 30) {
          saveSnapshot(v.slug, doc.type, contentHash, content);
          console.log(`  ◆ ${displayName}: stale baseline reset (${Math.round(daysSince)} days old)`);
          logScan({ timestamp: new Date().toISOString(), vendorSlug: v.slug, vendorName: v.name, docType: doc.type, docUrl: doc.url, status: 'stale_baseline_reset', details: { daysSince: Math.round(daysSince) } });
          continue;
        }

        // Save new snapshot
        saveSnapshot(v.slug, doc.type, contentHash, content);

        // Full replacement detection (>80% changed AND >100 sentences)
        if (isFullReplacement(snapshot.content, content)) {
          console.log(`  ◆ ${displayName}: full replacement detected — saving as baseline`);
          logScan({ timestamp: new Date().toISOString(), vendorSlug: v.slug, vendorName: v.name, docType: doc.type, docUrl: doc.url, status: 'full_replacement_baseline' });
          continue;
        }

        // 90% removal gate
        const removalRatio = getRemovalRatio(snapshot.content, content);
        if (removalRatio > 0.9) {
          console.log(`  ⚠ ${displayName}: ${Math.round(removalRatio * 100)}% content removed — held for review`);
          addToReviewQueue({
            vendorSlug: v.slug, vendorName: v.name, docType: doc.type,
            removalRatio, detectedAt: new Date().toISOString(),
            snapshotFile: `${v.slug}-${doc.type}.json`,
          });
          logScan({ timestamp: new Date().toISOString(), vendorSlug: v.slug, vendorName: v.name, docType: doc.type, docUrl: doc.url, status: 'pending_review', details: { removalRatio: Math.round(removalRatio * 100) } });
          continue;
        }

        // --- Diff & Analyze ---
        const diff = diffSentences(snapshot.content, content);
        const analysis = await analyzeChange(v.name, doc.label || doc.type, diff.added, diff.removed);

        const isNoise = analysis.isNoise;
        const effectiveRiskLevel = isNoise ? 'low' : analysis.riskLevel;

        changes++;

        // Save change record
        saveChange({
          vendorSlug: v.slug, vendorName: v.name, docType: doc.type,
          summary: analysis.summary, impact: analysis.impact, action: analysis.action,
          riskLevel: effectiveRiskLevel, riskBucket: analysis.riskBucket,
          categories: analysis.categories, isNoise, analysisFailed: analysis.analysisFailed,
          detectedAt: new Date().toISOString(),
          diffExcerpt: { added: diff.added.slice(0, 10), removed: diff.removed.slice(0, 10) },
        });

        const icon = isNoise ? '~' : (effectiveRiskLevel === 'critical' ? '🚨' : effectiveRiskLevel === 'high' ? '⚠' : '△');
        console.log(`  ${icon} ${displayName}: ${effectiveRiskLevel}${isNoise ? ' (noise)' : ''} — ${analysis.summary.slice(0, 100)}`);

        logScan({ timestamp: new Date().toISOString(), vendorSlug: v.slug, vendorName: v.name, docType: doc.type, docUrl: doc.url, status: isNoise ? 'noise' : 'changed', details: { riskLevel: effectiveRiskLevel } });

        // Dispatch alerts for medium/high/critical non-noise
        if (effectiveRiskLevel !== 'low' && !isNoise) {
          await dispatchAlert({
            vendorSlug: v.slug, vendorName: v.name, docType: doc.label || doc.type,
            summary: analysis.summary, impact: analysis.impact, action: analysis.action,
            riskLevel: effectiveRiskLevel, categories: analysis.categories,
            detectedAt: new Date(),
          });
          alerts++;
        }
      } catch (err) {
        console.error(`  ✗ ${displayName}: ${err instanceof Error ? err.message : err}`);
        logScan({ timestamp: new Date().toISOString(), vendorSlug: v.slug, vendorName: v.name, docType: doc.type, docUrl: doc.url, status: 'error', details: { error: err instanceof Error ? err.message : String(err) } });
        failures++;
      }
    }
  }

  console.log(`\n[scan] Complete: ${scanned} documents scanned, ${changes} changes detected, ${alerts} alerts dispatched, ${failures} failures\n`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
