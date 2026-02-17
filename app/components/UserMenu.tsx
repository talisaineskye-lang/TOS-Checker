'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from './AuthProvider';
import { createBrowserClient } from '@supabase/ssr';
import { goToPortal } from '@/lib/stripe/actions';

interface UserPrefs {
  email_alerts: boolean;
  weekly_digest: boolean;
  critical_only: boolean;
}

export function UserMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<string>('free');
  const [cancelAt, setCancelAt] = useState<string | null>(null);
  const [watchlistCount, setWatchlistCount] = useState<number>(0);
  const [prefs, setPrefs] = useState<UserPrefs>({
    email_alerts: true,
    weekly_digest: true,
    critical_only: false,
  });
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  // Fetch user data when dropdown opens
  const fetchUserData = useCallback(async () => {
    if (!user) return;

    // Fetch profile (plan + notification prefs)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('plan, email_alerts, weekly_digest, critical_only, cancel_at')
      .eq('id', user.id)
      .single();

    if (profile) {
      setPlan(profile.plan || 'free');
      setCancelAt(profile.cancel_at ?? null);
      setPrefs({
        email_alerts: profile.email_alerts ?? true,
        weekly_digest: profile.weekly_digest ?? true,
        critical_only: profile.critical_only ?? false,
      });
    }

    // Fetch watchlist count
    const { count } = await supabase
      .from('user_vendors')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    setWatchlistCount(count || 0);
  }, [user, supabase]);

  useEffect(() => {
    if (open) fetchUserData();
  }, [open, fetchUserData]);

  // Toggle a notification preference
  const togglePref = async (key: keyof UserPrefs) => {
    if (!user || saving) return;
    setSaving(true);

    const newVal = !prefs[key];
    setPrefs((prev) => ({ ...prev, [key]: newVal }));

    await supabase
      .from('user_profiles')
      .update({ [key]: newVal })
      .eq('id', user.id);

    setSaving(false);
  };

  if (!user) return null;

  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email;

  const planLabels: Record<string, { label: string; color: string }> = {
    free: { label: 'FREE', color: 'faint' },
    solo: { label: 'SOLO', color: 'cyan' },
    pro: { label: 'PRO', color: 'blue' },
    business: { label: 'BUSINESS', color: 'purple' },
  };

  const currentPlan = planLabels[plan] || planLabels.free;

  const isCancelling = cancelAt && new Date(cancelAt) > new Date();
  const cancelDate = isCancelling
    ? new Date(cancelAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  return (
    <div className="user-menu" ref={ref}>
      <button className="user-menu-trigger" onClick={() => setOpen(!open)}>
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="user-avatar" />
        ) : (
          <div className="user-avatar-fallback">
            {(name || 'U').charAt(0).toUpperCase()}
          </div>
        )}
      </button>

      {open && (
        <div className="user-dropdown expanded">
          {/* Identity */}
          <div className="user-dropdown-header">
            <div className="ud-identity">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="ud-avatar" />
              ) : (
                <div className="ud-avatar-fallback">
                  {(name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="ud-info">
                <span className="user-dropdown-name">{name}</span>
                <span className="user-dropdown-email">{user.email}</span>
              </div>
            </div>
            <span className={`ud-plan-badge ${currentPlan.color}`}>
              {currentPlan.label}
            </span>
            {isCancelling && (
              <span className="ud-cancel-notice">Cancels {cancelDate}</span>
            )}
          </div>

          <div className="user-dropdown-divider" />

          {/* Navigation */}
          <a href="/dashboard" className="user-dropdown-item">
            <span className="ud-item-icon">{'\u{1F4CA}'}</span>
            Dashboard
          </a>
          <a href="/dashboard" className="user-dropdown-item">
            <span className="ud-item-icon">{'\u{1F4CB}'}</span>
            Watchlist
            <span className="ud-item-count">{watchlistCount}</span>
          </a>

          <div className="user-dropdown-divider" />

          {/* Notifications */}
          <div className="ud-section-label">Notifications</div>
          <div className="ud-toggle-row">
            <span className="ud-toggle-label">Email alerts</span>
            <button
              className={`ud-toggle ${prefs.email_alerts ? 'on' : ''}`}
              onClick={() => togglePref('email_alerts')}
              disabled={saving}
            >
              <span className="ud-toggle-thumb" />
            </button>
          </div>
          <div className="ud-toggle-row">
            <span className="ud-toggle-label">Weekly digest</span>
            <button
              className={`ud-toggle ${prefs.weekly_digest ? 'on' : ''}`}
              onClick={() => togglePref('weekly_digest')}
              disabled={saving}
            >
              <span className="ud-toggle-thumb" />
            </button>
          </div>
          <div className="ud-toggle-row">
            <span className="ud-toggle-label">Critical only</span>
            <button
              className={`ud-toggle ${prefs.critical_only ? 'on' : ''}`}
              onClick={() => togglePref('critical_only')}
              disabled={saving}
            >
              <span className="ud-toggle-thumb" />
            </button>
          </div>

          <div className="user-dropdown-divider" />

          {/* Billing */}
          <div className="ud-section-label">Billing</div>
          {plan === 'free' ? (
            <a href="/pricing" className="ud-upgrade-btn">
              Upgrade to Solo &rarr; $9/mo
            </a>
          ) : isCancelling ? (
            <div className="ud-cancel-billing">
              <span className="ud-cancel-text">Your plan ends {cancelDate}</span>
              <button className="ud-resubscribe" onClick={() => goToPortal()}>
                Resubscribe
              </button>
            </div>
          ) : (
            <button
              className="user-dropdown-item"
              onClick={() => goToPortal()}
            >
              <span className="ud-item-icon">{'\u{1F4B3}'}</span>
              Manage subscription
            </button>
          )}

          <div className="user-dropdown-divider" />

          {/* Sign out */}
          <button onClick={signOut} className="user-dropdown-item logout">
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
