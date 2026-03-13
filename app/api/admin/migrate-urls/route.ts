import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/api-auth';

export const runtime = 'nodejs';

/**
 * One-time URL migration for existing users' documents table.
 *
 * The vendor-catalog.ts was updated with correct URLs, but existing users
 * still have the old (broken) URLs baked into their documents rows.
 * This endpoint updates those rows and resets scan state so the next
 * cron cycle fetches from the correct URLs.
 *
 * Safe to run multiple times — idempotent (no-ops if old URLs are gone).
 */

const URL_MIGRATIONS: Array<{ oldUrl: string; newUrl: string }> = [
  // Framer — pages moved to new paths
  {
    oldUrl: 'https://www.framer.com/legal/terms/',
    newUrl: 'https://www.framer.com/legal/terms-of-service/',
  },
  {
    oldUrl: 'https://www.framer.com/legal/privacy/',
    newUrl: 'https://www.framer.com/legal/privacy-statement/',
  },
  // Framer AUP was duplicated as TOS URL — now has its own page
  {
    oldUrl: 'https://www.framer.com/legal/terms/',
    newUrl: 'https://www.framer.com/legal/acceptable-use-policy/',
  },
  // FlutterFlow — shortened paths
  {
    oldUrl: 'https://flutterflow.io/terms-of-service',
    newUrl: 'https://flutterflow.io/tos',
  },
  {
    oldUrl: 'https://flutterflow.io/privacy-policy',
    newUrl: 'https://flutterflow.io/privacy',
  },
  // Cursor — TOS path changed
  {
    oldUrl: 'https://www.cursor.com/terms',
    newUrl: 'https://www.cursor.com/terms-of-service',
  },
  // Replit AUP — moved to different section
  {
    oldUrl: 'https://docs.replit.com/legal-and-security-info/trust-safety/community-standards',
    newUrl: 'https://docs.replit.com/legal-and-security-info/usage',
  },
  // Wise Privacy — hub page → actual policy document
  {
    oldUrl: 'https://wise.com/us/legal/privacy-policy',
    newUrl: 'https://wise.com/gb/legal/privacy-notice-personal-en',
  },
];

export async function POST() {
  const admin = await requireAdmin();
  if (!admin.authorized) return admin.response;

  const results: Array<{
    oldUrl: string;
    newUrl: string;
    updatedCount: number;
    failuresCleared: number;
  }> = [];

  for (const { oldUrl, newUrl } of URL_MIGRATIONS) {
    // Find documents with the old URL
    const { data: matchingDocs } = await supabase
      .from('documents')
      .select('id')
      .eq('url', oldUrl);

    if (!matchingDocs || matchingDocs.length === 0) {
      results.push({ oldUrl, newUrl, updatedCount: 0, failuresCleared: 0 });
      continue;
    }

    const docIds = matchingDocs.map((d) => d.id);

    // Update URL and reset last_checked_at to force re-scan
    const { error: updateError } = await supabase
      .from('documents')
      .update({ url: newUrl, last_checked_at: null })
      .eq('url', oldUrl);

    if (updateError) {
      console.error(`[migrate-urls] Failed to update ${oldUrl}:`, updateError);
      results.push({ oldUrl, newUrl, updatedCount: 0, failuresCleared: 0 });
      continue;
    }

    // Delete stale scan_failures for migrated documents
    const { count: failuresCleared } = await supabase
      .from('scan_failures')
      .delete({ count: 'exact' })
      .in('document_id', docIds);

    results.push({
      oldUrl,
      newUrl,
      updatedCount: docIds.length,
      failuresCleared: failuresCleared ?? 0,
    });
  }

  const totalUpdated = results.reduce((sum, r) => sum + r.updatedCount, 0);
  const totalFailuresCleared = results.reduce((sum, r) => sum + r.failuresCleared, 0);

  console.log(`[migrate-urls] Migration complete: ${totalUpdated} documents updated, ${totalFailuresCleared} scan failures cleared`);

  return NextResponse.json({
    success: true,
    totalDocumentsUpdated: totalUpdated,
    totalFailuresCleared,
    migrations: results,
  });
}
