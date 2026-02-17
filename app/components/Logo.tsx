import Image from 'next/image';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: { wordmarkWidth: 200, wordmarkHeight: 28, iconSize: 32 },
  md: { wordmarkWidth: 257, wordmarkHeight: 36, iconSize: 40 },
  lg: { wordmarkWidth: 343, wordmarkHeight: 48, iconSize: 48 },
};

export function Logo({ size = 'md' }: LogoProps) {
  const { wordmarkWidth, wordmarkHeight, iconSize } = SIZES[size];

  return (
    <span className="logo-lockup">
      <Image
        src="/logo-wordmark.png"
        alt="StackDrift"
        width={wordmarkWidth}
        height={wordmarkHeight}
        priority
        className="logo-wordmark"
      />
      <Image
        src="/logo-icon.png"
        alt="StackDrift"
        width={iconSize}
        height={iconSize}
        priority
        className="logo-icon"
      />
    </span>
  );
}
