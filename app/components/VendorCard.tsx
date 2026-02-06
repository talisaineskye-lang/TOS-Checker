'use client';

import { useState } from 'react';
import { VendorTemplate } from '@/lib/types';

interface VendorCardProps {
  vendor: VendorTemplate;
  isSelected: boolean;
  onToggle: (slug: string) => void;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  tos: 'TOS',
  privacy: 'PRIVACY',
  aup: 'AUP',
  pricing: 'PRICING',
  api_terms: 'API',
  changelog: 'CHANGELOG',
};

export function VendorCard({ vendor, isSelected, onToggle }: VendorCardProps) {
  const [imgError, setImgError] = useState(false);

  const initial = vendor.name.charAt(0).toUpperCase();

  return (
    <div
      className={`vendor-card ${isSelected ? 'selected' : ''}`}
      onClick={() => onToggle(vendor.slug)}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle(vendor.slug);
        }
      }}
    >
      <div className="vendor-card-checkbox">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggle(vendor.slug)}
          aria-label={`Select ${vendor.name}`}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {!imgError ? (
        <img
          src={vendor.logoUrl}
          alt={`${vendor.name} logo`}
          className="vendor-card-logo"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="vendor-card-logo vendor-card-logo-fallback">{initial}</div>
      )}

      <span className="vendor-card-name">{vendor.name}</span>

      <span className="vendor-card-doctypes">
        {vendor.documents.map((d) => (
          <span key={d.type} className={`doc-tag doc-tag-${d.type}`}>
            {DOC_TYPE_LABELS[d.type] || d.type.toUpperCase()}
          </span>
        ))}
      </span>

      <span className="vendor-card-docs">
        {vendor.documents.length} doc{vendor.documents.length !== 1 ? 's' : ''}
      </span>
    </div>
  );
}
