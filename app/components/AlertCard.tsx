'use client';

import { useState } from 'react';
import { RiskBucket, RiskPriority, RISK_BUCKETS } from '@/lib/risk-buckets';

interface AlertCardProps {
  title: string;
  summary: string;
  riskBucket: RiskBucket | null;
  riskPriority: RiskPriority;
  riskLevel: 'low' | 'medium' | 'high';
  documentType: string;
  documentUrl: string;
  detectedAt: string;
  notified: boolean;
  categories?: string[];
  changeId?: string;
  onDismiss?: () => void;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getPriorityLabel(priority: RiskPriority): string {
  return priority.toUpperCase();
}

export function AlertCard({
  title,
  summary,
  riskBucket,
  riskPriority,
  riskLevel,
  documentType,
  documentUrl,
  detectedAt,
  notified,
  categories,
  changeId,
  onDismiss,
}: AlertCardProps) {
  const [currentSummary, setCurrentSummary] = useState(summary);
  const [analyzing, setAnalyzing] = useState(false);

  const bucketInfo = riskBucket ? RISK_BUCKETS[riskBucket] : null;
  const priorityClass = `priority-${riskPriority}`;

  const isFallback = currentSummary === 'Policy change detected. Review the document for details.';

  // Use AI-based icon by default; only fall back to keyword bucket icon when AI didn't analyze
  const priorityIcons: Record<RiskPriority, string> = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '⚪',
  };
  const icon = isFallback ? (bucketInfo?.icon || '⚪') : priorityIcons[riskPriority];

  async function handleReanalyze() {
    if (!changeId || analyzing) return;
    setAnalyzing(true);
    try {
      const res = await fetch('/api/admin/reanalyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeId }),
      });
      const data = await res.json();
      if (data.success && data.summary) {
        setCurrentSummary(data.summary);
      }
    } catch {
      // Silently fail — user can try again
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className={`alert-card ${priorityClass}`}>
      <div className="alert-card-header">
        <span className={`alert-priority-badge ${priorityClass}`}>
          {icon} {getPriorityLabel(riskPriority)}
        </span>
        {notified && <span className="alert-notified">Notified</span>}
      </div>

      <h3 className="alert-card-title">{title}</h3>

      <p className="alert-card-summary">{currentSummary}</p>

      <div className="alert-card-meta">
        <span className="alert-doc-type">{documentType}</span>
        <span className="alert-time">Detected {formatRelativeTime(detectedAt)}</span>
      </div>

      {categories && categories.length > 0 && (isFallback || riskLevel !== 'low') && (
        <div className="alert-card-categories">
          {categories.map((cat) => {
            const catInfo = RISK_BUCKETS[cat as RiskBucket];
            return (
              <span key={cat} className="alert-category-tag">
                {catInfo?.icon || '•'} {catInfo?.name || cat}
              </span>
            );
          })}
        </div>
      )}

      <div className="alert-card-actions">
        {changeId && (
          <button
            onClick={handleReanalyze}
            disabled={analyzing}
            className="alert-btn alert-btn-secondary"
          >
            {analyzing ? 'Analyzing...' : 'Re-analyze'}
          </button>
        )}
        <a
          href={documentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="alert-btn alert-btn-secondary"
        >
          View Document
        </a>
        {onDismiss && (
          <button onClick={onDismiss} className="alert-btn alert-btn-ghost">
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
