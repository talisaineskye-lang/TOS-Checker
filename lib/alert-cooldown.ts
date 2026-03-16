import { supabase } from './supabase';

const COOLDOWN_HOURS = 24;

/**
 * Check if a document is in alert cooldown.
 * Returns true if a notification was already sent for this document
 * within the last COOLDOWN_HOURS hours.
 *
 * Fails open — if the DB query errors, returns false so the alert is sent.
 * We'd rather over-notify than silently miss a real change.
 */
export async function isInAlertCooldown(documentId: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('changes')
    .select('id, detected_at')
    .eq('document_id', documentId)
    .eq('notified', true)
    .gt('detected_at', cutoff)
    .limit(1);

  if (error) {
    console.warn(`[alert-cooldown] Query error for document ${documentId} — failing open:`, error.message);
    return false;
  }

  if (data && data.length > 0) {
    console.log(`[alert-cooldown] Document ${documentId} in cooldown — last alert was ${data[0].detected_at}`);
    return true;
  }

  return false;
}
