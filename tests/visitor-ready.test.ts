import { describe, expect, it } from "vitest";
import { holdForVisitor, whenVisitorNoted } from "@/lib/visitor-ready";

describe("visitor ready", () => {
  it("waits for the guest note, and carries on if that note fails", async () => {
    let release: () => void = () => {};
    const note = new Promise<void>((resolve) => {
      release = resolve;
    });
    holdForVisitor(note);

    let waited = false;
    const done = whenVisitorNoted().then(() => {
      waited = true;
    });
    await Promise.resolve();
    expect(waited).toBe(false);
    release();
    await done;
    expect(waited).toBe(true);

    holdForVisitor(Promise.reject(new Error("offline")));
    await expect(whenVisitorNoted()).resolves.toBeUndefined();
  });
});
