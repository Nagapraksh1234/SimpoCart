import { useCallback, useEffect, useState } from "react";
import { getBoard } from "../api/workflow";
import type { BoardResponse } from "../types/workflow";

/** Loads the board, refreshes every 30s and exposes reload() for after actions. */
export function useWorkflowBoard(pollMs = 30000) {
  const [data, setData] = useState<BoardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setData(await getBoard());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the board");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    const t = setInterval(reload, pollMs);
    return () => clearInterval(t);
  }, [reload, pollMs]);

  return { data, loading, error, reload };
}