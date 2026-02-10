'use client';

import { Logo } from './Logo';
import { UserMenu } from './UserMenu';

export function DashboardNav() {
  return (
    <nav className="dash-nav">
      <div className="inner">
        <div className="nav-left">
          <a className="nav-logo" href="/dashboard">
            <Logo size="sm" />
          </a>
          <a href="/dashboard" className="nav-link active">Dashboard</a>
          <a href="/intel" className="nav-link">Intel</a>
          <a href="/admin" className="nav-link">Admin</a>
        </div>
        <div className="nav-right">
          <a href="/onboarding" className="pill pill-ghost pill-sm">+ Add vendor</a>
          <UserMenu />
        </div>
      </div>
    </nav>
  );
}
