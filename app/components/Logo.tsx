import { RadarBeacon } from './RadarBeacon';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function Logo({ size = 'md', showIcon = true }: LogoProps) {
  const beaconSizes = { sm: 'xs' as const, md: 'sm' as const, lg: 'md' as const };

  return (
    <span className={`logo-lockup logo-${size}`}>
      {showIcon && <RadarBeacon size={beaconSizes[size]} />}
      <span className="font-codex logo-wordmark">
        STACK<span className="text-gradient">DRIFT</span>
      </span>
    </span>
  );
}
