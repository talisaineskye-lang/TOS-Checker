'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useAuth } from '../../components/AuthProvider';
import { DashboardNav } from '../../components/DashboardNav';
import { DOCUMENT_TYPE_LABELS } from '@/lib/types';
import { hasAccess } from '@/lib/plan-gates';

interface HistoryChange {
  id: string;
  vendor_id: string;
  document_id: string;
  summary: string | null;
  impact: string | null;
  action: string | null;
  risk_level: string | null;
  risk_priority: string | null;
  risk_bucket: string | null;
  categories: string[] | null;
  detected_at: string;
  notified: boolean;
  vendors: { name: string; logo_url: string | null } | null;
  documents: { doc_type: string; url: string } | null;
}

interface Vendor {
  id: string;
  name: string;
}

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'Critical',
  high: 'Warning',
  medium: 'Notice',
  low: 'Low',
};

const SEVERITY_OPTIONS = [
  { value: '', label: 'All severities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'Warning' },
  { value: 'medium', label: 'Notice' },
  { value: 'low', label: 'Low' },
];

const DOC_TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'tos', label: 'Terms of Service' },
  { value: 'privacy', label: 'Privacy Policy' },
  { value: 'aup', label: 'Acceptable Use' },
  { value: 'pricing', label: 'Pricing' },
  { value: 'api_terms', label: 'API Terms' },
  { value: 'changelog', label: 'Changelog' },
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function mapSeverityClass(riskPriority: string | null): string {
  switch (riskPriority) {
    case 'critical': return 'critical';
    case 'high': return 'warning';
    case 'medium': return 'notice';
    default: return 'low';
  }
}

// Fake teaser data for gated view
const TEASER_CHANGES = [
  { vendor: 'Stripe', type: 'Terms of Service', severity: 'critical', summary: 'Liability caps reduced from $500 to $200 for disputes filed after March 1st...' },
  { vendor: 'OpenAI', type: 'Privacy Policy', severity: 'warning', summary: 'New clause allows usage data to be shared with third-party partners...' },
  { vendor: 'Vercel', type: 'Terms of Service', severity: 'notice', summary: 'Updated deployment limits for hobby plan users effective immediately...' },
  { vendor: 'AWS', type: 'API Terms', severity: 'warning', summary: 'Rate limiting thresholds lowered for free tier API access...' },
  { vendor: 'GitHub', type: 'Terms of Service', severity: 'low', summary: 'Minor formatting and language clarification changes across multiple sections...' },
];

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [plan, setPlan] = useState<string>('free');
  const [planLoading, setPlanLoading] = useState(true);
  const [changes, setChanges] = useState<HistoryChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filterVendor, setFilterVendor] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterDocType, setFilterDocType] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Expandable diffs
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [diffData, setDiffData] = useState<Record<string, { added: string[]; removed: string[] }>>({});
  const [diffLoading, setDiffLoading] = useState<string | null>(null);

  // PDF export (Business only)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Fetch user plan
  useEffect(() => {
    if (authLoading || !user) return;
    supabase
      .from('user_profiles')
      .select('plan')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setPlan(data?.plan || 'free');
        setPlanLoading(false);
      });
  }, [user, authLoading, supabase]);

  // Fetch vendor list for filter dropdown
  useEffect(() => {
    if (authLoading || !user) return;
    supabase
      .from('vendors')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => setVendors(data ?? []));
  }, [user, authLoading, supabase]);

  const hasPro = hasAccess(plan, 'pro');
  const hasBusiness = hasAccess(plan, 'business');

  // Fetch changes
  const fetchChanges = useCallback(async () => {
    if (!hasPro) return;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (filterVendor) params.set('vendor', filterVendor);
    if (filterSeverity) params.set('severity', filterSeverity);
    if (filterDocType) params.set('doc_type', filterDocType);
    if (filterSearch) params.set('q', filterSearch);

    try {
      const res = await fetch(`/api/history?${params}`);
      const data = await res.json();
      if (res.ok) {
        setChanges(data.changes);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [hasPro, page, filterVendor, filterSeverity, filterDocType, filterSearch]);

  useEffect(() => {
    fetchChanges();
  }, [fetchChanges]);

  // Fetch diff on expand
  const toggleDiff = async (changeId: string) => {
    if (expandedId === changeId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(changeId);

    if (diffData[changeId]) return;

    setDiffLoading(changeId);
    try {
      const res = await fetch(`/api/history/diff?id=${changeId}`);
      const data = await res.json();
      if (res.ok) {
        setDiffData((prev) => ({ ...prev, [changeId]: data }));
      }
    } catch {
      // silently fail
    } finally {
      setDiffLoading(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setFilterSearch(searchInput);
  };

  const resetFilters = () => {
    setFilterVendor('');
    setFilterSeverity('');
    setFilterDocType('');
    setFilterSearch('');
    setSearchInput('');
    setPage(1);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === changes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(changes.map((c) => c.id)));
    }
  };

  const exportPdf = async (ids: string[]) => {
    if (ids.length === 0) return;
    setExporting(true);
    try {
      const res = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeIds: ids }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = ids.length > 1
        ? `stackdrift-redline-batch.pdf`
        : `stackdrift-redline.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail
    } finally {
      setExporting(false);
    }
  };

  if (authLoading || planLoading) {
    return (
      <main className="dashboard-page">
        <DashboardNav />
        <div className="wrap">
          <div className="hist-loading">Loading...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <DashboardNav />

      <div className="wrap">
        <header className="dash-header">
          <div className="tag tag-blue">History</div>
          <h1>Change History</h1>
        </header>

        {!hasPro ? (
          /* ── Gated teaser for Solo/Free users ── */
          <div className="hist-gate">
            <div className="hist-gate-overlay">
              <div className="hist-gate-content">
                <h2>Unlock full change history</h2>
                <p>See every detected change with full diffs, filters, and search. Upgrade to Pro to access your complete audit trail.</p>
                <a href="/pricing" className="hist-gate-btn">Upgrade to Pro &rarr;</a>
              </div>
            </div>
            <div className="hist-teaser">
              {TEASER_CHANGES.map((item, i) => (
                <div key={i} className={`hist-row hist-row-blurred sev-${item.severity}`}>
                  <div className="hist-row-main">
                    <span className={`hist-sev ${item.severity}`}>{SEVERITY_LABELS[item.severity] || item.severity}</span>
                    <span className="hist-vendor">{item.vendor}</span>
                    <span className="hist-doctype">{item.type}</span>
                    <span className="hist-date">Feb 9, 2026</span>
                  </div>
                  <div className="hist-summary">{item.summary}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ── Full history for Pro+ users ── */
          <>
            {/* Filters */}
            <div className="hist-filters">
              <select
                className="hist-select"
                value={filterVendor}
                onChange={(e) => { setFilterVendor(e.target.value); setPage(1); }}
              >
                <option value="">All vendors</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>

              <select
                className="hist-select"
                value={filterSeverity}
                onChange={(e) => { setFilterSeverity(e.target.value); setPage(1); }}
              >
                {SEVERITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              <select
                className="hist-select"
                value={filterDocType}
                onChange={(e) => { setFilterDocType(e.target.value); setPage(1); }}
              >
                {DOC_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              <form onSubmit={handleSearch} className="hist-search-form">
                <input
                  type="text"
                  className="hist-search"
                  placeholder="Search summaries..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                <button type="submit" className="hist-search-btn">Search</button>
              </form>

              {(filterVendor || filterSeverity || filterDocType || filterSearch) && (
                <button className="hist-reset" onClick={resetFilters}>Clear filters</button>
              )}
            </div>

            <div className="hist-meta">
              {total} change{total !== 1 ? 's' : ''} found
              {totalPages > 1 && ` \u00B7 Page ${page} of ${totalPages}`}
            </div>

            {/* Batch export bar (Business only) */}
            {hasBusiness && changes.length > 0 && (
              <div className="hist-export-bar">
                <label className="hist-select-all">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === changes.length && changes.length > 0}
                    onChange={toggleSelectAll}
                  />
                  Select all
                </label>
                {selectedIds.size > 0 && (
                  <button
                    className="pill pill-blue pill-sm"
                    disabled={exporting}
                    onClick={() => exportPdf(Array.from(selectedIds))}
                  >
                    {exporting ? 'Exporting...' : `Export ${selectedIds.size} as PDF`}
                  </button>
                )}
              </div>
            )}

            {loading ? (
              <div className="hist-loading">Loading changes...</div>
            ) : changes.length === 0 ? (
              <div className="hist-empty">No changes match your filters.</div>
            ) : (
              <div className="hist-list">
                {changes.map((change) => {
                  const sevClass = mapSeverityClass(change.risk_priority);
                  const vendorName = change.vendors?.name || 'Unknown';
                  const docType = change.documents?.doc_type || 'tos';
                  const docTypeLabel = DOCUMENT_TYPE_LABELS[docType as keyof typeof DOCUMENT_TYPE_LABELS] || docType;
                  const isExpanded = expandedId === change.id;
                  const diff = diffData[change.id];
                  const isLoadingDiff = diffLoading === change.id;

                  return (
                    <div key={change.id} className={`hist-row sev-${sevClass}${isExpanded ? ' expanded' : ''}`}>
                      <div className="hist-row-top">
                        {hasBusiness && (
                          <input
                            type="checkbox"
                            className="hist-check"
                            checked={selectedIds.has(change.id)}
                            onChange={() => toggleSelect(change.id)}
                          />
                        )}
                        <button className="hist-row-main" onClick={() => toggleDiff(change.id)}>
                          <span className={`hist-sev ${sevClass}`}>
                            {SEVERITY_LABELS[change.risk_priority || 'low'] || 'Low'}
                          </span>
                          <span className="hist-vendor">{vendorName}</span>
                          <span className="hist-doctype">{docTypeLabel}</span>
                          <span className="hist-date">{formatDate(change.detected_at)}</span>
                          <span className={`hist-expand-icon${isExpanded ? ' open' : ''}`}>&#9662;</span>
                        </button>
                      </div>

                      <div className="hist-summary">{change.summary || 'No summary available.'}</div>

                      {change.impact && (
                        <div className="hist-impact">
                          <span className="hist-label">Why it matters:</span> {change.impact}
                        </div>
                      )}

                      {change.action && (
                        <div className="hist-action-tip">
                          <span className="hist-label">What to do:</span> {change.action}
                        </div>
                      )}

                      {change.categories && change.categories.length > 0 && (
                        <div className="hist-tags">
                          {change.categories.map((cat) => (
                            <span key={cat} className="hist-tag">{cat}</span>
                          ))}
                        </div>
                      )}

                      {/* Expandable diff section */}
                      {isExpanded && (
                        <div className="hist-diff">
                          {isLoadingDiff ? (
                            <div className="hist-diff-loading">Loading diff...</div>
                          ) : diff ? (
                            <>
                              {diff.removed.length > 0 && (
                                <div className="hist-diff-section">
                                  <div className="hist-diff-label removed">Removed</div>
                                  {diff.removed.map((line, i) => (
                                    <div key={i} className="hist-diff-line removed">- {line}</div>
                                  ))}
                                </div>
                              )}
                              {diff.added.length > 0 && (
                                <div className="hist-diff-section">
                                  <div className="hist-diff-label added">Added</div>
                                  {diff.added.map((line, i) => (
                                    <div key={i} className="hist-diff-line added">+ {line}</div>
                                  ))}
                                </div>
                              )}
                              {diff.added.length === 0 && diff.removed.length === 0 && (
                                <div className="hist-diff-empty">No diff data available.</div>
                              )}
                            </>
                          ) : (
                            <div className="hist-diff-empty">Could not load diff.</div>
                          )}
                        </div>
                      )}

                      <div className="hist-row-actions">
                        <a
                          href={change.documents?.url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="pill pill-ghost pill-sm"
                        >
                          View document &rarr;
                        </a>
                        {hasBusiness && (
                          <button
                            className="pill pill-ghost pill-sm"
                            disabled={exporting}
                            onClick={() => exportPdf([change.id])}
                          >
                            Export PDF
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="hist-pagination">
                <button
                  className="hist-page-btn"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  &larr; Previous
                </button>
                <span className="hist-page-info">
                  Page {page} of {totalPages}
                </span>
                <button
                  className="hist-page-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next &rarr;
                </button>
              </div>
            )}
          </>
        )}

        <footer className="dash-footer">
          <span>&copy; 2026 StackDrift</span>
          <div className="f-links">
            <a href="/intel">Intel</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="mailto:support@stackdrift.app">Support</a>
          </div>
        </footer>
      </div>
    </main>
  );
}
