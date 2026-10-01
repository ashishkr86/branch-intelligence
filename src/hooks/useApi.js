import { useState, useEffect, useCallback } from "react";

/**
 * useApi — fetch data with loading + error handling.
 * @param {Function} fetcher — an async function from src/lib/api.js
 * @param {Array} deps — dependencies that trigger a refetch
 */
export function useApi(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (e) {
      console.error("API error:", e);
      setError(e.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refetch: load };
}