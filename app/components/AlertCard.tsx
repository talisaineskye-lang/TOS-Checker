'use client';

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
  onDismiss,
}: AlertCardProps) {
  const bucketInfo = riskBucket ? RISK_BUCKETS[riskBucket] : null;
  const icon = bucketInfo?.icon || '⚪';
  const priorityClass = `priority-${riskPriority}`;

  return (
    <div className={`alert-card ${priorityClass}`}>
      <div className="alert-card-header">
        <span className={`alert-priority-badge ${priorityClass}`}>
          {icon} {getPriorityLabel(riskPriority)}
        </span>
        {notified && <span className="alert-notified">Notified</span>}
      </div>

      <h3 className="alert-card-title">{title}</h3>

      <p className="alert-card-summary">{summary}</p>

      <div className="alert-card-meta">
        <span className="alert-doc-type">{documentType}</span>
        <span className="alert-time">Detected {formatRelativeTime(detectedAt)}</span>
      </div>

      {categories && categories.length > 0 && (
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
