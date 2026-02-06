import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { DOCUMENT_TYPE_LABELS, DocumentType } from '@/lib/types';
import { RiskBucket, RiskPriority } from '@/lib/risk-buckets';
import { AlertCard } from './components/AlertCard';

export const dynamic = 'force-dynamic';

interface Vendor {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  is_active: boolean;
}

interface Document {
  id: string;
  vendor_id: string;
  doc_type: DocumentType;
  url: string;
  last_checked_at: string | null;
  last_changed_at: string | null;
  is_active: boolean;
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
}

function formatDate(value: string | null) {
  if (!value) return 'Never';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function checkOnboardingStatus(): Promise<boolean> {
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'onboarding_completed')
    .single();

  return data?.value === 'true';
}

async function getData() {
  const { data: vendors, error: vendorError } = await supabase
    .from('vendors')
    .select('id, name, slug, logo_url, is_active')
    .order('created_at', { ascending: false });

  const { data: documents, error: docError } = await supabase
    .from('documents')
    .select('id, vendor_id, doc_type, url, last_checked_at, last_changed_at, is_active')
    .order('created_at', { ascending: false });

  const { data: changes, error: changeError } = await supabase
    .from('changes')
    .select('id, vendor_id, document_id, summary, risk_level, risk_bucket, risk_priority, categories, detected_at, notified')
    .order('detected_at', { ascending: false })
    .limit(10);

  return {
    vendors: (vendors ?? []) as Vendor[],
    documents: (documents ?? []) as Document[],
    changes: (changes ?? []) as Change[],
    vendorError,
    docError,
    changeError,
  };
}

export default async function Page() {
  const isOnboarded = await checkOnboardingStatus();

  if (!isOnboarded) {
    redirect('/onboarding');
  }

  const { vendors, documents, changes, vendorError, docError, changeError } = await getData();

  const vendorMap = new Map(vendors.map((v) => [v.id, v]));
  const documentMap = new Map(documents.map((d) => [d.id, d]));

  // Group documents by vendor
  const docsByVendor = new Map<string, Document[]>();
  documents.forEach((doc) => {
    const existing = docsByVendor.get(doc.vendor_id) || [];
    existing.push(doc);
    docsByVendor.set(doc.vendor_id, existing);
  });

  // Count active documents
  const activeDocCount = documents.filter((d) => d.is_active).length;

  return (
    <main>
      <div className="dashboard-header">
        <div>
          <h1>TOS Change Monitor</h1>
          <p>
            Monitoring {activeDocCount} document{activeDocCount !== 1 ? 's' : ''} across{' '}
            {vendors.length} vendor{vendors.length !== 1 ? 's' : ''}.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <a href="/onboarding" className="btn-secondary">Onboarding</a>
          <a href="/admin" className="btn-secondary">Admin</a>
        </div>
      </div>

      <section>
        <h2>Tracked Vendors</h2>
        {vendorError || docError ? (
          <p className="empty">Failed to load vendors.</p>
        ) : vendors.length === 0 ? (
          <p className="empty">No vendors yet. Complete onboarding to get started.</p>
        ) : (
          <div className="vendor-list">
            {vendors.map((vendor) => {
              const vendorDocs = docsByVendor.get(vendor.id) || [];
              const lastChecked = vendorDocs
                .map((d) => d.last_checked_at)
                .filter(Boolean)
                .sort()
                .pop();

              return (
                <div key={vendor.id} className="vendor-row">
                  <div className="vendor-row-header">
                    {vendor.logo_url && (
                      <img
                        src={vendor.logo_url}
                        alt=""
                        className="vendor-row-logo"
                      />
                    )}
                    <span className="vendor-row-name">{vendor.name}</span>
                    <span className="vendor-row-status">
                      {vendor.is_active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <div className="vendor-row-docs">
                    {vendorDocs.map((doc) => (
                      <span key={doc.id} className="doc-badge">
                        {DOCUMENT_TYPE_LABELS[doc.doc_type] || doc.doc_type}
                      </span>
                    ))}
                  </div>
                  <div className="vendor-row-checked">
                    Last checked: {formatDate(lastChecked ?? null)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2>Recent Alerts</h2>
        {changeError ? (
          <p className="empty">Failed to load changes.</p>
        ) : changes.length === 0 ? (
          <p className="empty">No changes detected yet.</p>
        ) : (
          <div className="alerts-list">
            {changes.map((change) => {
              const vendor = vendorMap.get(change.vendor_id);
              const doc = documentMap.get(change.document_id);
              const docTypeLabel = doc
                ? DOCUMENT_TYPE_LABELS[doc.doc_type] || doc.doc_type
                : 'Unknown';
              const vendorName = vendor?.name || 'Unknown';
              const title = change.risk_bucket
                ? `${vendorName} – ${change.risk_bucket.charAt(0).toUpperCase() + change.risk_bucket.slice(1)} change detected`
                : `${vendorName} – Policy updated`;

              return (
                <AlertCard
                  key={change.id}
                  title={title}
                  summary={change.summary || 'No summary available.'}
                  riskBucket={change.risk_bucket}
                  riskPriority={change.risk_priority || 'low'}
                  riskLevel={change.risk_level || 'low'}
                  documentType={docTypeLabel}
                  documentUrl={doc?.url || '#'}
                  detectedAt={change.detected_at}
                  notified={change.notified}
                  categories={change.categories || undefined}
                />
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
