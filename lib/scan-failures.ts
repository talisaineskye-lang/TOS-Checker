import { supabase } from './supabase';
import { FetchFailure } from './fetcher';

/**
 * Log a scan failure to the scan_failures table for debugging and baseline tracking.
 */
export async function logScanFailure(params: {
  documentId: string;
  vendorId: string;
  url: string;
  failure: FetchFailure;
}): Promise<void> {
  const { error } = await supabase.from('scan_failures').insert({
    document_id: params.documentId,
    vendor_id: params.vendorId,
    url: params.url,
    failure_type: params.failure.reason,
    http_status: params.failure.httpStatus,
    content_length: params.failure.contentLength,
    error_message: params.failure.errorMessage,
  });

  if (error) {
    console.error('[scan-failures] Failed to log scan failure:', error.message);
  }
}

/**
 * Check if the previous scan for a document was a failure.
 * Returns true if there is a scan_failure record more recent than lastSnapshotAt.
 * Used for the "require valid baseline" safeguard — don't alert if previous scan failed.
 */
export async function wasPreviousScanFailure(
  documentId: string,
  lastSnapshotAt: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('scan_failures')
    .select('id')
    .eq('document_id', documentId)
    .gt('attempted_at', lastSnapshotAt)
    .limit(1);

  if (error) {
    console.error('[scan-failures] Query error:', error.message);
    return false; // fail open — assume previous was OK
  }

  return (data?.length ?? 0) > 0;
}

/**
 * Delete scan_failures records older than 30 days to prevent unbounded growth.
 */
export async function cleanupOldScanFailures(): Promise<void> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from('scan_failures')
    .delete()
    .lt('attempted_at', cutoff);

  if (error) {
    console.error('[scan-failures] Cleanup failed:', error.message);
  }
}
