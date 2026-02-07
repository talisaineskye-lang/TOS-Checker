'use client';

import { useState } from 'react';
import { VendorTemplate } from '@/lib/types';

interface VendorCardProps {
  vendor: VendorTemplate;
  isSelected: boolean;
  onToggle: (slug: string) => void;
}

const DOC_TAG_LABELS: Record<string, string> = {
  tos: 'TOS',
  privacy: 'PRIV',
  aup: 'AUP',
  pricing: 'PRICE',
  api_terms: 'API',
  changelog: 'LOG',
};

export function VendorCard({ vendor, isSelected, onToggle }: VendorCardProps) {
  const [imgError, setImgError] = useState(false);

  const initial = vendor.name.charAt(0).toUpperCase();

  return (
    <div
      className={`v-chip ${isSelected ? 'selected' : ''}`}
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
      <div className="v-check">
        <svg viewBox="0 0 10 10" fill="none">
          <path
            d="M2 5.5L4 7.5L8 3"
            stroke="#050505"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="v-chip-icon">
        {!imgError ? (
          <img
            src={vendor.logoUrl}
            alt={`${vendor.name} logo`}
            onError={() => setImgError(true)}
          />
        ) : (
          initial
        )}
      </div>

      <span className="v-chip-name">{vendor.name}</span>

      <div className="v-chip-tags">
        {vendor.documents.map((d) => (
          <span key={d.type} className={`v-tag v-tag-${d.type}`}>
            {DOC_TAG_LABELS[d.type] || d.type.toUpperCase()}
          </span>
        ))}
      </div>

      <span className="v-chip-docs">
        {vendor.documents.length} doc{vendor.documents.length !== 1 ? 's' : ''}
      </span>
    </div>
  );
}
