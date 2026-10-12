import { describe, expect, it } from "vitest";
import { parseAlert, parseDeviceKey, parsePushDevice } from "@/lib/alert";

const keys = { p256dh: "key", auth: "auth" };

describe("parsePushDevice", () => {
  it("accepts the real push services over https", () => {
    for (const host of ["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com"]) {
      expect(parsePushDevice({ endpoint: `https://${host}/send/abc`, keys })).not.toBeNull();
    }
  });

  it("rejects other hosts, look-alikes, and plain http", () => {
    for (const endpoint of [
      "https://evil.example.com/send",
      "https://fcm.googleapis.com.evil.com/send",
      "http://fcm.googleapis.com/send",
      "not a url",
    ]) {
      expect(parsePushDevice({ endpoint, keys })).toBeNull();
    }
  });

  it("rejects missing or oversized keys", () => {
    const endpoint = "https://fcm.googleapis.com/send/abc";
    expect(parsePushDevice({ endpoint })).toBeNull();
    expect(parsePushDevice({ endpoint, keys: { p256dh: "x".repeat(201), auth: "a" } })).toBeNull();
  });
});

describe("parseAlert", () => {
  it("rejects a bad threshold, lane, or crossing", () => {
    expect(parseAlert({ portNumber: "230501", mode: "passenger", threshold: 4 })).toBeNull();
    expect(parseAlert({ portNumber: "230501", mode: "nope", threshold: 20 })).toBeNull();
    expect(parseAlert({ portNumber: "../etc", mode: "passenger", threshold: 20 })).toBeNull();
    expect(parseAlert(null)).toBeNull();
  });
});

describe("parseDeviceKey", () => {
  it("only accepts a uuid", () => {
    expect(parseDeviceKey("3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b")).not.toBeNull();
    expect(parseDeviceKey("hello")).toBeNull();
  });
});
