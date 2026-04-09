import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { HistoryEntry } from "../../shared/types";
import { db } from "../../shared/db";

type HistoryStats = {
  totalChars: number;
  streak: number;
  weeklyChars: number;
};

type UseHistoryResult = {
  history: HistoryEntry[];
  stats: HistoryStats;
};

function dayKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function useHistory(): UseHistoryResult {
  const history =
    useLiveQuery(async () => db.history.orderBy("visitedAt").reverse().toArray(), [], []) ?? [];

  const stats = useMemo<HistoryStats>(() => {
    const totalChars = history.reduce((sum, h) => sum + h.charsRead, 0);
    const weekAgo = Date.now() - 7 * 86400000;
    const weeklyChars = history
      .filter((h) => h.visitedAt >= weekAgo)
      .reduce((sum, h) => sum + h.charsRead, 0);

    const daySet = new Set(history.map((h) => dayKey(h.visitedAt)));
    let streak = 0;
    const cursor = new Date();
    for (;;) {
      const key = dayKey(cursor.getTime());
      if (!daySet.has(key)) break;
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return { totalChars, streak, weeklyChars };
  }, [history]);

  return { history, stats };
}

