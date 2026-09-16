import { useEffect, useState } from "react";

// Renders one layout or the other instead of painting both and hiding one
// with CSS: My Tickets is a table at md and above and cards below (ui-spec
// 12.3), and rendering both would double every row for assistive technology
// and for the tests. Where matchMedia is unavailable (jsdom) the wide layout
// is assumed.

export function useMediaQuery(query: string): boolean {
  const supported = typeof window !== "undefined" && typeof window.matchMedia === "function";
  const [matches, setMatches] = useState(() => (supported ? window.matchMedia(query).matches : true));

  useEffect(() => {
    if (!supported) return;
    const list = window.matchMedia(query);
    const onChange = () => setMatches(list.matches);
    list.addEventListener("change", onChange);
    setMatches(list.matches);
    return () => list.removeEventListener("change", onChange);
  }, [query, supported]);

  return matches;
}

// Bootstrap's md breakpoint - the LS 8.7 tablet/mobile boundary (ui-spec 1).
export const MD_AND_UP = "(min-width: 768px)";
