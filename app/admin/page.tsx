import { supabase } from '@/lib/supabase';
import { DOCUMENT_TYPE_LABELS, DocumentType } from '@/lib/types';
import { RiskBucket, RiskPriority, RISK_BUCKETS } from '@/lib/risk-buckets';
import { AdminActions } from './AdminActions';
import { SettingsForm } from './SettingsForm';
import { AlertCard } from '../components/AlertCard';
import { Logo } from '../components/Logo';

export const dynamic = 'force-dynamic';

interface Document {
  id: string;
  vendor_id: string;
  doc_type: DocumentType;
  url: string;
  is_active: boolean;
  last_checked_at: string | null;
  last_changed_at: string | null;
  vendors: {
    name: string;
    logo_url: string | null;
  };
}

interface Change {
  id: string;
  vendor_id: string;
  document_id: string;
  summary: string | null;
  risk_level: 'low' | 'medium' | 'high' | null;
  risk_bucket: RiskBucket | null;
  risk_priority: RiskPriority | null;
  categories: string[] | null;
  detected_at: string;
  notified: boolean;
  vendors: {
    name: string;
  };
  documents: {
    doc_type: DocumentType;
    url: string;
  };
}

function formatRelative(value: string | null) {
  if (!value) return 'Never';
  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

async function getData() {
  const { data: documents } = await supabase
    .from('documents')
    .select('*, vendors(name, logo_url)')
    .order('last_checked_at', { ascending: false, nullsFirst: false });

  const { data: changes } = await supabase
    .from('changes')
    .select('*, vendors(name), documents(doc_type, url)')
    .order('detected_at', { ascending: false })
    .limit(50);

  const { data: settings } = await supabase
    .from('app_settings')
    .select('*');

  // Get alert email from env (for display)
  const alertEmail = process.env.ALERT_EMAIL || '';

  return {
    documents: (documents ?? []) as Document[],
    changes: (changes ?? []) as Change[],
    settings: settings ?? [],
    alertEmail,
  };
}

export default async function AdminPage() {
  const { documents, changes, alertEmail } = await getData();

  // Stats
  const totalDocs = documents.length;
  const activeDocs = documents.filter((d) => d.is_active).length;
  const checkedToday = documents.filter((d) => {
    if (!d.last_checked_at) return false;
    const checked = new Date(d.last_checked_at);
    const today = new Date();
    return checked.toDateString() === today.toDateString();
  }).length;

  // Count by priority
  const criticalCount = changes.filter((c) => c.risk_priority === 'critical').length;
  const highCount = changes.filter((c) => c.risk_priority === 'high').length;

  return (
    <main className="admin-page">
      <nav className="wd-nav">
        <div className="nav-inner">
          <a href="/" className="nav-logo">
            <Logo size="sm" />
          </a>
          <span className="nav-breadcrumb">/ admin</span>
          <div className="wd-nav-right">
            <a href="/" className="wd-nav-link">Dashboard</a>
            <a href="/intel" className="wd-nav-link">Intel</a>
            <a href="/onboarding" className="wd-nav-link">Onboarding</a>
          </div>
        </div>
      </nav>

      <div className="wrap">
        <div className="admin-header">
          <div className="tag tag-green">Admin</div>
          <h1>System Overview</h1>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-value">{totalDocs}</span>
            <span className="stat-label">Documents</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{activeDocs}</span>
            <span className="stat-label">Active</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{checkedToday}</span>
            <span className="stat-label">Checked Today</span>
          </div>
          <div className="stat-card">
            <span className="stat-value" style={{ color: criticalCount > 0 ? 'var(--wd-red)' : undefined }}>
              {criticalCount + highCount}
            </span>
            <span className="stat-label">High Priority</span>
          </div>
        </div>

        {/* Manual Actions */}
        <section className="admin-section">
          <h2>Actions</h2>
          <AdminActions />
        </section>

        {/* Monitoring Status */}
        <section className="admin-section">
          <h2>Monitoring Status</h2>
          {documents.length === 0 ? (
            <p className="db-empty">No documents being monitored.</p>
          ) : (
            <div className="status-table">
              <div className="status-header">
                <span>Document</span>
                <span>URL</span>
                <span>Status</span>
                <span>Last Checked</span>
                <span>Last Changed</span>
              </div>
              {documents.map((doc) => (
                <div key={doc.id} className="status-row">
                  <span className="doc-name">
                    {doc.vendors?.name} - {DOCUMENT_TYPE_LABELS[doc.doc_type]}
                  </span>
                  <span className="doc-url" title={doc.url}>
                    {new URL(doc.url).hostname}
                  </span>
                  <span>
                    <span className={`status-badge ${doc.is_active ? 'active' : 'paused'}`}>
                      {doc.is_active ? 'Active' : 'Paused'}
                    </span>
                  </span>
                  <span className="check-time">{formatRelative(doc.last_checked_at)}</span>
                  <span className="check-time">{formatRelative(doc.last_changed_at)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Change History with AlertCards */}
        <section className="admin-section">
          <h2>Change History</h2>
          {changes.length === 0 ? (
            <p className="db-empty">No changes detected yet.</p>
          ) : (
            <div className="alerts-list">
              {changes.map((change) => {
                const vendorName = change.vendors?.name || 'Unknown';
                const docTypeLabel = change.documents?.doc_type
                  ? DOCUMENT_TYPE_LABELS[change.documents.doc_type]
                  : 'Unknown';
                const isFallback = change.summary === 'Policy change detected. Review the document for details.' || !change.summary;

                let title: string;
                if (isFallback && change.risk_bucket) {
                  title = `${vendorName} – ${RISK_BUCKETS[change.risk_bucket].name} change detected`;
                } else if (change.risk_priority === 'critical') {
                  title = `${vendorName} – Critical ${docTypeLabel} change`;
                } else if (change.risk_priority === 'high') {
                  title = `${vendorName} – Important ${docTypeLabel} change`;
                } else {
                  title = `${vendorName} – ${docTypeLabel} updated`;
                }

                return (
                  <AlertCard
                    key={change.id}
                    title={title}
                    summary={change.summary || 'No summary available.'}
                    riskBucket={change.risk_bucket}
                    riskPriority={change.risk_priority || 'low'}
                    riskLevel={change.risk_level || 'low'}
                    documentType={docTypeLabel}
                    documentUrl={change.documents?.url || '#'}
                    detectedAt={change.detected_at}
                    notified={change.notified}
                    categories={change.categories || undefined}
                    changeId={change.id}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* Settings */}
        <section className="admin-section">
          <h2>Settings</h2>
          <SettingsForm alertEmail={alertEmail} />
        </section>
      </div>

      <footer className="wd-footer">
        <span>&copy; 2026 StackDrift</span>
        <div className="wd-footer-links">
          <a href="/">Dashboard</a>
          <a href="/intel">Intel</a>
          <a href="/onboarding">Onboarding</a>
        </div>
      </footer>
    </main>
  );
}
