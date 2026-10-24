import { useCallback, useEffect, useRef, useState } from "react";
import { fetchSource, SOURCES } from "./rss";
import type { NewsItem } from "./rss";

export interface SourceState {
  status: "loading" | "ok" | "error";
  count: number;
}

export interface NewsData {
  items: NewsItem[];
  sourceStates: Record<string, SourceState>;
  lastUpdated: Date | null;
  refreshing: boolean;
  refresh: () => void;
}

export function usePakistanNews(): NewsData {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [sourceStates, setSourceStates] = useState<Record<string, SourceState>>(() =>
    Object.fromEntries(SOURCES.map((s) => [s.id, { status: "loading" as const, count: 0 }]))
  );
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const cacheRef = useRef<Record<string, NewsItem[]>>({});
  const busyRef = useRef(false);

  const refresh = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setRefreshing(true);
    setSourceStates((prev) =>
      Object.fromEntries(
        SOURCES.map((s) => [s.id, { status: "loading" as const, count: prev[s.id]?.count ?? 0 }])
      )
    );

    const results = await Promise.allSettled(SOURCES.map((s) => fetchSource(s)));

    const states: Record<string, SourceState> = {};
    SOURCES.forEach((s, i) => {
      const r = results[i];
      if (r.status === "fulfilled") {
        cacheRef.current[s.id] = r.value;
        states[s.id] = { status: "ok", count: r.value.length };
      } else {
        const cached = cacheRef.current[s.id];
        states[s.id] = {
          status: cached && cached.length ? "ok" : "error",
          count: cached?.length ?? 0,
        };
      }
    });

    const seen = new Set<string>();
    const merged = SOURCES.flatMap((s) => cacheRef.current[s.id] ?? [])
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .filter((it) => {
        const key = it.title.toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, "");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 90);

    setItems(merged);
    setSourceStates(states);
    setLastUpdated(new Date());
    setRefreshing(false);
    busyRef.current = false;
  }, []);

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 5 * 60_000);
    return () => clearInterval(iv);
  }, [refresh]);

  return { items, sourceStates, lastUpdated, refreshing, refresh };
}
