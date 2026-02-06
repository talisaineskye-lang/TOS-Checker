'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  VENDOR_CATALOG,
  CATEGORY_ORDER,
  getVendorBySlug,
} from '@/lib/vendor-catalog';
import { CATEGORY_LABELS, VendorCategory, VendorTemplate, CustomVendor } from '@/lib/types';
import { SearchBar } from './SearchBar';
import { VendorCard } from './VendorCard';
import { CustomVendorForm } from './CustomVendorForm';

export function VendorGrid() {
  const router = useRouter();

  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [customVendors, setCustomVendors] = useState<CustomVendor[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const filteredVendors = useMemo(() => {
    if (!searchQuery.trim()) return VENDOR_CATALOG;
    const query = searchQuery.toLowerCase();
    return VENDOR_CATALOG.filter(
      (v) =>
        v.name.toLowerCase().includes(query) ||
        v.category.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const vendorsByCategory = useMemo(() => {
    const grouped: Record<VendorCategory, VendorTemplate[]> = {
      payment_finance: [],
      cloud_infrastructure: [],
      ai_ml: [],
      ai_builders: [],
      developer_tools: [],
    };
    filteredVendors.forEach((v) => {
      grouped[v.category].push(v);
    });
    return grouped;
  }, [filteredVendors]);

  const handleToggle = (slug: string) => {
    setSelectedSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  };

  const handleAddCustom = (vendor: CustomVendor) => {
    setCustomVendors((prev) => [...prev, vendor]);
  };

  const handleRemoveCustom = (index: number) => {
    setCustomVendors((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      const selectedVendors = Array.from(selectedSlugs)
        .map((slug) => getVendorBySlug(slug))
        .filter((v): v is VendorTemplate => v !== undefined);

      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendors: selectedVendors,
          customVendors,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete onboarding');
      }

      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalSelected = selectedSlugs.size + customVendors.length;
  const totalDocs = useMemo(() => {
    let count = 0;
    selectedSlugs.forEach((slug) => {
      const vendor = getVendorBySlug(slug);
      if (vendor) count += vendor.documents.length;
    });
    customVendors.forEach((cv) => {
      count += cv.documents.length;
    });
    return count;
  }, [selectedSlugs, customVendors]);

  const searchMeta = totalSelected > 0
    ? `${totalSelected} selected \u00b7 ${totalDocs} docs`
    : undefined;

  return (
    <div className="vendor-grid-container">
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        meta={searchMeta}
      />

      {CATEGORY_ORDER.map((category) => {
        const vendors = vendorsByCategory[category];
        if (vendors.length === 0) return null;

        return (
          <section key={category} className="category-section">
            <div className="category-header">
              <h2>{CATEGORY_LABELS[category]}</h2>
            </div>
            <div className="vendor-grid">
              {vendors.map((vendor) => (
                <VendorCard
                  key={vendor.slug}
                  vendor={vendor}
                  isSelected={selectedSlugs.has(vendor.slug)}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          </section>
        );
      })}

      <section className="category-section custom-vendor-section">
        <h2>Custom</h2>
        {customVendors.length > 0 && (
          <div className="custom-vendor-list">
            {customVendors.map((cv, i) => (
              <div key={i} className="custom-vendor-item">
                <span className="custom-vendor-name">{cv.name}</span>
                <span className="custom-vendor-url">{cv.baseUrl}</span>
                <button
                  className="custom-vendor-remove"
                  onClick={() => handleRemoveCustom(i)}
                  aria-label={`Remove ${cv.name}`}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
        <CustomVendorForm onAdd={handleAddCustom} />
      </section>

      {error && <p className="error-message">{error}</p>}

      <div className={`wd-action-bar ${totalSelected > 0 ? 'visible' : ''}`}>
        <div className="wd-action-bar-info">
          <span className="wd-action-bar-count">
            <strong>{totalSelected}</strong> vendor{totalSelected !== 1 ? 's' : ''} selected
          </span>
          <span className="wd-action-bar-meta">
            {totalDocs} document{totalDocs !== 1 ? 's' : ''} to monitor
          </span>
        </div>
        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={totalSelected === 0 || isSubmitting}
        >
          {isSubmitting ? 'Deploying...' : 'Deploy monitors'}
        </button>
      </div>
    </div>
  );
}
