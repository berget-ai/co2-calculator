import { useEffect, useState } from "react";

/**
 * Minimal media-query hook for responsive inline styles.
 * Returns true when the viewport matches the given CSS media query.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** True on narrow (mobile) viewports. */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 640px)");
}
