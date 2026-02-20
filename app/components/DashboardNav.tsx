'use client';

import { Logo } from './Logo';
import { UserMenu } from './UserMenu';
import { useAuth } from './AuthProvider';

const ADMIN_EMAIL = 'talisaine.skye@gmail.com';

export function DashboardNav() {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  return (
    <nav className="dash-nav">
      <div className="inner">
        <div className="nav-left">
          <a className="nav-logo" href="/dashboard">
            <Logo size="sm" />
          </a>
          <a href="/dashboard" className="nav-link active">Dashboard</a>
          <a href="/dashboard/history" className="nav-link">History</a>
          <a href="/dashboard/settings" className="nav-link">Settings</a>
          <a href="/intel" className="nav-link">Drift Intel</a>
          {isAdmin && <a href="/admin" className="nav-link">Admin</a>}
        </div>
        <div className="nav-right">
          <a href="/onboarding" className="pill pill-ghost pill-sm">+ Add vendor</a>
          <UserMenu />
        </div>
      </div>
    </nav>
  );
}
