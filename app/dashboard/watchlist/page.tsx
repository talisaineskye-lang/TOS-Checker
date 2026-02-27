'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useAuth } from '../../components/AuthProvider';
import { DashboardNav } from '../../components/DashboardNav';
import { CATEGORY_LABELS, VendorCategory } from '@/lib/types';

interface WatchedVendor {
  vendor_id: string;
  vendors: {
    id: string;
    name: string;
    slug: string | null;
    logo_url: string | null;
    category: string | null;
    base_url: string | null;
  };
}

interface AllVendor {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  category: string | null;
  base_url: string | null;
  is_active: boolean;
}

export default function WatchlistPage() {
  const { user, loading: authLoading } = useAuth();
  const [watched, setWatched] = useState<WatchedVendor[]>([]);
  const [allVendors, setAllVendors] = useState<AllVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchData = useCallback(async () => {
    if (!user) return;

    const [watchRes, vendorRes] = await Promise.all([
      fetch('/api/user/vendors'),
      supabase.from('vendors').select('id, name, slug, logo_url, category, base_url, is_active').eq('is_active', true).order('name'),
    ]);

    const watchData = await watchRes.json();
    setWatched(watchData.vendors || []);
    setAllVendors((vendorRes.data || []) as AllVendor[]);
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    if (!authLoading && user) fetchData();
  }, [authLoading, user, fetchData]);

  const watchedIds = new Set(watched.map((w) => w.vendor_id));

  const toggleVendor = async (vendorId: string) => {
    if (toggling.has(vendorId)) return;
    setToggling((prev) => new Set(prev).add(vendorId));

    const isWatched = watchedIds.has(vendorId);

    const res = await fetch('/api/user/vendors', {
      method: isWatched ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendor_id: vendorId }),
    });

    if (res.ok) {
      if (isWatched) {
        setWatched((prev) => prev.filter((w) => w.vendor_id !== vendorId));
      } else {
        const vendor = allVendors.find((v) => v.id === vendorId);
        if (vendor) {
          setWatched((prev) => [...prev, { vendor_id: vendorId, vendors: vendor }]);
        }
      }
    }

    setToggling((prev) => {
      const next = new Set(prev);
      next.delete(vendorId);
      return next;
    });
  };

  // Get unique categories from all vendors
  const categories = Array.from(new Set(allVendors.map((v) => v.category).filter(Boolean))) as string[];

  // Filter vendors
  const filtered = allVendors.filter((v) => {
    if (search && !v.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCat !== 'all' && v.category !== filterCat) return false;
    return true;
  });

  // Group by category
  const grouped = new Map<string, AllVendor[]>();
  filtered.forEach((v) => {
    const cat = v.category || 'other';
    const list = grouped.get(cat) || [];
    list.push(v);
    grouped.set(cat, list);
  });

  if (authLoading || loading) {
    return (
      <main className="dashboard-page">
        <DashboardNav />
        <div className="wrap">
          <div className="wl-loading">Loading watchlist...</div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="dashboard-page">
        <DashboardNav />
        <div className="wrap">
          <div className="wl-loading">Please sign in to manage your watchlist.</div>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <DashboardNav />

      <div className="wrap">
        <header className="dash-header">
          <div className="tag tag-cyan">Watchlist</div>
          <h1>
            Watching {watched.length} vendor{watched.length !== 1 ? 's' : ''}
          </h1>
          <p className="wl-sub">
            Toggle vendors on or off to customize which ones you monitor.
          </p>
        </header>

        {/* Controls */}
        <div className="wl-controls">
          <input
            type="text"
            className="wl-search"
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="wl-filter"
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
          >
            <option value="all">All categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat as VendorCategory] || cat}
              </option>
            ))}
          </select>
        </div>

        {/* Vendor grid grouped by category */}
        <div className="wl-grid-wrap">
          {Array.from(grouped.entries()).map(([cat, vendors]) => (
            <div key={cat} className="wl-category">
              <h3 className="wl-cat-label">
                {CATEGORY_LABELS[cat as VendorCategory] || cat}
                <span className="wl-cat-count">{vendors.length}</span>
              </h3>
              <div className="wl-vendor-grid">
                {vendors.map((v) => {
                  const isOn = watchedIds.has(v.id);
                  const isBusy = toggling.has(v.id);
                  return (
                    <button
                      key={v.id}
                      className={`wl-vendor-card${isOn ? ' watched' : ''}${isBusy ? ' busy' : ''}`}
                      onClick={() => toggleVendor(v.id)}
                      disabled={isBusy}
                    >
                      <div className="wl-vendor-icon">
                        {v.logo_url ? (
                          <img src={v.logo_url} alt="" className="wl-vendor-logo" />
                        ) : (
                          <span className="wl-vendor-initial">{v.name.charAt(0)}</span>
                        )}
                      </div>
                      <span className="wl-vendor-name">{v.name}</span>
                      <span className={`wl-toggle-indicator${isOn ? ' on' : ''}`}>
                        {isOn ? '✓' : '+'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="wl-empty">No vendors match your search.</div>
          )}
        </div>

        <footer className="dash-footer">
          <span>&copy; 2026 StackDrift</span>
          <div className="f-links">
            <a href="/intel">Drift Intel</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="mailto:support@stackdrift.app">Support</a>
          </div>
        </footer>
      </div>
    </main>
  );
}
