import type { CSSProperties, HTMLAttributes } from "react";

export interface BrandMarkProps {
  readonly size?: number;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly "aria-label"?: string;
  readonly role?: string;
}

export function BrandMark({
  size = 24,
  className,
  style,
  "aria-label": ariaLabel = "ArchForge mark",
  role = "img",
}: BrandMarkProps) {
  return (
    <svg
      aria-label={ariaLabel}
      className={className}
      height={size}
      role={role}
      style={{
        display: "inline-block",
        flexShrink: 0,
        borderRadius: `${Math.round(size * 0.22)}px`,
        overflow: "hidden",
        ...style,
      }}
      viewBox="0 0 64 64"
      width={size}
    >
      {/* Sleek rounded squircle base */}
      <rect fill="#090d16" height="64" rx="14" width="64" />
      {/* Interlocking geometric tech pulse / architecture wave glyph */}
      <path
        d="M 9 27.5 H 18 V 18.5 H 27 V 9.5 H 37 V 27.5 H 55 V 36.5 H 46 V 45.5 H 37 V 54.5 H 27 V 36.5 H 9 V 27.5 Z"
        fill="#ffffff"
      />
    </svg>
  );
}

export interface BrandLogoProps extends HTMLAttributes<HTMLDivElement> {
  readonly size?: number;
  readonly showWordmark?: boolean;
  readonly wordmarkSize?: number;
  readonly className?: string;
  readonly style?: CSSProperties;
}

export function BrandLogo({
  size = 24,
  showWordmark = true,
  wordmarkSize,
  className,
  style,
  ...props
}: BrandLogoProps) {
  const calculatedWordmarkSize = wordmarkSize ?? Math.round(size * 0.65);

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: `${Math.max(6, Math.round(size * 0.32))}px`,
        textDecoration: "none",
        userSelect: "none",
        ...style,
      }}
      {...props}
    >
      <BrandMark size={size} />
      {showWordmark ? (
        <span
          style={{
            fontSize: `${calculatedWordmarkSize}px`,
            fontWeight: 750,
            letterSpacing: "-0.025em",
            fontFamily: "var(--font-sans, system-ui, -apple-system, BlinkMacSystemFont, sans-serif)",
            color: "var(--text-primary, #0f172a)",
            lineHeight: 1,
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          ArchForge
        </span>
      ) : null}
    </div>
  );
}
