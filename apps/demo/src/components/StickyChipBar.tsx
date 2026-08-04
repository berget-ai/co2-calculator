import { useEffect, useState } from "react";
import { C } from "./shared";

/**
 * Sticky clones of the §1 model chip row and the §2 region chip row. Each row
 * watches a sentinel placed just after the original; once that sentinel has
 * scrolled above the top of the viewport, an identical row pins itself to the
 * top so the setting stays reachable while you read further down. Clicking a
 * chip in a pinned row drives the same state as the original.
 *
 * Rows are stacked in a single fixed container (StickyBars) so they never
 * overlap: the model row sits on top, the region row directly beneath it.
 * Each row returns null until pinned, so the container only takes up as much
 * vertical space as there are pinned rows.
 *
 * A row only appears once BOTH the model and region rows have been scrolled
 * past? No — each row appears independently as its own sentinel is passed.
 *
 * Two row variants:
 *  - "wrap":   chips wrap onto multiple lines (the model list)
 *  - "scroll": chips compress into one horizontally scrollable row (the long
 *              region list, which would otherwise be tall)
 */

export interface Chip {
  key: string;
  label: string;
  /** Optional trailing detail, e.g. grid intensity number */
  detail?: string;
  /** Optional coloured status dot (region intensity) */
  dot?: string;
}

interface RowProps {
  /** id of the sentinel element placed after the original row */
  sentinelId: string;
  chips: Chip[];
  selectedKey: string;
  onSelect: (key: string) => void;
  variant: "wrap" | "scroll";
  ariaLabel: string;
}

function StickyRow({ sentinelId, chips, selectedKey, onSelect, variant, ariaLabel }: RowProps) {
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    const check = () => {
      const sentinel = document.getElementById(sentinelId);
      if (!sentinel) return;
      // Pin once the sentinel has scrolled above the top of the viewport.
      setPinned(sentinel.getBoundingClientRect().top < 0);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [sentinelId]);

  if (!pinned) return null;

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: "0.45rem 0.7rem",
    borderRadius: 6,
    border: `1px solid ${active ? C.moss : C.border}`,
    background: active ? C.mossDim : "transparent",
    color: active ? C.moss : C.cloud,
    cursor: "pointer",
    fontSize: "0.8rem",
    whiteSpace: "nowrap",
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
  });

  return (
    <div
      role="region"
      aria-label={ariaLabel}
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: "0.5rem 1rem",
        display: "flex",
        gap: "0.4rem",
        flexWrap: variant === "wrap" ? "wrap" : "nowrap",
        overflowX: variant === "scroll" ? "auto" : "visible",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
        background: "rgba(18,18,18,0.94)",
        borderBottom: `1px solid ${C.borderMoss}`,
      }}
    >
      {chips.map((chip) => (
        <button key={chip.key} onClick={() => onSelect(chip.key)} style={chipStyle(chip.key === selectedKey)}>
          {chip.dot && (
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: chip.dot,
                display: "inline-block",
                flexShrink: 0,
              }}
            />
          )}
          <span>{chip.label}</span>
          {chip.detail && <span style={{ color: C.muted, fontSize: "0.65rem" }}>{chip.detail}</span>}
        </button>
      ))}
    </div>
  );
}

interface BarsProps {
  modelRow: Omit<RowProps, "sentinelId" | "variant" | "ariaLabel">;
  regionRow: Omit<RowProps, "sentinelId" | "variant" | "ariaLabel">;
}

/**
 * The fixed top container holding whichever sticky rows are currently pinned,
 * stacked vertically so they don't overlap. Renders nothing until at least one
 * row is pinned (each row returns null until then).
 */
export function StickyBars({ modelRow, regionRow }: BarsProps) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        // Rows render null until pinned, and each pinned row carries its own
        // background/border, so the container itself needs no chrome and takes
        // up no space when nothing is pinned.
      }}
    >
      <StickyRow {...modelRow} sentinelId="model-row-sentinel" variant="wrap" ariaLabel="Models" />
      <StickyRow {...regionRow} sentinelId="region-row-sentinel" variant="scroll" ariaLabel="Regions" />
    </div>
  );
}
