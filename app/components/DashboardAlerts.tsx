'use client';

import { useState } from 'react';

export interface DashChange {
  id: string;
  vendorName: string;
  docType: string;
  severity: 'critical' | 'warning' | 'notice' | 'low';
  title: string;
  summary: string;
  impact: string | null;
  action: string | null;
  categories: string[];
  detectedAt: string;
  documentUrl: string;
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

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'Critical',
  warning: 'Warning',
  notice: 'Notice',
  low: 'Low',
};

type Filter = 'all' | 'critical' | 'warning' | 'notice';

function formatTimeAgo(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function DashboardAlerts({ changes }: { changes: DashChange[] }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [reanalyzing, setReanalyzing] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, string>>({});

  const counts: Record<Filter, number> = {
    all: changes.length,
    critical: changes.filter((c) => c.severity === 'critical').length,
    warning: changes.filter((c) => c.severity === 'warning').length,
    notice: changes.filter((c) => c.severity === 'notice').length,
  };

  const filtered = filter === 'all'
    ? changes
    : changes.filter((c) => c.severity === filter);

  const isFallback = (summary: string) =>
    summary === 'Policy change detected. Review the document for details.';

  async function handleReanalyze(changeId: string) {
    setReanalyzing(changeId);
    try {
      const res = await fetch('/api/admin/reanalyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeId }),
      });
      const data = await res.json();
      if (data.success && data.summary) {
        setSummaries((prev) => ({ ...prev, [changeId]: data.summary }));
      }
    } catch {
      // User can try again
    } finally {
      setReanalyzing(null);
    }
  }

  return (
    <>
      <div className="section-head">
        <h2>Recent changes</h2>
        <div className="sh-meta">
          <div className="filter-pills">
            {(['all', 'critical', 'warning', 'notice'] as Filter[]).map((f) => (
              <button
                key={f}
                className={`fp ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : SEVERITY_LABELS[f]}
                <span className="fp-count">{counts[f]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="dash-empty">
          {changes.length === 0
            ? 'No changes detected yet. Your vendors are being monitored.'
            : 'No changes match this filter.'}
        </div>
      ) : (
        <div className="alerts-grid">
          {filtered.map((change) => {
            const summary = summaries[change.id] || change.summary;
            return (
              <div
                key={change.id}
                className={`alert-card sev-${change.severity}${change.severity === 'critical' ? ' full' : ''}`}
              >
                <div className="ac-top">
                  <span className={`ac-sev ${change.severity}`}>
                    {SEVERITY_LABELS[change.severity]}
                  </span>
                  <span className="ac-vendor">{change.vendorName}</span>
                  <span className={`ac-doc ${DOC_TYPE_CLASS[change.docType] || ''}`}>
                    {DOC_TYPE_SHORT[change.docType] || change.docType}
                  </span>
                  <span className="ac-time">{formatTimeAgo(change.detectedAt)}</span>
                </div>

                <div className="ac-title">{change.title}</div>
                <div className="ac-summary">{summary}</div>

                {change.impact && (
                  <div className="ac-impact">
                    <span className="ac-label">Why it matters</span>
                    {change.impact}
                  </div>
                )}
                {change.action && (
                  <div className="ac-action-tip">
                    <span className="ac-label">What to do</span>
                    {change.action}
                  </div>
                )}

                {change.categories.length > 0 && (
                  <div className="ac-tags">
                    {change.categories.map((cat) => (
                      <span key={cat} className="ac-tag">{cat}</span>
                    ))}
                  </div>
                )}

                <div className="ac-action">
                  <button
                    className="pill pill-ghost pill-sm"
                    onClick={() => handleReanalyze(change.id)}
                    disabled={reanalyzing === change.id}
                  >
                    {reanalyzing === change.id ? 'Analyzing...' : 'Re-analyze'}
                  </button>
                  <a
                    href={change.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pill pill-ghost pill-sm"
                  >
                    View document →
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
