'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from './AuthProvider';

export function UserMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  if (!user) return null;

  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email;

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
        <div className="user-dropdown">
          <div className="user-dropdown-header">
            <span className="user-dropdown-name">{name}</span>
            <span className="user-dropdown-email">{user.email}</span>
          </div>
          <div className="user-dropdown-divider" />
          <a href="/dashboard" className="user-dropdown-item">Dashboard</a>
          <div className="user-dropdown-divider" />
          <button onClick={signOut} className="user-dropdown-item logout">
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
