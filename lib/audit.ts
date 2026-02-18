import { supabase } from './supabase';

export type AuditAction =
  | 'login'
  | 'logout'
  | 'vendor.add'
  | 'vendor.remove'
  | 'webhook.create'
  | 'webhook.delete'
  | 'webhook.test'
  | 'apikey.create'
  | 'apikey.revoke'
  | 'slack.connect'
  | 'slack.disconnect'
  | 'slack.test'
  | 'export.pdf'
  | 'settings.update'
  | 'team.invite'
  | 'team.remove'
  | 'account.delete';

export interface AuditEntry {
  id: string;
  user_id: string;
  action: AuditAction;
  detail: string | null;
  ip_address: string | null;
  created_at: string;
}

export async function logAuditEvent(
  userId: string,
  action: AuditAction,
  detail?: string,
  ipAddress?: string
) {
  await supabase.from('audit_log').insert({
    user_id: userId,
    action,
    detail: detail || null,
    ip_address: ipAddress || null,
  });
}
