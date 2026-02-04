'use client';

import { useState } from 'react';
import { CustomVendor, DocumentType } from '@/lib/types';

interface CustomVendorFormProps {
  onAdd: (vendor: CustomVendor) => void;
}

export function CustomVendorForm({ onAdd }: CustomVendorFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [tosUrl, setTosUrl] = useState('');
  const [privacyUrl, setPrivacyUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Vendor name is required');
      return;
    }

    if (!baseUrl.trim()) {
      setError('Base URL is required');
      return;
    }

    try {
      new URL(baseUrl);
    } catch {
      setError('Invalid base URL');
      return;
    }

    const documents: { type: DocumentType; url: string }[] = [];

    if (tosUrl.trim()) {
      try {
        new URL(tosUrl);
        documents.push({ type: 'tos', url: tosUrl.trim() });
      } catch {
        setError('Invalid Terms of Service URL');
        return;
      }
    }

    if (privacyUrl.trim()) {
      try {
        new URL(privacyUrl);
        documents.push({ type: 'privacy', url: privacyUrl.trim() });
      } catch {
        setError('Invalid Privacy Policy URL');
        return;
      }
    }

    if (documents.length === 0) {
      setError('At least one document URL is required');
      return;
    }

    onAdd({
      name: name.trim(),
      baseUrl: baseUrl.trim(),
      documents,
    });

    // Reset form
    setName('');
    setBaseUrl('');
    setTosUrl('');
    setPrivacyUrl('');
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button className="btn-secondary" onClick={() => setIsOpen(true)}>
        + Add custom vendor
      </button>
    );
  }

  return (
    <form className="custom-vendor-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Vendor name"
          className="form-input"
        />
        <input
          type="url"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://example.com"
          className="form-input"
        />
      </div>
      <div className="form-row">
        <input
          type="url"
          value={tosUrl}
          onChange={(e) => setTosUrl(e.target.value)}
          placeholder="Terms of Service URL (optional)"
          className="form-input"
        />
        <input
          type="url"
          value={privacyUrl}
          onChange={(e) => setPrivacyUrl(e.target.value)}
          placeholder="Privacy Policy URL (optional)"
          className="form-input"
        />
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={() => setIsOpen(false)}>
          Cancel
        </button>
        <button type="submit" className="btn-primary-small">
          Add Vendor
        </button>
      </div>
    </form>
  );
}
