import { describe, expect, it } from "vitest";
import { isUserId, withInvite } from "@/lib/invite";

const ID = "abcDEF0123456789abcDEF0123456789";

describe("isUserId", () => {
  it("accepts a Better Auth id", () => {
    expect(isUserId(ID)).toBe(true);
  });

  it("rejects anything that is not an account id", () => {
    expect(isUserId(`${ID}a`)).toBe(false);
    expect(isUserId(ID.slice(0, 31))).toBe(false);
    expect(isUserId(`${ID.slice(0, 31)}-`)).toBe(false);
    expect(isUserId("someone@example.com")).toBe(false);
    expect(isUserId(null)).toBe(false);
  });
});

describe("withInvite", () => {
  it("appends the sharer and keeps the lane and language", () => {
    expect(withInvite("/230401?lane=car&lang=en", ID)).toBe(
      `/230401?lane=car&lang=en&from=${ID}`,
    );
  });

  it("leaves the path alone when the id is not an account id", () => {
    expect(withInvite("/230401?lane=car&lang=en", "nope")).toBe("/230401?lane=car&lang=en");
    expect(withInvite("/230401?lane=car&lang=en", null)).toBe("/230401?lane=car&lang=en");
  });
});
