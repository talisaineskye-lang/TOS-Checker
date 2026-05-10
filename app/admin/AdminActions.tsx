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

  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestResult, setIngestResult] = useState<string | null>(null);
  const [ingestError, setIngestError] = useState<string | null>(null);

  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagResult, setDiagResult] = useState<string | null>(null);

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

  const handleDiagnostics = async () => {
    setIsDiagnosing(true);
    setDiagResult(null);
    try {
      const response = await fetch('/api/admin/diagnostics');
      if (!response.ok && response.headers.get('content-type')?.includes('text/html')) {
        setDiagResult(`HTTP ${response.status} — server returned HTML (route may not be deployed yet)`);
        return;
      }
      const data = await response.json();
      const lines = Object.entries(data.results as Record<string, { ok: boolean; detail: string }>)
        .map(([key, val]) => `${val.ok ? '✓' : '✗'} ${key}: ${val.detail}`)
        .join(' | ');
      setDiagResult(lines);
    } catch (err) {
      setDiagResult(err instanceof Error ? err.message : 'Failed');
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleRunIngest = async () => {
    setIsIngesting(true);
    setIngestResult(null);
    setIngestError(null);

    try {
      const response = await fetch('/api/admin/trigger-ingest', { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ingest failed');
      }

      const summary = [
        `Stored ${data.stored ?? 0} new items.`,
        data.cost && data.cost !== '$0.00' ? `Cost: ${data.cost}.` : '',
        data.duration ? `Took ${data.duration}.` : '',
        data.log?.length ? `Log: ${data.log.join(' → ')}` : '',
      ].filter(Boolean).join(' ');

      setIngestResult(summary);
    } catch (err) {
      setIngestError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsIngesting(false);
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
        <button
          className="pill pill-ghost"
          onClick={handleDiagnostics}
          disabled={isDiagnosing}
        >
          {isDiagnosing ? 'Checking...' : 'Run Diagnostics'}
        </button>
        <p className="action-hint">
          Tests Supabase service role key, Anthropic API key, and external fetch connectivity.
        </p>
        {diagResult && <p className="action-result" style={{ color: 'var(--wd-white-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{diagResult}</p>}
      </div>

      <div className="admin-action-group">
        <button
          className="pill pill-solid"
          onClick={handleRunIngest}
          disabled={isIngesting}
        >
          {isIngesting ? 'Running ingest...' : 'Run Intel Ingest Now'}
        </button>
        <p className="action-hint">
          Fetch, classify, and store new Drift Intel items. Same as the 6-hour cron job.
        </p>
        {ingestResult && <p className="action-result success">{ingestResult}</p>}
        {ingestError && <p className="action-result error">{ingestError}</p>}
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
