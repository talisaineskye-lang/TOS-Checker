/* eslint-disable @next/next/no-img-element */

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

const HEIGHTS = { sm: 28, md: 36, lg: 48 };
const ICON_SIZES = { sm: 32, md: 40, lg: 48 };

export function Logo({ size = 'md' }: LogoProps) {
  const h = HEIGHTS[size];
  const iconSize = ICON_SIZES[size];

  return (
    <span className="logo-lockup">
      <img
        src="/logo-600w.png"
        alt="StackDrift"
        style={{ height: h, width: 'auto' }}
        className="logo-wordmark"
      />
      <img
        src="/icon-256x256.png"
        alt="StackDrift"
        style={{ height: iconSize, width: iconSize }}
        className="logo-icon"
      />
    </span>
  );
}
