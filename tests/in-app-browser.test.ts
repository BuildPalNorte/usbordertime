import { describe, expect, it } from "vitest";
import { browserIntentUrl, detectInAppBrowser } from "@/lib/in-app-browser";

const FB_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/470.0.0.40.108;FBBV/1;FBDV/iPhone15,2]";
const FB_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP1A) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/125.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/470.0.0.40.108;]";
const INSTAGRAM_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0.0.20.100";
const SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const CHROME_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Mobile Safari/537.36";

describe("detectInAppBrowser", () => {
  it("finds Facebook on iPhone and Android", () => {
    expect(detectInAppBrowser(FB_IOS)).toEqual({ app: "facebook", platform: "ios" });
    expect(detectInAppBrowser(FB_ANDROID)).toEqual({ app: "facebook", platform: "android" });
  });

  it("finds Instagram", () => {
    expect(detectInAppBrowser(INSTAGRAM_IOS)).toEqual({ app: "instagram", platform: "ios" });
  });

  it("leaves real browsers alone", () => {
    expect(detectInAppBrowser(SAFARI)).toBeNull();
    expect(detectInAppBrowser(CHROME_ANDROID)).toBeNull();
    expect(detectInAppBrowser("")).toBeNull();
  });
});

describe("browserIntentUrl", () => {
  it("keeps the path and query, so the sharer and lane survive", () => {
    expect(browserIntentUrl("https://usbordertime.com/230401?lane=car&from=abc#top")).toBe(
      "intent://usbordertime.com/230401?lane=car&from=abc#Intent;scheme=https;end",
    );
  });

  it("refuses anything that is not a web address", () => {
    expect(browserIntentUrl("javascript:alert(1)")).toBeNull();
    expect(browserIntentUrl("not a url")).toBeNull();
  });
});
