import { useEffect } from "react";

/**
 * usePolling — call a function every N milliseconds.
 * Useful for auto-refreshing dashboards.
 */
export function usePolling(fn, intervalMs = 30000, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(fn, intervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, enabled]);
}