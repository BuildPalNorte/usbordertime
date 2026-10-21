import { describe, expect, it } from "vitest";
import {
  accountLocationUrl,
  buildInsights,
  DEFAULT_ACCOUNT_FILTER,
  formatAccountLocation,
  listedAccounts,
  type Connected,
  type RawFacts,
} from "@/lib/admin-insights";

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
    location: null,
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
          profile("a", { referral: "friend", location: { lat: 25.9, lng: -97.5 } }),
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
    expect(a.location).toEqual({ lat: 25.9, lng: -97.5 });
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
    expect(insights.growth).toHaveLength(90);
    expect(insights.growth.at(-1)?.day).toBe("2026-10-12");
    expect(new Set(insights.growth.map((entry) => entry.day)).size).toBe(90);
  });
});

function account(id: string, extra: Partial<Connected> = {}): Connected {
  return {
    id,
    name: id,
    email: `${id}@example.com`,
    joinedAt: "2026-10-01T00:00:00.000Z",
    lastActive: null,
    source: null,
    sourceState: "unknown",
    invitedBy: null,
    invited: [],
    locale: null,
    location: null,
    saved: 0,
    pins: 0,
    alerts: 0,
    alarms: 0,
    alarmsOn: 0,
    devices: 0,
    questions: 0,
    days: 0,
    streak: { current: 0, longest: 0 },
    steps: { answered: false, returned: false, saved: false, watching: false, notified: false, asked: false },
    depth: 0,
    ...extra,
  };
}

describe("listedAccounts", () => {
  const now = Date.parse("2026-10-13T00:00:00.000Z");
  const weekEdge = new Date(now - 7 * 86_400_000).toISOString();
  const rows = [
    account("ann", {
      name: "Ann",
      email: "ann@example.com",
      lastActive: weekEdge,
      source: "instagram",
      sourceState: "answered",
      locale: "es",
      invited: [{ id: "bo", name: "Bo", activated: false }],
      steps: { answered: true, returned: true, saved: true, watching: false, notified: false, asked: true },
      depth: 4,
    }),
    account("bo", {
      name: "Bo",
      lastActive: "2026-10-01T00:00:00.000Z",
      sourceState: "choosing",
      locale: "en",
      invitedBy: { id: "ann", name: "Ann" },
      depth: 0,
    }),
    account("cy", { name: "Cy", locale: null, depth: 1, steps: { answered: false, returned: false, saved: true, watching: false, notified: false, asked: false } }),
  ];

  it("keeps everyone when nothing is chosen", () => {
    expect(listedAccounts(rows, "", DEFAULT_ACCOUNT_FILTER, now).map((row) => row.id)).toEqual(["ann", "bo", "cy"]);
  });

  it("matches a name or email, ignoring case and surrounding spaces", () => {
    expect(listedAccounts(rows, "  ANN@ ", DEFAULT_ACCOUNT_FILTER, now).map((row) => row.id)).toEqual(["ann"]);
  });

  it("combines activity, source, language, invites, and a reached step", () => {
    const match = listedAccounts(
      rows,
      "",
      { activity: "week", source: "instagram", locale: "es", invite: "brought", step: "asked" },
      now,
    );
    expect(match.map((row) => row.id)).toEqual(["ann"]);
  });

  it("treats the week boundary as included and idle as no steps reached", () => {
    expect(listedAccounts(rows, "", { ...DEFAULT_ACCOUNT_FILTER, activity: "week" }, now).map((row) => row.id)).toEqual(["ann"]);
    expect(listedAccounts(rows, "", { ...DEFAULT_ACCOUNT_FILTER, activity: "idle" }, now).map((row) => row.id)).toEqual(["bo"]);
  });

  it("separates people still choosing, people who were invited, and a language that was never chosen", () => {
    expect(listedAccounts(rows, "", { ...DEFAULT_ACCOUNT_FILTER, source: "choosing" }, now).map((row) => row.id)).toEqual(["bo"]);
    expect(listedAccounts(rows, "", { ...DEFAULT_ACCOUNT_FILTER, invite: "invited" }, now).map((row) => row.id)).toEqual(["bo"]);
    expect(listedAccounts(rows, "", { ...DEFAULT_ACCOUNT_FILTER, locale: "unset" }, now).map((row) => row.id)).toEqual(["cy"]);
  });
});

describe("formatAccountLocation", () => {
  it("writes hemispheres and keeps four decimal places", () => {
    expect(formatAccountLocation({ lat: 25.9, lng: -97.5 })).toBe("25.9000° N, 97.5000° W");
    expect(formatAccountLocation({ lat: -33.8688, lng: 151.2093 })).toBe("33.8688° S, 151.2093° E");
  });

  it("links the stored point without rounding it away", () => {
    expect(accountLocationUrl({ lat: 25.90123, lng: -97.49741 })).toBe(
      "https://www.google.com/maps?q=25.90123,-97.49741",
    );
  });
});
