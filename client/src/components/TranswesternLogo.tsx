import { BRAND, BRAND_FONTS } from '@/lib/brand';

// Stylized two-tone "T" mark (wide top bar + centered stem) next to the
// "Transwestern" serif wordmark. Scales cleanly 20px–120px via viewBox.
// - full color: left brand-blue, right lighter blue
// - mono: single navy (or white on dark) for monochrome contexts
export function TranswesternLogo({
  size = 36,
  mono = false,
  wordmark = false,
  onDark = false,
  className,
}: {
  size?: number;
  mono?: boolean;
  wordmark?: boolean;
  onDark?: boolean;
  className?: string;
}) {
  const left = mono ? (onDark ? BRAND.white : BRAND.navy) : BRAND.blueDeep;
  const right = mono ? (onDark ? BRAND.white : BRAND.navy) : BRAND.skyLight;
  const wordColor = onDark ? BRAND.white : BRAND.navy;

  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="Transwestern"
      style={{ display: 'block' }}
    >
      <rect x="4" y="8" width="20" height="9" fill={left} />
      <rect x="24" y="8" width="20" height="9" fill={right} />
      <rect x="19" y="17" width="5" height="23" fill={left} />
      <rect x="24" y="17" width="5" height="23" fill={right} />
    </svg>
  );

  if (!wordmark) {
    return <span className={className} style={{ display: 'inline-flex' }}>{mark}</span>;
  }

  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      {mark}
      <span
        style={{
          fontFamily: BRAND_FONTS.serif,
          fontWeight: 700,
          fontSize: Math.round(size * 0.62),
          color: wordColor,
          letterSpacing: '0.01em',
        }}
      >
        Transwestern
      </span>
    </span>
  );
}

export default TranswesternLogo;
