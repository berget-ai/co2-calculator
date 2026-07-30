export const C = {
  // Backgrounds
  night: "var(--berget-background, #0A0A0A)",
  slate: "var(--berget-card, #121212)",

  // Text
  peak: "var(--berget-foreground, #FFFFFF)",
  cloud: "var(--berget-foreground-alt, rgba(255,255,255,0.72))",
  muted: "var(--berget-muted-foreground, rgba(255,255,255,0.65))",

  // Primary = Stone (cream/white) - main action color
  stone: "var(--berget-primary, #E5DDD5)",
  stoneHover: "var(--berget-primary-hover, #F0EAE4)",

  // Secondary = Moss - subtle accent
  moss: "var(--berget-secondary, #60A580)",
  mossDim: "var(--berget-secondary-hover, rgba(96,165,128,0.15))",

  // Accent = Sage - even more subtle
  sage: "var(--berget-accent, #8EB29F)",

  // Cards and surfaces
  card: "var(--berget-card, #121212)",
  ghost: "var(--berget-ghost, rgba(26,26,26,0.4))",
  ghostHover: "var(--berget-ghost-hover, rgba(26,26,26,0.6))",

  // Border system - Stone with subtle opacity
  border: "var(--berget-border, rgba(229,221,213,0.05))",
  borderHover: "var(--berget-border-hover, rgba(229,221,213,0.10))",
  borderStrong: "var(--berget-border-strong, rgba(229,221,213,0.08))",
  borderMoss: "var(--berget-border-moss, rgba(96,165,128,0.20))",

  // Status
  danger: "var(--berget-destructive-foreground, #D1392E)",
  warning: "var(--berget-warning, #CFFF8B)",
  info: "var(--berget-info, #3975D6)",

  // Effects
  glow: "var(--berget-glow, rgba(229,221,213,0.1))",
};

export const COMPONENT_COLORS = {
  gpu: { bg: "hsl(45 15% 88%)", label: "GPU Inference" },
  server: { bg: "hsl(0 0% 100%)", label: "Server & DC" },
  overhead: { bg: "hsl(0 0% 65%)", label: "Cooling" },
  embodied: { bg: "hsl(0 0% 40%)", label: "Hardware" },
  training: { bg: "hsl(151 29% 49%)", label: "Training" },
};

export function formatCO2(grams: number): string {
  if (grams < 0.001) return `${(grams * 1000000).toFixed(1)} µg`;
  if (grams < 1) return `${(grams * 1000).toFixed(1)} mg`;
  if (grams < 1000) return `${grams.toFixed(1)} g`;
  if (grams < 1000000) return `${(grams / 1000).toFixed(1)} kg`;
  if (grams < 1000000000) return `${(grams / 1000000).toFixed(1)} t`;
  return `${(grams / 1000000000).toFixed(1)} kt`;
}

export function SourceCitation({ source, url }: { source: string; url?: string }) {
  return (
    <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", marginTop: "0.25rem", fontStyle: "italic" }}>
      Source: {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.4)", textDecoration: "underline" }}>
          {source}
        </a>
      ) : source}
    </div>
  );
}

export function Card({ children, selected, onClick }: { children: React.ReactNode; selected?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "1.5rem",
        borderRadius: 12,
        border: `1px solid ${selected ? "rgba(229, 221, 213, 0.15)" : "rgba(229, 221, 213, 0.05)"}`,
        background: selected ? "rgba(229, 221, 213, 0.08)" : "rgba(26, 26, 26, 0.4)",
        cursor: onClick ? "pointer" : "default",
        textAlign: "left",
        color: C.cloud,
        width: "100%",
        transition: "all 0.2s ease",
      }}
    >
      {children}
    </button>
  );
}

// ─── Article typography ───
export const prose = {
  p: {
    fontSize: "1rem",
    lineHeight: 1.75,
    color: C.cloud,
    marginBottom: "1.25rem",
    maxWidth: "68ch",
  } as React.CSSProperties,
  h2: {
    fontSize: "1.5rem",
    fontWeight: 700,
    color: C.peak,
    marginBottom: "0.75rem",
    marginTop: 0,
  } as React.CSSProperties,
  kicker: {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: C.moss,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    marginBottom: "0.5rem",
  } as React.CSSProperties,
};
