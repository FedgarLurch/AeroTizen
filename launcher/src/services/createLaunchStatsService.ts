import { createStore, type Store } from "../shared/state/createStore";

// Fork addition: counts app launches made from the launcher so Home can show the most used apps.
export const LAUNCH_STATS_KEY = "aerotizen-fork.launches.v1";
const MAX_TRACKED_APPS = 200;

export interface LaunchStatsSnapshot {
  readonly counts: Readonly<Record<string, number>>;
}

export interface LaunchStats extends Store<LaunchStatsSnapshot> {
  record(id: string): void;
}

type LaunchStorage = Pick<Storage, "getItem" | "setItem">;

const readCounts = (storage: LaunchStorage): Record<string, number> => {
  try {
    const value: unknown = JSON.parse(storage.getItem(LAUNCH_STATS_KEY) || "null");
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, number>>(
      (counts, [id, count]) =>
        typeof count === "number" && Number.isFinite(count) && count > 0
          ? { ...counts, [id]: Math.floor(count) }
          : counts,
      {},
    );
  } catch {
    return {};
  }
};

export const createLaunchStatsService = (storage: LaunchStorage): LaunchStats => {
  const store = createStore<LaunchStatsSnapshot>({ counts: readCounts(storage) });
  return {
    getSnapshot: store.getSnapshot,
    subscribe: store.subscribe,
    record(id) {
      const before = store.getSnapshot().counts;
      const counts = { ...before, [id]: (before[id] || 0) + 1 };
      const trimmed = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_TRACKED_APPS)
        .reduce<Record<string, number>>((result, [key, count]) => ({ ...result, [key]: count }), {});
      store.set({ counts: trimmed });
      try {
        storage.setItem(LAUNCH_STATS_KEY, JSON.stringify(trimmed));
      } catch {
        // Storage can be full or unavailable; the in-memory counts still drive this session.
      }
    },
  };
};

// Most launched installed apps first; ties and unlaunched apps keep the fallback order.
export const selectTopApps = (
  counts: Readonly<Record<string, number>>,
  installed: readonly string[],
  fallback: readonly string[],
  limit: number,
): string[] => {
  const available = new Set(installed);
  const order = [...fallback, ...installed].filter((id, index, all) => available.has(id) && all.indexOf(id) === index);
  const ranked = order
    .map((id, index) => ({ id, index, count: counts[id] || 0 }))
    .sort((a, b) => b.count - a.count || a.index - b.index);
  return ranked.slice(0, limit).map((entry) => entry.id);
};
