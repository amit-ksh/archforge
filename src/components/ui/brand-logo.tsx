import type { CSSProperties, HTMLAttributes } from "react";

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
      {showWordmark ? (
        <span
          style={{
            fontSize: `${calculatedWordmarkSize}px`,
            fontWeight: 750,
            letterSpacing: "-0.025em",
            fontFamily:
              "var(--font-sans, system-ui, -apple-system, BlinkMacSystemFont, sans-serif)",
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
