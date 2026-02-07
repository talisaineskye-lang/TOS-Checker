'use client';

import { useState } from 'react';

export function AdminActions() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="admin-actions">
      <button
        className="pill pill-solid"
        onClick={handleRunCheck}
        disabled={isRunning}
      >
        {isRunning ? 'Running check...' : 'Run Check Now'}
      </button>

      {result && <p className="action-result success">{result}</p>}
      {error && <p className="action-result error">{error}</p>}

      <p className="action-hint">
        Manually trigger a check of all monitored documents. This is the same as the daily cron job.
      </p>
    </div>
  );
}
