interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: { height: 28 },
  md: { height: 36 },
  lg: { height: 48 },
};

export function Logo({ size = 'md' }: LogoProps) {
  const { height } = SIZES[size];

  return (
    <span className={`logo-lockup logo-${size}`}>
      <img
        src="/logo.png"
        alt="StackDrift"
        height={height}
        style={{ display: 'block' }}
      />
    </span>
  );
}
