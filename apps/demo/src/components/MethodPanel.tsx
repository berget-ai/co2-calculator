import { C } from "./shared";

export interface MethodSource {
  label: string;
  url?: string;
}

interface Props {
  /** Key assumptions made in this part of the calculation */
  assumptions: string[];
  /** How we reasoned / the approach taken */
  reasoning?: string;
  /** Research and data sources this section leans on */
  sources: MethodSource[];
}

/**
 * A compact, expandable "Method & sources" panel embedded per guide section:
 * where the data comes from, how we reasoned, which assumptions we make,
 * and which research we lean on.
 */
export function MethodPanel({ assumptions, reasoning, sources }: Props) {
  return (
    <details
      style={{
        marginTop: "1.5rem",
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        background: "rgba(255,255,255,0.015)",
        overflow: "hidden",
      }}
    >
      <summary
        style={{
          padding: "0.65rem 1rem",
          cursor: "pointer",
          fontSize: "0.75rem",
          fontWeight: 600,
          color: C.muted,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          listStyle: "none",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          userSelect: "none",
        }}
      >
        <span style={{ color: C.moss, fontSize: "0.9rem" }}>▸</span>
        Method &amp; sources
      </summary>

      <div
        style={{
          padding: "0 1rem 1rem",
          borderTop: `1px solid ${C.border}`,
          fontSize: "0.85rem",
          lineHeight: 1.6,
        }}
      >
        {/* Assumptions */}
        <div style={{ marginTop: "1rem" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 600, color: C.peak, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.4rem" }}>
            Assumptions
          </div>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", color: C.muted }}>
            {assumptions.map((a, i) => (
              <li key={i} style={{ marginBottom: "0.25rem" }}>{a}</li>
            ))}
          </ul>
        </div>

        {/* Reasoning */}
        {reasoning && (
          <div style={{ marginTop: "1rem" }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 600, color: C.peak, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.4rem" }}>
              How we reasoned
            </div>
            <p style={{ margin: 0, color: C.muted }}>{reasoning}</p>
          </div>
        )}

        {/* Sources */}
        <div style={{ marginTop: "1rem" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 600, color: C.peak, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.4rem" }}>
            Research &amp; data
          </div>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", color: C.muted }}>
            {sources.map((s, i) => (
              <li key={i} style={{ marginBottom: "0.25rem" }}>
                {s.url ? (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: C.sage, textDecoration: "underline", textUnderlineOffset: 2 }}
                  >
                    {s.label}
                  </a>
                ) : (
                  s.label
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  );
}
