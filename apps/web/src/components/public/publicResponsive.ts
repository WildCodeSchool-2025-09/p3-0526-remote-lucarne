import { useSyncExternalStore } from "react";

type PublicViewport = "desktop" | "tablet" | "mobile";

// Match the dashboard's existing responsive thresholds.
const mobileQuery = "(max-width: 600px)";
const compactQuery = "(max-width: 900px)";

function getViewport(): PublicViewport {
  if (typeof window.matchMedia !== "function") return "desktop";
  if (window.matchMedia(mobileQuery).matches) return "mobile";
  return window.matchMedia(compactQuery).matches ? "tablet" : "desktop";
}

function subscribe(onChange: () => void): () => void {
  if (typeof window.matchMedia !== "function") return () => {};
  const queries = [window.matchMedia(mobileQuery), window.matchMedia(compactQuery)];
  queries.forEach((query) => query.addEventListener("change", onChange));
  return () => queries.forEach((query) => query.removeEventListener("change", onChange));
}

export function usePublicViewport(): PublicViewport {
  return useSyncExternalStore(subscribe, getViewport, () => "desktop");
}
