'use client';

import { useState } from 'react';

export function VendorLogo({
  logoUrl,
  initial,
  statusClass,
}: {
  logoUrl: string | null;
  initial: string;
  statusClass: string;
}) {
  const [failed, setFailed] = useState(false);
  const extraClass = statusClass !== 'stable' ? statusClass : '';

  if (logoUrl && !failed) {
    return (
      <div className={`vt-icon vt-icon-logo ${extraClass}`}>
        <img
          src={logoUrl}
          alt=""
          className="vt-logo-img"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className={`vt-icon ${extraClass}`}>
      {initial}
    </div>
  );
}
