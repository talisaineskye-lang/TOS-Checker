'use client';

import { useState } from 'react';

interface SettingsFormProps {
  alertEmail: string;
}

export function SettingsForm({ alertEmail }: SettingsFormProps) {
  const [email, setEmail] = useState(alertEmail);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertEmail: email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }

      setMessage('Settings saved successfully');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="settings-form" onSubmit={handleSave}>
      <div className="setting-row">
        <label htmlFor="alertEmail">Alert Email</label>
        <input
          id="alertEmail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="form-input"
        />
      </div>

      <p className="setting-hint">
        Email address where change notifications will be sent.
        Note: This is currently set via environment variable (ALERT_EMAIL).
        Changing it here will update the app settings but won&apos;t modify the env var.
      </p>

      <div className="setting-actions">
        <button type="submit" className="btn-primary-small" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
        {message && <span className="setting-message">{message}</span>}
      </div>
    </form>
  );
}
