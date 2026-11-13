import { describe, expect, it } from "vitest";

import { createLaunchStatsService, LAUNCH_STATS_KEY, selectTopApps } from "./createLaunchStatsService";

const memoryStorage = (initial: Record<string, string> = {}) => {
  const data = { ...initial };
  return {
    data,
    getItem: (key: string) => (key in data ? data[key] : null),
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
  };
};

describe("launch stats", () => {
  it("counts launches and persists them", () => {
    const storage = memoryStorage();
    const stats = createLaunchStatsService(storage);
    stats.record("netflix");
    stats.record("netflix");
    stats.record("youtube");
    expect(stats.getSnapshot().counts).toEqual({ netflix: 2, youtube: 1 });
    expect(createLaunchStatsService(storage).getSnapshot().counts).toEqual({ netflix: 2, youtube: 1 });
  });

  it("ignores corrupt saved data", () => {
    const stats = createLaunchStatsService(memoryStorage({ [LAUNCH_STATS_KEY]: "{not json" }));
    expect(stats.getSnapshot().counts).toEqual({});
    const invalid = createLaunchStatsService(memoryStorage({ [LAUNCH_STATS_KEY]: '{"a":-1,"b":"x","c":3}' }));
    expect(invalid.getSnapshot().counts).toEqual({ c: 3 });
  });

  it("ranks by launches, then fallback order, and skips uninstalled apps", () => {
    const installed = ["a", "b", "c", "d"];
    expect(selectTopApps({}, installed, ["c", "a"], 3)).toEqual(["c", "a", "b"]);
    expect(selectTopApps({ d: 5, b: 2, gone: 9 }, installed, ["c", "a"], 3)).toEqual(["d", "b", "c"]);
  });
});
