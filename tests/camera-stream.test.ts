import { afterEach, describe, expect, it, vi } from "vitest";
import { lookupCameraStream } from "@/lib/camera-stream";

const ALIAS = "61af904e45b24";
const PLAYLIST = "https://s81.ipcamlive.com/streams/51ytqpcmyijrwvljf/stream.m3u8";

function state(address: string, streamid: string) {
  return Response.json({ details: { address, streamid } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("lookupCameraStream", () => {
  it("asks a group host and builds the playlist from the alias", async () => {
    const fetchMock = vi.fn(async () => state("http://s81.ipcamlive.com/", "51ytqpcmyijrwvljf"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(lookupCameraStream(ALIAS)).resolves.toBe(PLAYLIST);

    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls).toEqual([
      `https://g3.ipcamlive.com/player/getcamerastreamstate.php?alias=${ALIAS}&getstreaminfo=1`,
    ]);
    expect(urls.every((url) => new URL(url).hostname !== "ipcamlive.com")).toBe(true);
  });

  it("skips a group host that fails and uses the next one", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const host = new URL(String(input)).hostname;
      if (host === "g3.ipcamlive.com") return new Response("", { status: 500 });
      if (host === "g2.ipcamlive.com") return state("http://s81.ipcamlive.com/", "51ytqpcmyijrwvljf");
      throw new Error(`unexpected ${host}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(lookupCameraStream(ALIAS)).resolves.toBe(PLAYLIST);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns null when every group host fails or the stream id is not a token", async () => {
    const fetchMock = vi.fn(async () => state("http://s81.ipcamlive.com/", "../etc"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(lookupCameraStream(ALIAS)).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
