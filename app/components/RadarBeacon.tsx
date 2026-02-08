interface RadarBeaconProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function RadarBeacon({ size = 'md', className }: RadarBeaconProps) {
  const sizes = {
    xs: { w: 16, h: 20 },
    sm: { w: 36, h: 46 },
    md: { w: 44, h: 56 },
    lg: { w: 56, h: 72 },
    xl: { w: 80, h: 100 },
  };
  const { w, h } = sizes[size];
  const s = w / 56;
  const id = `radar-grad-${size}`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className={className}>
      <defs>
        <linearGradient id={id} x1="50%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stopColor="#00d4ff" />
          <stop offset="45%" stopColor="#4d8eff" />
          <stop offset="100%" stopColor="#7b2fff" />
        </linearGradient>
      </defs>
      <circle cx={w / 2} cy={h * 0.33} r={22 * s} stroke={`url(#${id})`} strokeWidth={2 * s} fill="none" opacity="0.2" />
      <circle cx={w / 2} cy={h * 0.33} r={15 * s} stroke={`url(#${id})`} strokeWidth={2 * s} fill="none" opacity="0.45" />
      <circle cx={w / 2} cy={h * 0.33} r={8.5 * s} stroke={`url(#${id})`} strokeWidth={2 * s} fill="none" opacity="0.75" />
      <circle cx={w / 2} cy={h * 0.33} r={3 * s} fill={`url(#${id})`} />
      <polygon
        points={`${w / 2},${h * 0.39} ${w / 2 - 9 * s},${h * 0.81} ${w / 2 + 9 * s},${h * 0.81}`}
        fill={`url(#${id})`}
      />
    </svg>
  );
}
