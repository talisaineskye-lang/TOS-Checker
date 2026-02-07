'use client';

import { useState } from 'react';
import { CustomVendor } from '@/lib/types';

interface CustomVendorFormProps {
  onAdd: (vendor: CustomVendor) => void;
}

export function CustomVendorForm({ onAdd }: CustomVendorFormProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Vendor name is required');
      return;
    }

    if (!url.trim()) {
      setError('URL is required');
      return;
    }

    try {
      new URL(url);
    } catch {
      setError('Invalid URL');
      return;
    }

    onAdd({
      name: name.trim(),
      baseUrl: url.trim(),
      documents: [{ type: 'tos', url: url.trim() }],
    });

    setName('');
    setUrl('');
  };

  return (
    <>
      <form className="custom-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label>Vendor Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Corp"
          />
        </div>
        <div className="form-field">
          <label>TOS / Legal Page URL</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://acme.com/terms"
          />
        </div>
        <button type="submit" className="pill pill-ghost pill-add">
          Add
        </button>
      </form>
      {error && <p className="form-error">{error}</p>}
    </>
  );
}
