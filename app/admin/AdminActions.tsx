'use client';

import { useState } from 'react';

interface ReanalyzeVendor {
  id: string;
  vendorName: string;
  changeId: string;
  summary: string;
}

export function AdminActions({
  vendors,
  allChangeIds,
}: {
  vendors: ReanalyzeVendor[];
  allChangeIds: string[];
}) {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedVendor, setSelectedVendor] = useState('');
  const [reanalyzing, setReanalyzing] = useState(false);
  const [reanalyzeProgress, setReanalyzeProgress] = useState('');
  const [reanalyzeResult, setReanalyzeResult] = useState<string | null>(null);
  const [reanalyzeError, setReanalyzeError] = useState<string | null>(null);

  const handleRunCheck = async () => {
    setIsRunning(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch('/api/admin/trigger-check', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to run check');
      }

      setResult(`Checked ${data.checked} documents. ${data.results?.filter((r: { status: string }) => r.status === 'changed').length || 0} changes detected.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsRunning(false);
    }
  };

  const handleReanalyze = async () => {
    if (!selectedVendor) return;
    const vendor = vendors.find((v) => v.id === selectedVendor);
    if (!vendor) return;

    setReanalyzing(true);
    setReanalyzeResult(null);
    setReanalyzeError(null);
    setReanalyzeProgress('');

    try {
      const res = await fetch('/api/admin/reanalyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeId: vendor.changeId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Re-analysis failed');
      }

      setReanalyzeResult(
        `${vendor.vendorName} re-analyzed → ${data.riskLevel?.toUpperCase() || 'unknown'} risk (priority: ${data.riskPriority}). Summary: "${data.summary}"`
      );
    } catch (err) {
      setReanalyzeError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setReanalyzing(false);
    }
  };

  const handleReanalyzeAllChanges = async () => {
    if (allChangeIds.length === 0) return;

    setReanalyzing(true);
    setReanalyzeResult(null);
    setReanalyzeError(null);

    let success = 0;
    let failed = 0;
    const total = allChangeIds.length;

    for (const changeId of allChangeIds) {
      setReanalyzeProgress(`Re-analyzing ${success + failed + 1} of ${total}...`);

      try {
        const res = await fetch('/api/admin/reanalyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ changeId }),
        });

        if (res.ok) {
          success++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    setReanalyzeProgress('');
    setReanalyzeResult(
      `Re-analyzed ${success} of ${total} changes successfully.${failed > 0 ? ` ${failed} failed.` : ''} Refresh the page to see updated results.`
    );
    setReanalyzing(false);
  };

  return (
    <div className="admin-actions">
      <div className="admin-action-group">
        <button
          className="pill pill-solid"
          onClick={handleRunCheck}
          disabled={isRunning}
        >
          {isRunning ? 'Running check...' : 'Run Check Now'}
        </button>
        <p className="action-hint">
          Manually trigger a check of all monitored documents. This is the same as the daily cron job.
        </p>
        {result && <p className="action-result success">{result}</p>}
        {error && <p className="action-result error">{error}</p>}
      </div>

      <div className="admin-action-group">
        <div className="reanalyze-row">
          <select
            className="reanalyze-select"
            value={selectedVendor}
            onChange={(e) => setSelectedVendor(e.target.value)}
            disabled={reanalyzing}
          >
            <option value="">Select a vendor...</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.vendorName}
              </option>
            ))}
          </select>
          <button
            className="pill pill-solid"
            onClick={handleReanalyze}
            disabled={!selectedVendor || reanalyzing}
          >
            {reanalyzing ? 'Re-analyzing...' : 'Re-analyze'}
          </button>
        </div>
        <button
          className="pill pill-ghost"
          onClick={handleReanalyzeAllChanges}
          disabled={reanalyzing || allChangeIds.length === 0}
          style={{ alignSelf: 'flex-start' }}
        >
          {reanalyzing ? 'Processing...' : `Re-analyze All Changes (${allChangeIds.length})`}
        </button>
        <p className="action-hint">
          Re-run AI analysis using the updated prompt. Overwrites summary, impact, action, and severity for all selected changes.
        </p>
        {reanalyzeProgress && <p className="action-result" style={{ color: 'var(--wd-white-muted)' }}>{reanalyzeProgress}</p>}
        {reanalyzeResult && <p className="action-result success">{reanalyzeResult}</p>}
        {reanalyzeError && <p className="action-result error">{reanalyzeError}</p>}
      </div>
    </div>
  );
}
