import { describe, expect, it } from "vitest";
import { campaignName, campaignPath, campaignQuery, isCampaignSlug, slugFromName } from "@/lib/campaign";

describe("isCampaignSlug", () => {
  it("accepts a short code", () => {
    expect(isCampaignSlug("instagram-october")).toBe(true);
    expect(isCampaignSlug("ab")).toBe(true);
  });

  it("rejects anything that is not a code", () => {
    expect(isCampaignSlug("a")).toBe(false);
    expect(isCampaignSlug("Instagram")).toBe(false);
    expect(isCampaignSlug("-fall")).toBe(false);
    expect(isCampaignSlug("fall-")).toBe(false);
    expect(isCampaignSlug("fall--ads")).toBe(false);
    expect(isCampaignSlug(`${"a".repeat(41)}`)).toBe(false);
    expect(isCampaignSlug("../admin")).toBe(false);
    expect(isCampaignSlug(null)).toBe(false);
  });
});

describe("slugFromName", () => {
  it("builds a code from the name", () => {
    expect(slugFromName("Instagram October")).toBe("instagram-october");
    expect(slugFromName("  Fall 2026! ")).toBe("fall-2026");
    expect(slugFromName("Niño")).toBe("nino");
  });

  it("rejects a name that would not make a code", () => {
    expect(slugFromName("!")).toBeNull();
    expect(slugFromName("a")).toBeNull();
    expect(slugFromName("   ")).toBeNull();
  });
});

describe("campaignName", () => {
  it("keeps the words and drops the extra space", () => {
    expect(campaignName("  Instagram   October ")).toBe("Instagram October");
  });

  it("rejects a blank, a symbol, and a name past 60 characters", () => {
    expect(campaignName("   ")).toBeNull();
    expect(campaignName("!!!")).toBeNull();
    expect(campaignName("a".repeat(61))).toBeNull();
    expect(campaignName(null)).toBeNull();
  });
});

describe("campaignQuery", () => {
  it("returns the code or nothing", () => {
    expect(campaignQuery("instagram-october")).toBe("instagram-october");
    expect(campaignQuery("Nope")).toBeNull();
    expect(campaignQuery(null)).toBeNull();
  });
});

describe("campaignPath", () => {
  it("points at the home page with the code", () => {
    expect(campaignPath("instagram-october")).toBe("/?c=instagram-october");
  });
});
