import { describe, expect, it } from "vitest";
import { buildFunnel, MOCK_ACTIVITY } from "./api";
import type { RunSummary } from "./types";

describe("buildFunnel", () => {
  const run = (started: string, date: string, scouted: number): RunSummary =>
    ({ id: date || "x", kind: "run", date, started, scouted, shortlisted: 1, skipped: 0, written: 0, writeSkipped: 0 }) as unknown as RunSummary;

  const now = new Date("2026-10-03T12:00:00+02:00");
  const runs = [
    run("2026-10-01T21:00:00+02:00", "2026-10-01", 5),
    run("", "2026-09-25", 2),
    run("2026-08-01T21:00:00+02:00", "2026-08-01", 100),
    run("", "", 50)
  ];

  it("counts only runs from the last 30 days", () => {
    const f = buildFunnel(runs, {}, now);
    expect(f.scouted).toBe(7);
    expect(f.shortlisted).toBe(2);
  });

  it("honours a custom window", () => {
    expect(buildFunnel(runs, {}, now, 90).scouted).toBe(107);
  });

  it("keeps the offline sample populated", () => {
    expect(MOCK_ACTIVITY.funnel.scouted).toBeGreaterThan(0);
  });
});
