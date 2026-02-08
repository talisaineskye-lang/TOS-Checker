import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { DOCUMENT_TYPE_LABELS, DocumentType } from '@/lib/types';
import { RiskPriority } from '@/lib/risk-buckets';
import { DashboardAlerts, DashChange } from './components/DashboardAlerts';

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

interface ChangeRow {
  id: string;
  vendor_id: string;
  document_id: string;
  summary: string | null;
  risk_level: 'low' | 'medium' | 'high' | null;
  risk_priority: RiskPriority | null;
  risk_bucket: string | null;
  categories: string[] | null;
  detected_at: string;
  notified: boolean;
  vendors: { name: string } | null;
  documents: { doc_type: DocumentType; url: string } | null;
}

const DOC_TYPE_SHORT: Record<string, string> = {
  tos: 'TOS',
  privacy: 'PRIV',
  aup: 'AUP',
  pricing: 'PRICE',
  api_terms: 'API',
  changelog: 'CHGLOG',
};

const DOC_TYPE_CLASS: Record<string, string> = {
  tos: 't-tos',
  privacy: 't-priv',
  aup: 't-aup',
  pricing: 't-price',
  api_terms: 't-api',
  changelog: 't-api',
};

function mapSeverity(riskPriority: string | null): 'critical' | 'warning' | 'notice' | 'low' {
  switch (riskPriority) {
    case 'critical': return 'critical';
    case 'high': return 'warning';
    case 'medium': return 'notice';
    default: return 'low';
  }
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
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, name, slug, logo_url, is_active')
    .order('created_at', { ascending: false });

  const { data: documents } = await supabase
    .from('documents')
    .select('id, vendor_id, doc_type, url, last_checked_at, last_changed_at, is_active')
    .order('created_at', { ascending: false });

  const { data: changes } = await supabase
    .from('changes')
    .select('id, vendor_id, document_id, summary, risk_level, risk_priority, risk_bucket, categories, detected_at, notified, vendors(name), documents(doc_type, url)')
    .order('detected_at', { ascending: false })
    .limit(20);

  return {
    vendors: (vendors ?? []) as Vendor[],
    documents: (documents ?? []) as Document[],
    changes: (changes ?? []) as unknown as ChangeRow[],
  };
}

export default async function Page() {
  const isOnboarded = await checkOnboardingStatus();
  if (!isOnboarded) {
    redirect('/onboarding');
  }

  const { vendors, documents, changes } = await getData();
  const documentMap = new Map(documents.map((d) => [d.id, d]));

  // Group documents by vendor
  const docsByVendor = new Map<string, Document[]>();
  documents.forEach((doc) => {
    const existing = docsByVendor.get(doc.vendor_id) || [];
    existing.push(doc);
    docsByVendor.set(doc.vendor_id, existing);
  });

  // Group changes by vendor
  const changesByVendor = new Map<string, ChangeRow[]>();
  changes.forEach((c) => {
    const existing = changesByVendor.get(c.vendor_id) || [];
    existing.push(c);
    changesByVendor.set(c.vendor_id, existing);
  });

  // Stats
  const activeDocCount = documents.filter((d) => d.is_active).length;
  const vendorsWithChanges = new Set(changes.map((c) => c.vendor_id));
  const stableCount = vendors.filter((v) => !vendorsWithChanges.has(v.id)).length;

  // Map changes for client component
  const dashChanges: DashChange[] = changes.map((c) => {
    const vendorName = c.vendors?.name || 'Unknown';
    const docType = c.documents?.doc_type || 'tos';
    const severity = mapSeverity(c.risk_priority);
    const bucketLabel = c.risk_bucket
      ? c.risk_bucket.charAt(0).toUpperCase() + c.risk_bucket.slice(1)
      : 'Policy';

    return {
      id: c.id,
      vendorName,
      docType,
      severity,
      title: `${vendorName} ${DOCUMENT_TYPE_LABELS[docType] || docType} updated — ${bucketLabel} change detected`,
      summary: c.summary || 'No summary available.',
      categories: c.categories || [],
      detectedAt: c.detected_at,
      documentUrl: c.documents?.url || '#',
    };
  });

  // Build vendor table rows
  interface VendorRow {
    id: string;
    name: string;
    initial: string;
    detail: string;
    docTypes: { short: string; cssClass: string }[];
    statusClass: string;
    statusLabel: string;
    lastChecked: string;
  }

  const vendorRows: VendorRow[] = vendors.map((vendor) => {
    const vendorChanges = changesByVendor.get(vendor.id) || [];
    const vendorDocs = docsByVendor.get(vendor.id) || [];

    let statusClass = 'stable';
    let statusLabel = 'Stable';

    if (vendorChanges.some((c) => c.risk_priority === 'critical')) {
      statusClass = 'changed';
      statusLabel = 'Changed';
    } else if (vendorChanges.some((c) => c.risk_priority === 'high' || c.risk_priority === 'medium')) {
      statusClass = 'warning';
      statusLabel = 'Warning';
    }

    const changedDocTypes = new Set(
      vendorChanges
        .map((c) => {
          const doc = documentMap.get(c.document_id);
          return doc ? DOCUMENT_TYPE_LABELS[doc.doc_type] : null;
        })
        .filter(Boolean)
    );

    const detail =
      vendorChanges.length > 0
        ? `${changedDocTypes.size} document${changedDocTypes.size !== 1 ? 's' : ''} changed · ${Array.from(changedDocTypes).join(', ')}`
        : 'No changes detected';

    const lastChecked = vendorDocs
      .map((d) => d.last_checked_at)
      .filter(Boolean)
      .sort()
      .pop();

    return {
      id: vendor.id,
      name: vendor.name,
      initial: vendor.name.charAt(0).toUpperCase(),
      detail,
      docTypes: vendorDocs.map((d) => ({
        short: DOC_TYPE_SHORT[d.doc_type] || d.doc_type.toUpperCase(),
        cssClass: DOC_TYPE_CLASS[d.doc_type] || '',
      })),
      statusClass,
      statusLabel,
      lastChecked: formatDate(lastChecked ?? null),
    };
  });

  // Sort: changed first, then warning, then stable
  const statusOrder: Record<string, number> = { changed: 0, warning: 1, stable: 2 };
  vendorRows.sort((a, b) => (statusOrder[a.statusClass] ?? 2) - (statusOrder[b.statusClass] ?? 2));

  return (
    <main className="dashboard-page">
      <nav className="dash-nav">
        <div className="inner">
          <div className="nav-left">
            <a className="nav-logo" href="/">
              <span className="nav-dot" />
              StackDrift
            </a>
            <a href="/" className="nav-link active">Dashboard</a>
            <a href="/intel" className="nav-link">Intel</a>
            <a href="/admin" className="nav-link">Admin</a>
          </div>
          <div className="nav-right">
            <a href="/onboarding" className="pill pill-ghost pill-sm">+ Add vendor</a>
          </div>
        </div>
      </nav>

      <div className="wrap">
        <header className="dash-header">
          <div className="tag tag-green">Dashboard</div>
          <h1>
            Monitoring {activeDocCount} document{activeDocCount !== 1 ? 's' : ''}
            <br />
            <span className="dim">across {vendors.length} vendor{vendors.length !== 1 ? 's' : ''}.</span>
          </h1>
        </header>

        <div className="stat-row">
          <div className="stat-card">
            <div className="sc-value">{vendors.length}</div>
            <div className="sc-label">Vendors</div>
          </div>
          <div className="stat-card">
            <div className="sc-value">{activeDocCount}</div>
            <div className="sc-label">Documents</div>
          </div>
          <div className="stat-card">
            <div className={`sc-value${changes.length > 0 ? ' red' : ''}`}>{changes.length}</div>
            <div className="sc-label">Changes detected</div>
          </div>
          <div className="stat-card">
            <div className="sc-value green">{stableCount}</div>
            <div className="sc-label">Stable</div>
          </div>
        </div>

        <DashboardAlerts changes={dashChanges} />

        <div className="vendor-section">
          <div className="section-head">
            <h2>Tracked vendors</h2>
            <div className="sh-meta">
              <span className="section-action">
                {vendors.length} vendor{vendors.length !== 1 ? 's' : ''} · sorted by status
              </span>
            </div>
          </div>

          {vendors.length === 0 ? (
            <p className="dash-empty">No vendors yet. Complete onboarding to get started.</p>
          ) : (
            <div className="vendor-table">
              {vendorRows.map((v) => (
                <div key={v.id} className="vt-row">
                  <div className={`vt-icon ${v.statusClass !== 'stable' ? v.statusClass : ''}`}>
                    {v.initial}
                  </div>
                  <div className="vt-info">
                    <div className="vt-name">{v.name}</div>
                    <div className="vt-detail">{v.detail}</div>
                  </div>
                  <div className="vt-tags">
                    {v.docTypes.map((dt, i) => (
                      <span key={i} className={`vt-tag ${dt.cssClass}`}>{dt.short}</span>
                    ))}
                  </div>
                  <span className={`vt-status ${v.statusClass}`}>{v.statusLabel}</span>
                  <span className="vt-time">{v.lastChecked}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="dash-footer">
          <span>&copy; 2026 StackDrift</span>
          <div className="f-links">
            <a href="/intel">Intel</a>
            <a href="/onboarding">Onboarding</a>
            <a href="/admin">Admin</a>
          </div>
        </footer>
      </div>
    </main>
  );
}
