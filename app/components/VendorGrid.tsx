'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
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
import { useAuth } from './AuthProvider';

const CATEGORY_CONFIG: Record<VendorCategory, {
  color: string;
  subtitle: string;
  description: string;
}> = {
  payment_finance: {
    color: 'blue',
    subtitle: 'Payment processors',
    description: 'Billing, payouts, and financial infrastructure',
  },
  cloud_infrastructure: {
    color: 'purple',
    subtitle: 'Hosting & deployment',
    description: 'Where your code runs',
  },
  ai_ml: {
    color: 'green',
    subtitle: 'AI APIs you integrate',
    description: 'Model providers and inference platforms',
  },
  ai_builders: {
    color: 'green',
    subtitle: 'AI tools you build with',
    description: 'Code generation and development platforms',
  },
  developer_tools: {
    color: 'cyan',
    subtitle: 'Dev platforms & APIs',
    description: 'Source control, CI/CD, and tooling',
  },
};

export function VendorGrid() {
  const router = useRouter();
  const { user } = useAuth();

  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [customVendors, setCustomVendors] = useState<CustomVendor[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Scroll reveal
  const revealRefs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('visible');
        });
      },
      { threshold: 0.06 }
    );
    revealRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

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

  // Categories that actually have vendors to show
  const visibleCategories = CATEGORY_ORDER.filter(
    (cat) => vendorsByCategory[cat].length > 0
  );

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

  const handleSelectAll = (category: VendorCategory) => {
    const vendors = vendorsByCategory[category];
    const allSelected = vendors.every((v) => selectedSlugs.has(v.slug));

    setSelectedSlugs((prev) => {
      const next = new Set(prev);
      vendors.forEach((v) => {
        if (allSelected) {
          next.delete(v.slug);
        } else {
          next.add(v.slug);
        }
      });
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

      // Save vendor selections to user watchlist if authenticated
      if (user && data.createdVendors?.length > 0) {
        await Promise.all(
          data.createdVendors.map((v: { id: string }) =>
            fetch('/api/user/vendors', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ vendor_id: v.id }),
            })
          )
        );
      }

      router.push('/dashboard');
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

  return (
    <>
      {/* Page header */}
      <header className="wd-page-header">
        <div className="wrap">
          <div className="tag tag-green">Onboarding</div>
          <h1>
            Select your<br />
            <span className="dim">vendor stack.</span>
          </h1>
          <p className="sub">
            We monitor Terms of Service, Privacy Policies, Pricing, and AUP
            documents for changes that affect your business.
          </p>
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>
      </header>

      {/* Bento grid */}
      <div className="bento-grid">
        {visibleCategories.map((category, idx) => {
          const vendors = vendorsByCategory[category];
          const config = CATEGORY_CONFIG[category];
          const allSelected = vendors.every((v) => selectedSlugs.has(v.slug));
          const isLast = idx === visibleCategories.length - 1;
          const isOddLast = isLast && visibleCategories.length % 2 !== 0;

          return (
            <div
              key={category}
              className={`cat-box wd-reveal ${isOddLast ? 'full' : ''}`}
              data-color={config.color}
              ref={(el) => { revealRefs.current[idx] = el; }}
            >
              <div className="cat-header">
                <div className="cat-tag">{CATEGORY_LABELS[category]}</div>
                <h2>{config.subtitle}</h2>
                <p>{config.description}</p>
              </div>
              <button
                className="cat-select-all"
                onClick={() => handleSelectAll(category)}
              >
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
              <div className="vendor-chips">
                {vendors.map((vendor) => (
                  <VendorCard
                    key={vendor.slug}
                    vendor={vendor}
                    isSelected={selectedSlugs.has(vendor.slug)}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom vendors + footer */}
      <div className="wrap">
        <div className="custom-section wd-reveal" ref={(el) => { revealRefs.current[10] = el; }}>
          <div className="tag" style={{ marginBottom: 16 }}>Custom</div>
          <h3>Can&apos;t find a vendor?</h3>
          <p className="sub">Paste any legal page URL and we&apos;ll start tracking it.</p>

          {customVendors.length > 0 && (
            <div className="custom-list">
              {customVendors.map((cv, i) => (
                <div key={i} className="custom-item">
                  <span className="ci-name">{cv.name}</span>
                  <span className="ci-url">{cv.baseUrl}</span>
                  <button
                    className="ci-remove"
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
        </div>

        {error && <p className="error-message">{error}</p>}

        <footer className="wd-footer">
          <span>&copy; 2026 StackDrift</span>
          <div className="wd-footer-links">
            <a href="/dashboard">Dashboard</a>
            <a href="/intel">Intel</a>
            <a href="/admin">Admin</a>
          </div>
        </footer>
      </div>

      {/* Sticky action bar */}
      <div className={`wd-action-bar ${totalSelected > 0 ? 'visible' : ''}`}>
        <div className="action-inner">
          <div className="action-meta">
            <span className="action-stat">
              <span className="num hl">{totalSelected}</span> vendor{totalSelected !== 1 ? 's' : ''}
            </span>
            <span className="action-stat">
              <span className="num">{totalDocs}</span> document{totalDocs !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="action-right">
            <span className="deploy-label">
              deploy_monitor --vendors={totalSelected}
            </span>
            <button
              className="pill pill-solid"
              onClick={handleSubmit}
              disabled={totalSelected === 0 || isSubmitting}
            >
              {isSubmitting ? 'Deploying...' : 'Deploy'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
