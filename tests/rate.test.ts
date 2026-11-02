import { describe, expect, it } from "vitest";
import {
  amountField,
  cleanAmount,
  convert,
  freshAmount,
  isRate,
  parseAmount,
  parseRate,
} from "@/lib/rate";

describe("parseRate", () => {
  it("reads a daily reference the way the feed sends it on a weekend", () => {
    const rate = parseRate({
      result: "success",
      base: "USD",
      source: "ecb_daily",
      sources: { MXN: "ecb_daily" },
      market_session: "weekend",
      timestamp: "2026-11-01T08:08:08Z",
      data_updated_at: "2026-10-30T00:00:00Z",
      effective_at: { MXN: "2026-10-30T00:00:00Z" },
      rates: { MXN: 18.9077 },
    });
    expect(rate).toEqual({ mxn: 18.9077, asOf: "2026-10-30T00:00:00Z", live: false });
  });

  it("marks a live quote and uses its own observation time", () => {
    const rate = parseRate({
      sources: { MXN: "live" },
      timestamp: "2026-11-02T15:00:00Z",
      data_updated_at: "2026-11-02T14:45:00Z",
      effective_at: { MXN: "2026-11-02T14:44:10Z" },
      rates: { MXN: 18.62 },
    });
    expect(rate).toEqual({ mxn: 18.62, asOf: "2026-11-02T14:44:10Z", live: true });
  });

  it("falls back to the response time when no observation time is given", () => {
    expect(parseRate({ timestamp: "2026-11-02T15:00:00Z", rates: { MXN: 18 } })?.asOf).toBe(
      "2026-11-02T15:00:00Z",
    );
  });

  it("rejects an answer that is not a usable rate", () => {
    expect(parseRate(null)).toBeNull();
    expect(parseRate({})).toBeNull();
    expect(parseRate({ rates: {} })).toBeNull();
    expect(parseRate({ rates: { MXN: "18.9" } })).toBeNull();
    expect(parseRate({ rates: { MXN: 0 } })).toBeNull();
    expect(parseRate({ rates: { MXN: Number.NaN } })).toBeNull();
    expect(parseRate({ rates: { MXN: 5000 } })).toBeNull();
  });
});

describe("isRate", () => {
  it("accepts what parseRate makes and nothing looser", () => {
    expect(isRate({ mxn: 18.9, asOf: "2026-10-30T00:00:00Z", live: false })).toBe(true);
    expect(isRate({ mxn: 18.9, asOf: "x" })).toBe(false);
    expect(isRate({ mxn: -1, asOf: "x", live: true })).toBe(false);
    expect(isRate("18.9")).toBe(false);
  });
});

describe("cleanAmount", () => {
  it("keeps digits and one dot, with two decimals", () => {
    expect(cleanAmount("1,250.5")).toBe("1250.5");
    expect(cleanAmount("12.3.4")).toBe("12.34");
    expect(cleanAmount("9.999")).toBe("9.99");
    expect(cleanAmount("abc")).toBe("");
  });

  it("drops leading zeros but keeps a zero before the point", () => {
    expect(cleanAmount("007")).toBe("7");
    expect(cleanAmount("0")).toBe("0");
    expect(cleanAmount("0.5")).toBe("0.5");
    expect(cleanAmount(".5")).toBe(".5");
  });

  it("stops at nine whole digits", () => {
    expect(cleanAmount("1234567890123")).toBe("123456789");
  });
});

describe("freshAmount", () => {
  it("keeps only what was typed, wherever the caret was", () => {
    expect(freshAmount("100", "1005")).toBe("5");
    expect(freshAmount("100", "5100")).toBe("5");
    expect(freshAmount("100", "1500")).toBe("5");
    expect(freshAmount("100", "10.0")).toBe(".");
  });

  it("leaves a deletion alone", () => {
    expect(freshAmount("100", "10")).toBe("10");
    expect(freshAmount("100", "")).toBe("");
    expect(freshAmount("100", "100")).toBe("100");
  });
});

describe("parseAmount", () => {
  it("is null until a number is typed", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount(".")).toBeNull();
    expect(parseAmount(".5")).toBe(0.5);
    expect(parseAmount("100")).toBe(100);
  });
});

describe("convert", () => {
  it("multiplies dollars by the rate and divides pesos by it", () => {
    expect(convert(100, 18.9077, "USD")).toBeCloseTo(1890.77, 2);
    expect(convert(1890.77, 18.9077, "MXN")).toBeCloseTo(100, 2);
  });
});

describe("amountField", () => {
  it("rounds to cents without grouping or trailing zeros", () => {
    expect(amountField(1890.7700001)).toBe("1890.77");
    expect(amountField(100)).toBe("100");
    expect(amountField(0.004)).toBe("0");
  });

  it("keeps every digit of a large result", () => {
    expect(amountField(18_907_700_000.126)).toBe("18907700000.13");
  });
});
