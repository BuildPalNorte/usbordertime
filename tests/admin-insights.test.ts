import { describe, expect, it } from "vitest";
import { buildInsights, type RawFacts } from "@/lib/admin-insights";

const NOW = new Date("2026-10-12T18:00:00Z");

function profile(id: string, extra: Partial<RawFacts["profiles"][number]> = {}) {
  return {
    id,
    name: id,
    email: `${id}@example.com`,
    createdAt: "2026-10-11T18:00:00.000Z",
    updatedAt: "2026-10-11T18:00:00.000Z",
    referral: null,
    referralPending: false,
    referredBy: null,
    ...extra,
  };
}

const EMPTY: RawFacts = {
  profiles: [],
  streaks: [],
  preferences: [],
  alerts: [],
  schedules: [],
  devices: [],
  usage: [],
};

describe("buildInsights", () => {
  it("joins every table onto the account and counts the funnel", () => {
    const insights = buildInsights(
      {
        ...EMPTY,
        profiles: [
          profile("a", { referral: "friend" }),
          profile("b", { referral: "whatsapp", referredBy: "a" }),
          profile("c", { referralPending: true }),
        ],
        streaks: [{ userId: "a", current: 3, longest: 3, totalDays: 3, lastDay: "2026-10-12" }],
        preferences: [{ userId: "a", locale: "es", wallet: [{ portNumber: "230501" }], pins: 1 }],
        alerts: [{ userId: "b", portNumber: "230501" }],
        schedules: [{ userId: "a", ports: ["230501", "230502"], enabled: true }],
        devices: [{ userId: "a", count: 2 }],
        usage: [{ userId: "a", total: 4, lastActive: "2026-10-12T10:00:00.000Z", byKind: { ask: 1, visit: 3 } }],
      },
      NOW,
    );

    const a = insights.accounts.find((row) => row.id === "a")!;
    expect(a.depth).toBe(6);
    expect(a.invited).toEqual([{ id: "b", name: "b", activated: true }]);

    const b = insights.accounts.find((row) => row.id === "b")!;
    expect(b.invitedBy).toEqual({ id: "a", name: "a" });
    expect(b.steps.watching).toBe(true);
    expect(b.steps.returned).toBe(false);

    expect(insights.funnel.map((step) => step.count)).toEqual([3, 2, 1, 1, 2, 1, 1]);
    expect(insights.idle).toBe(1);
    expect(insights.recent).toBe(1);
    expect(insights.inviters).toHaveLength(1);
    expect(insights.sources.find((row) => row.key === "choosing")?.accounts).toBe(1);
  });

  it("counts people per crossing once however they touch it", () => {
    const insights = buildInsights(
      {
        ...EMPTY,
        profiles: [profile("a")],
        preferences: [{ userId: "a", locale: null, wallet: [{ portNumber: "1" }, { portNumber: "1" }], pins: 0 }],
        alerts: [{ userId: "a", portNumber: "1" }],
        schedules: [{ userId: "a", ports: ["1"], enabled: false }],
      },
      NOW,
    );
    expect(insights.crossings).toEqual([{ portNumber: "1", saved: 1, alerts: 1, alarms: 1, people: 1 }]);
  });

  it("handles an empty database", () => {
    const insights = buildInsights(EMPTY, NOW);
    expect(insights.funnel[0]).toMatchObject({ count: 0, share: 0 });
    expect(insights.growth).toHaveLength(14);
  });
});
